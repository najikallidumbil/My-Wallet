-- ==============================================================================
-- MY WALLET: PRODUCTION SUPABASE CLOUD DATABASE SETUP & AIRTIGHT RLS POLICIES
-- ==============================================================================
-- Run this script in your Supabase Dashboard -> SQL Editor.
-- This script is 100% idempotent and safe to run multiple times.
--
-- Features included:
-- 1. Full schema privileges for PostgREST & Auth roles (fixes 42501).
-- 2. Complete relational tables for multi-tenant, cloud-first financial storage.
-- 3. Strict Row Level Security (RLS) guaranteeing total multi-user isolation.
-- 4. Dedicated storage bucket 'wallet-attachments' with private user isolation.
-- 5. Automated triggers for new user onboarding and timestamps.
-- 6. Dedicated tables for cloud backups ('wallet_backups') and messaging ('message_history').
-- ==============================================================================

-- 1. EXTENSIONS & SCHEMA PRIVILEGES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2. CORE DATABASE TABLES
-- ------------------------------------------------------------------------------

-- A. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    currency TEXT DEFAULT 'INR',
    theme_preference TEXT DEFAULT 'light',
    recovery_email TEXT,
    recovery_email_verified BOOLEAN DEFAULT FALSE,
    recovery_email_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- B. USER SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.user_settings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    opening_balance NUMERIC(14, 2) DEFAULT 0,
    default_currency TEXT DEFAULT 'INR',
    app_mode TEXT DEFAULT 'income_expense',
    reminder_prefs JSONB DEFAULT '{"remindOnDueDate":true,"remindDaysBefore":1,"browserNotifications":false}'::jsonb,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- C. ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'bank',
    opening_balance NUMERIC(14, 2) DEFAULT 0,
    current_balance NUMERIC(14, 2) DEFAULT 0,
    account_number TEXT,
    color TEXT DEFAULT '#10b981',
    icon TEXT DEFAULT 'Building2',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- D. ACCOUNT TRANSFERS TABLE
