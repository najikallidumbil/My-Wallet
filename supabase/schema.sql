-- ==============================================================================
-- PERSONAL WALLET TRACKER - SUPABASE POSTGRESQL DATABASE SCHEMA
-- Includes Row Level Security (RLS) policies, triggers, and storage policies
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('income', 'expense');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE credit_debt_type AS ENUM ('credit', 'debt'); -- credit = money others owe me, debt = money I owe others
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE record_status AS ENUM ('pending', 'partial', 'settled', 'overdue');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('upi', 'cash', 'card', 'bank_transfer', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    currency TEXT DEFAULT 'INR',
    theme_preference TEXT DEFAULT 'system',
    pin_hash TEXT, -- Stored hashed PIN for quick security unlock
    biometric_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for global/system categories
    name TEXT NOT NULL,
    type transaction_type NOT NULL,
    icon TEXT NOT NULL DEFAULT 'Tag',
    color TEXT NOT NULL DEFAULT '#6366f1',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. TRANSACTIONS TABLE (Income & Expense)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    type transaction_type NOT NULL,
    payment_method payment_method DEFAULT 'upi',
    title TEXT NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. CREDIT & DEBT RECORDS TABLE
-- Credit = Money someone owes me (Lent money)
-- Debt = Money I owe someone (Borrowed money)
CREATE TABLE IF NOT EXISTS public.credit_debt_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type credit_debt_type NOT NULL,
    counterpart_name TEXT NOT NULL,
    counterpart_phone TEXT,
    counterpart_email TEXT,
    original_amount NUMERIC(12, 2) NOT NULL CHECK (original_amount > 0),
    settled_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (settled_amount >= 0),
    status record_status NOT NULL DEFAULT 'pending',
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. ATTACHMENTS TABLE (Receipts, Invoices, Proofs)
CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    credit_debt_id UUID REFERENCES public.credit_debt_records(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL, -- e.g. 'image/png', 'application/pdf'
    file_size INTEGER NOT NULL, -- in bytes
    storage_path TEXT NOT NULL, -- Path within Supabase storage bucket
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. INDEXES FOR HIGH QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON public.transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_credit_debt_user_status ON public.credit_debt_records(user_id, status);
CREATE INDEX IF NOT EXISTS idx_credit_debt_user_due ON public.credit_debt_records(user_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_user ON public.attachments(user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: Users can NEVER access other users' wallet data
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_debt_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Categories Policies: Users can view global defaults (user_id IS NULL) OR their own categories
CREATE POLICY "Users can view categories" ON public.categories
    FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert own categories" ON public.categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON public.categories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON public.categories
    FOR DELETE USING (auth.uid() = user_id);

-- Transactions Policies
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON public.transactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON public.transactions
    FOR DELETE USING (auth.uid() = user_id);

-- Credit / Debt Policies
CREATE POLICY "Users can view own credit and debt records" ON public.credit_debt_records
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit and debt records" ON public.credit_debt_records
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credit and debt records" ON public.credit_debt_records
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credit and debt records" ON public.credit_debt_records
    FOR DELETE USING (auth.uid() = user_id);

-- Attachments Policies
CREATE POLICY "Users can view own attachments" ON public.attachments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attachments" ON public.attachments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attachments" ON public.attachments
    FOR DELETE USING (auth.uid() = user_id);

-- ==============================================================================
-- AUTOMATIC TRIGGERS
-- ==============================================================================

-- Automatically create a profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Automatic updated_at timestamp refresher
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_transactions_updated_at ON public.transactions;
CREATE TRIGGER tr_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_credit_debt_updated_at ON public.credit_debt_records;
CREATE TRIGGER tr_credit_debt_updated_at
    BEFORE UPDATE ON public.credit_debt_records
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================================================
-- DEFAULT CATEGORIES SEED DATA
-- ==============================================================================
INSERT INTO public.categories (name, type, icon, color, is_default) VALUES
('Salary', 'income', 'Briefcase', '#10b981', true),
('Business / Freelance', 'income', 'TrendingUp', '#059669', true),
('Investments', 'income', 'Coins', '#047857', true),
('Rental Income', 'income', 'Home', '#34d399', true),
('Other Income', 'income', 'Wallet', '#6ee7b7', true),
('Food & Dining', 'expense', 'Utensils', '#f43f5e', true),
('Groceries', 'expense', 'ShoppingCart', '#e11d48', true),
('Rent & Housing', 'expense', 'Building', '#be123c', true),
('Utilities & Bills', 'expense', 'Zap', '#9f1239', true),
('Transport & Fuel', 'expense', 'Car', '#fb7185', true),
('Shopping', 'expense', 'ShoppingBag', '#f43f5e', true),
('Healthcare', 'expense', 'HeartPulse', '#e11d48', true),
('Entertainment', 'expense', 'Film', '#fb923c', true),
('Education', 'expense', 'GraduationCap', '#6366f1', true),
('Other Expense', 'expense', 'MoreHorizontal', '#94a3b8', true)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- STORAGE BUCKET CONFIGURATION (Run in Supabase SQL editor)
-- ==============================================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('wallet-attachments', 'wallet-attachments', false) ON CONFLICT DO NOTHING;
-- CREATE POLICY "Users can upload own attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'wallet-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can read own attachments" ON storage.objects FOR SELECT USING (bucket_id = 'wallet-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can delete own attachments" ON storage.objects FOR DELETE USING (bucket_id = 'wallet-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