CREATE TABLE IF NOT EXISTS public.account_transfers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_account_id TEXT REFERENCES public.accounts(id) ON DELETE CASCADE,
    to_account_id TEXT REFERENCES public.accounts(id) ON DELETE CASCADE,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transfer_time TEXT DEFAULT '12:00',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- E. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    icon TEXT NOT NULL DEFAULT 'Tag',
    color TEXT NOT NULL DEFAULT '#6366f1',
    is_default BOOLEAN DEFAULT FALSE,
    budget NUMERIC(14, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- F. SUBCATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.subcategories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    budget NUMERIC(14, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- G. BUDGETS TABLE
CREATE TABLE IF NOT EXISTS public.budgets (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    total_budget NUMERIC(14, 2) DEFAULT 0,
    category_budgets JSONB DEFAULT '{}'::jsonb,
    subcategory_budgets JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_month_budget UNIQUE (user_id, month)
);

-- H. KHATA PEOPLE TABLE
CREATE TABLE IF NOT EXISTS public.khata_people (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- I. KHATA TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.khata_transactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    person_id TEXT REFERENCES public.khata_people(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debt')),
    counterpart_name TEXT NOT NULL,
    counterpart_phone TEXT,
    counterpart_email TEXT,
    original_amount NUMERIC(14, 2) NOT NULL CHECK (original_amount > 0),
    settled_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (settled_amount >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'settled', 'overdue')),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_time TEXT DEFAULT '12:00',
    due_date DATE,
    notes TEXT,
    repayments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- J. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    subcategory_id TEXT REFERENCES public.subcategories(id) ON DELETE SET NULL,
    subcategory_name TEXT,
    account_id TEXT REFERENCES public.accounts(id) ON DELETE SET NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    payment_method TEXT DEFAULT 'upi',
    title TEXT NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_time TEXT DEFAULT '12:00',
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_id TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- K. ATTACHMENTS TABLE
CREATE TABLE IF NOT EXISTS public.attachments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id TEXT REFERENCES public.transactions(id) ON DELETE CASCADE,
    khata_transaction_id TEXT REFERENCES public.khata_transactions(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    data_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- L. MESSAGE HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.message_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    person_id TEXT REFERENCES public.khata_people(id) ON DELETE SET NULL,
    person_name TEXT NOT NULL,
    recipient_phone TEXT,
    message_content TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN (
        'payment_reminder',
        'due_date_reminder',
        'overdue_reminder',
        'payment_received',
        'payment_made',
        'personal'
    )),
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'copied')),
    status TEXT NOT NULL DEFAULT 'prepared' CHECK (status IN (
        'prepared',
        'opened_in_whatsapp',
        'opened_in_sms',
        'sent',
        'delivered',
        'failed'
    )),
    language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ml')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- M. WALLET BACKUPS TABLE (Snapshot Archives)
CREATE TABLE IF NOT EXISTS public.wallet_backups (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    backup_name TEXT NOT NULL,
    backup_type TEXT NOT NULL DEFAULT 'auto',
    record_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
    data JSONB NOT NULL,
    checksum TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 3. INDEXES FOR PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON public.transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_khata_user_status ON public.khata_transactions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_khata_user_person ON public.khata_transactions(user_id, person_id);
CREATE INDEX IF NOT EXISTS idx_khata_user_due ON public.khata_transactions(user_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON public.budgets(user_id, month);
CREATE INDEX IF NOT EXISTS idx_attachments_user ON public.attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_msg_history_user ON public.message_history(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_backups_user ON public.wallet_backups(user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: No user can view, edit, or delete another user's data
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_backups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to allow clean idempotent re-creation
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Profiles Policies
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User Settings Policies
CREATE POLICY "settings_select" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "settings_insert" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "settings_update" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Accounts Policies
CREATE POLICY "accounts_select" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "accounts_insert" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_update" ON public.accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "accounts_delete" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- Account Transfers Policies
CREATE POLICY "transfers_select" ON public.account_transfers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transfers_insert" ON public.account_transfers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transfers_update" ON public.account_transfers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "transfers_delete" ON public.account_transfers FOR DELETE USING (auth.uid() = user_id);

-- Categories Policies (View default system categories OR own custom ones)
CREATE POLICY "categories_select" ON public.categories FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "categories_insert" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "categories_delete" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- Subcategories Policies
CREATE POLICY "subcategories_all" ON public.subcategories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Budgets Policies
CREATE POLICY "budgets_all" ON public.budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Khata People Policies
CREATE POLICY "khata_people_all" ON public.khata_people FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Khata Transactions Policies
CREATE POLICY "khata_tx_all" ON public.khata_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Transactions Policies
CREATE POLICY "transactions_all" ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Attachments Policies
CREATE POLICY "attachments_all" ON public.attachments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Message History Policies
CREATE POLICY "message_history_all" ON public.message_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Wallet Backups Policies
CREATE POLICY "wallet_backups_all" ON public.wallet_backups FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 5. SECURE STORAGE BUCKET CONFIGURATION
-- Bucket: 'wallet-attachments' (Private, user isolated)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) 
VALUES ('wallet-attachments', 'wallet-attachments', false) 
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Users upload own attachments" ON storage.objects;
CREATE POLICY "Users upload own attachments" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'wallet-attachments' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users read own attachments" ON storage.objects;
CREATE POLICY "Users read own attachments" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'wallet-attachments' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users update own attachments" ON storage.objects;
CREATE POLICY "Users update own attachments" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'wallet-attachments' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users delete own attachments" ON storage.objects;
CREATE POLICY "Users delete own attachments" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'wallet-attachments' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- ------------------------------------------------------------------------------
-- 6. AUTOMATED NEW USER ONBOARDING TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Insert Profile
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    ) ON CONFLICT (id) DO NOTHING;

    -- 2. Insert Default User Settings
    INSERT INTO public.user_settings (user_id, opening_balance, app_mode)
    VALUES (NEW.id, 0, 'income_expense')
    ON CONFLICT (user_id) DO NOTHING;

    -- 3. Seed Default Isolated Accounts
    INSERT INTO public.accounts (user_id, name, type, opening_balance, current_balance, icon, color, is_default)
    VALUES 
        (NEW.id, 'Cash in Hand', 'cash', 0, 0, 'Banknote', '#10b981', true),
        (NEW.id, 'Primary Bank Account', 'bank', 0, 0, 'Building2', '#3b82f6', false),
        (NEW.id, 'UPI Wallet', 'upi', 0, 0, 'Smartphone', '#6366f1', false)
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to refresh updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER tr_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_accounts_updated_at ON public.accounts;
CREATE TRIGGER tr_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_categories_updated_at ON public.categories;
CREATE TRIGGER tr_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_budgets_updated_at ON public.budgets;
CREATE TRIGGER tr_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_khata_people_updated_at ON public.khata_people;
CREATE TRIGGER tr_khata_people_updated_at BEFORE UPDATE ON public.khata_people FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_khata_transactions_updated_at ON public.khata_transactions;
CREATE TRIGGER tr_khata_transactions_updated_at BEFORE UPDATE ON public.khata_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_transactions_updated_at ON public.transactions;
CREATE TRIGGER tr_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 7. DEFAULT SYSTEM CATEGORIES SEED DATA
-- ------------------------------------------------------------------------------
INSERT INTO public.categories (id, user_id, name, type, icon, color, is_default) VALUES
('cat-salary', NULL, 'Salary', 'income', 'Briefcase', '#10b981', true),
('cat-business', NULL, 'Business & Projects', 'income', 'TrendingUp', '#059669', true),
('cat-investments', NULL, 'Investments & Dividends', 'income', 'Coins', '#047857', true),
('cat-rental', NULL, 'Rental Income', 'income', 'Home', '#34d399', true),
('cat-rewards', NULL, 'Cashback & Rewards', 'income', 'Gift', '#2dd4bf', true),
('cat-other-income', NULL, 'Other Income', 'income', 'Wallet', '#6ee7b7', true),
('cat-food', NULL, 'Food & Dining', 'expense', 'Utensils', '#f43f5e', true),
('cat-groceries', NULL, 'Groceries & Mart', 'expense', 'ShoppingCart', '#e11d48', true),
('cat-rent', NULL, 'Rent & Housing', 'expense', 'Building', '#be123c', true),
('cat-utilities', NULL, 'Bills & Utilities', 'expense', 'Zap', '#9f1239', true),
('cat-transport', NULL, 'Fuel & Transportation', 'expense', 'Car', '#fb7185', true),
('cat-shopping', NULL, 'Shopping & Electronics', 'expense', 'ShoppingBag', '#ec4899', true),
('cat-healthcare', NULL, 'Healthcare & Medicine', 'expense', 'HeartPulse', '#d946ef', true),
('cat-entertainment', NULL, 'Entertainment & OTT', 'expense', 'Film', '#8b5cf6', true),
('cat-education', NULL, 'Education & Learning', 'expense', 'GraduationCap', '#6366f1', true),
('cat-other-expense', NULL, 'Miscellaneous', 'expense', 'MoreHorizontal', '#64748b', true)
ON CONFLICT (id) DO NOTHING;

-- Verification Notice
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

SELECT 'Cloud database setup completed successfully with strict multi-user RLS.' AS status;
