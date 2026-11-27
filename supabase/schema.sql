-- ==============================================================================
-- MY WALLET - PRODUCTION SUPABASE DATABASE SCHEMA
-- Includes Multi-User Row Level Security (RLS), Backup/Recovery Email Verification,
-- Storage Bucket configuration, and Triggers.
-- ==============================================================================

-- 1. Enable pgcrypto / uuid-ossp for cryptographic hashes and UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant schema privileges to API roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ==============================================================================
-- 2. CORE DATABASE TABLES
-- Every user-data table includes: id, user_id, created_at, updated_at
-- ==============================================================================

-- PROFILES TABLE (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    currency TEXT DEFAULT 'INR',
    theme_preference TEXT DEFAULT 'light',
    recovery_email TEXT,
    recovery_email_verified BOOLEAN DEFAULT FALSE,
    recovery_email_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- USER SETTINGS TABLE
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

-- ACCOUNTS TABLE (Cash, Bank, UPI, Custom)
CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- ACCOUNT TRANSFERS TABLE (Internal Transfers with Zero Double-Counting)
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

-- CATEGORIES TABLE (Global defaults when user_id IS NULL, or custom per-user)
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

-- SUBCATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.subcategories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    budget NUMERIC(14, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- BUDGETS TABLE
CREATE TABLE IF NOT EXISTS public.budgets (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month TEXT NOT NULL, -- Format: 'YYYY-MM'
    total_budget NUMERIC(14, 2) DEFAULT 0,
    category_budgets JSONB DEFAULT '{}'::jsonb,
    subcategory_budgets JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_month_budget UNIQUE (user_id, month)
);

-- KHATA PEOPLE TABLE (Customer/Friend Ledger accounts)
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

-- KHATA TRANSACTIONS TABLE (Lending & Borrowing, Partial Repayments)
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

-- TRANSACTIONS TABLE (Income & Expense)
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

-- ATTACHMENTS TABLE (Receipts, Bills, Documents)
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

-- RECOVERY VERIFICATION REQUESTS TABLE (Hashed OTPs for Secondary Recovery Email)
CREATE TABLE IF NOT EXISTS public.recovery_verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recovery_email TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- MESSAGE HISTORY TABLE
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

-- CLOUD WALLET BACKUPS TABLE
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

-- ==============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON public.transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_khata_user_status ON public.khata_transactions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_khata_user_person ON public.khata_transactions(user_id, person_id);
CREATE INDEX IF NOT EXISTS idx_khata_user_due ON public.khata_transactions(user_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON public.budgets(user_id, month);
CREATE INDEX IF NOT EXISTS idx_attachments_user ON public.attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_requests_user ON public.recovery_verification_requests(user_id, recovery_email);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: No user can EVER view, modify, or delete another user's data
-- ==============================================================================

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
ALTER TABLE public.recovery_verification_requests ENABLE ROW LEVEL SECURITY;

-- Profiles: Own profile only
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User Settings
CREATE POLICY "Users view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Accounts
CREATE POLICY "Users view accounts" ON public.accounts FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users insert own accounts" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own accounts" ON public.accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own accounts" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- Account Transfers
CREATE POLICY "Users view own transfers" ON public.account_transfers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own transfers" ON public.account_transfers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own transfers" ON public.account_transfers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own transfers" ON public.account_transfers FOR DELETE USING (auth.uid() = user_id);

-- Categories (View system defaults OR own custom categories)
CREATE POLICY "Users view categories" ON public.categories FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users insert own categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own categories" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own categories" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- Subcategories
CREATE POLICY "Users view subcategories" ON public.subcategories FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users insert own subcategories" ON public.subcategories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own subcategories" ON public.subcategories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own subcategories" ON public.subcategories FOR DELETE USING (auth.uid() = user_id);

-- Budgets
CREATE POLICY "Users view own budgets" ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own budgets" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own budgets" ON public.budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own budgets" ON public.budgets FOR DELETE USING (auth.uid() = user_id);

-- Khata People
CREATE POLICY "Users view own khata people" ON public.khata_people FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own khata people" ON public.khata_people FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own khata people" ON public.khata_people FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own khata people" ON public.khata_people FOR DELETE USING (auth.uid() = user_id);

-- Khata Transactions
CREATE POLICY "Users view own khata transactions" ON public.khata_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own khata transactions" ON public.khata_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own khata transactions" ON public.khata_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own khata transactions" ON public.khata_transactions FOR DELETE USING (auth.uid() = user_id);

-- Transactions
CREATE POLICY "Users view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- Attachments
CREATE POLICY "Users view own attachments" ON public.attachments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own attachments" ON public.attachments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own attachments" ON public.attachments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own attachments" ON public.attachments FOR DELETE USING (auth.uid() = user_id);

-- Recovery Requests
CREATE POLICY "Users manage own recovery requests" ON public.recovery_verification_requests FOR ALL USING (auth.uid() = user_id);

-- Message History
ALTER TABLE public.message_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own message history" ON public.message_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Wallet Backups
ALTER TABLE public.wallet_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wallet backups" ON public.wallet_backups FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Grant privileges on all existing tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- ==============================================================================
-- 5. AUTOMATIC TRIGGERS & PROCEDURES
-- ==============================================================================

-- Trigger to handle new auth user signup
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

    -- 3. Seed Default Accounts
    INSERT INTO public.accounts (user_id, name, type, opening_balance, current_balance, icon, color, is_default)
    VALUES 
        (NEW.id, 'Cash in Hand', 'cash', 0, 0, 'Wallet', '#10b981', true),
        (NEW.id, 'Primary Bank Account', 'bank', 0, 0, 'Building2', '#3b82f6', false),
        (NEW.id, 'UPI Wallet', 'upi', 0, 0, 'Smartphone', '#8b5cf6', false)
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

-- ==============================================================================
-- 6. RECOVERY EMAIL VERIFICATION RPC FUNCTIONS
-- ==============================================================================

-- Request a recovery email verification OTP (Rate-limited, stores SHA256 hashed OTP)
CREATE OR REPLACE FUNCTION public.request_recovery_email_otp(
    target_email TEXT,
    hashed_otp TEXT,
    valid_seconds INTEGER DEFAULT 600
)
RETURNS JSONB AS $$
DECLARE
    curr_user UUID;
    recent_count INTEGER;
BEGIN
    curr_user := auth.uid();
    IF curr_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Rate limiting: Max 5 requests in last 15 minutes
    SELECT COUNT(*) INTO recent_count
    FROM public.recovery_verification_requests
    WHERE user_id = curr_user
      AND created_at > (NOW() - INTERVAL '15 minutes');

    IF recent_count >= 5 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Too many requests. Please wait 15 minutes.');
    END IF;

    -- Store OTP request with expiration
    INSERT INTO public.recovery_verification_requests (
        user_id,
        recovery_email,
        otp_hash,
        expires_at
    ) VALUES (
        curr_user,
        LOWER(TRIM(target_email)),
        hashed_otp,
        NOW() + (valid_seconds || ' seconds')::INTERVAL
    );

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the OTP and update profile recovery email
CREATE OR REPLACE FUNCTION public.verify_recovery_email_otp(
    target_email TEXT,
    candidate_otp_hash TEXT
)
RETURNS JSONB AS $$
DECLARE
    curr_user UUID;
    req RECORD;
BEGIN
    curr_user := auth.uid();
    IF curr_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Find most recent active request
    SELECT * INTO req
    FROM public.recovery_verification_requests
    WHERE user_id = curr_user
      AND recovery_email = LOWER(TRIM(target_email))
      AND verified_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active OTP request found.');
    END IF;

    IF req.expires_at < NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'OTP has expired. Please request a new one.');
    END IF;

    IF req.attempts >= 5 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Too many failed attempts. Please request a new OTP.');
    END IF;

    IF req.otp_hash <> candidate_otp_hash THEN
        UPDATE public.recovery_verification_requests
        SET attempts = attempts + 1
        WHERE id = req.id;
        RETURN jsonb_build_object('success', false, 'error', 'Invalid 6-digit OTP code.');
    END IF;

    -- Mark as verified
    UPDATE public.recovery_verification_requests
    SET verified_at = NOW()
    WHERE id = req.id;

    -- Update User Profile
    UPDATE public.profiles
    SET recovery_email = LOWER(TRIM(target_email)),
        recovery_email_verified = TRUE,
        recovery_email_verified_at = NOW(),
        updated_at = NOW()
    WHERE id = curr_user;

    RETURN jsonb_build_object('success', true, 'email', target_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 7. STORAGE BUCKET CONFIGURATION (Run in Supabase Dashboard / SQL)
-- Bucket: 'wallet-attachments'
-- Each user gets an isolated path: `${user.id}/*`
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('wallet-attachments', 'wallet-attachments', false) 
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Users can upload own attachments" ON storage.objects;
CREATE POLICY "Users can upload own attachments" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'wallet-attachments' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can read own attachments" ON storage.objects;
CREATE POLICY "Users can read own attachments" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'wallet-attachments' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can update own attachments" ON storage.objects;
CREATE POLICY "Users can update own attachments" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'wallet-attachments' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can delete own attachments" ON storage.objects;
CREATE POLICY "Users can delete own attachments" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'wallet-attachments' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- ==============================================================================
-- 8. DEFAULT SYSTEM CATEGORIES & SUBCATEGORIES SEED DATA
-- ==============================================================================
INSERT INTO public.categories (id, user_id, name, type, icon, color, is_default, budget) VALUES
    -- Standard Income
    ('cat-inc-1', NULL, 'Salary', 'income', 'Briefcase', '#10b981', true, 0),
    ('cat-inc-2', NULL, 'Freelance & Projects', 'income', 'TrendingUp', '#059669', true, 0),
    ('cat-inc-3', NULL, 'Investments & Dividends', 'income', 'Coins', '#047857', true, 0),
    ('cat-inc-4', NULL, 'Cashback & Rewards', 'income', 'Gift', '#34d399', true, 0),
    ('cat-inc-5', NULL, 'Rental Income', 'income', 'Home', '#2dd4bf', true, 0),
    ('cat-inc-6', NULL, 'Other Income', 'income', 'Wallet', '#6ee7b7', true, 0),

    -- Standard Expense
    ('cat-exp-1', NULL, 'Food & Dining', 'expense', 'Utensils', '#f43f5e', true, 0),
    ('cat-exp-2', NULL, 'Groceries & Mart', 'expense', 'ShoppingCart', '#e11d48', true, 0),
    ('cat-exp-3', NULL, 'Rent & Housing', 'expense', 'Building', '#be123c', true, 0),
    ('cat-exp-4', NULL, 'Bills & Utilities', 'expense', 'Zap', '#9f1239', true, 0),
    ('cat-exp-5', NULL, 'Fuel & Transportation', 'expense', 'Car', '#fb7185', true, 0),
    ('cat-exp-6', NULL, 'Shopping & Electronics', 'expense', 'ShoppingBag', '#ec4899', true, 0),
    ('cat-exp-7', NULL, 'Healthcare & Medicine', 'expense', 'HeartPulse', '#d946ef', true, 0),
    ('cat-exp-8', NULL, 'Entertainment & OTT', 'expense', 'Film', '#8b5cf6', true, 0),
    ('cat-exp-9', NULL, 'Education & Learning', 'expense', 'GraduationCap', '#6366f1', true, 0),
    ('cat-exp-10', NULL, 'Miscellaneous', 'expense', 'MoreHorizontal', '#64748b', true, 0),

    -- Legacy Aliases
    ('cat-salary', NULL, 'Salary', 'income', 'Briefcase', '#10b981', true, 0),
    ('cat-business', NULL, 'Business & Projects', 'income', 'TrendingUp', '#059669', true, 0),
    ('cat-investments', NULL, 'Investments & Dividends', 'income', 'Coins', '#047857', true, 0),
    ('cat-rental', NULL, 'Rental Income', 'income', 'Home', '#34d399', true, 0),
    ('cat-rewards', NULL, 'Cashback & Rewards', 'income', 'Gift', '#2dd4bf', true, 0),
    ('cat-other-income', NULL, 'Other Income', 'income', 'Wallet', '#6ee7b7', true, 0),
    ('cat-food', NULL, 'Food & Dining', 'expense', 'Utensils', '#f43f5e', true, 0),
    ('cat-groceries', NULL, 'Groceries & Mart', 'expense', 'ShoppingCart', '#e11d48', true, 0),
    ('cat-rent', NULL, 'Rent & Housing', 'expense', 'Building', '#be123c', true, 0),
    ('cat-utilities', NULL, 'Bills & Utilities', 'expense', 'Zap', '#9f1239', true, 0),
    ('cat-transport', NULL, 'Fuel & Transportation', 'expense', 'Car', '#fb7185', true, 0),
    ('cat-shopping', NULL, 'Shopping & Electronics', 'expense', 'ShoppingBag', '#ec4899', true, 0),
    ('cat-healthcare', NULL, 'Healthcare & Medicine', 'expense', 'HeartPulse', '#d946ef', true, 0),
    ('cat-entertainment', NULL, 'Entertainment & OTT', 'expense', 'Film', '#8b5cf6', true, 0),
    ('cat-education', NULL, 'Education & Learning', 'expense', 'GraduationCap', '#6366f1', true, 0),
    ('cat-other-expense', NULL, 'Miscellaneous', 'expense', 'MoreHorizontal', '#64748b', true, 0)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    is_default = true;

-- Default Subcategories Seed
INSERT INTO public.subcategories (id, user_id, category_id, name, budget) VALUES
    ('sub-1', NULL, 'cat-exp-1', 'Restaurants & Dining Out', 0),
    ('sub-2', NULL, 'cat-exp-1', 'Food Delivery (Swiggy/Zomato)', 0),
    ('sub-3', NULL, 'cat-exp-1', 'Cafes & Snacks', 0),
    ('sub-4', NULL, 'cat-exp-2', 'Supermarket Supplies', 0),
    ('sub-5', NULL, 'cat-exp-2', 'Vegetables & Fruits', 0),
    ('sub-6', NULL, 'cat-exp-2', 'Dairy & Bakery', 0),
    ('sub-7', NULL, 'cat-exp-3', 'Apartment Rent', 0),
    ('sub-8', NULL, 'cat-exp-3', 'Society Maintenance', 0),
    ('sub-9', NULL, 'cat-exp-4', 'Electricity Bill', 0),
    ('sub-10', NULL, 'cat-exp-4', 'Fiber Wi-Fi Broadband', 0),
    ('sub-11', NULL, 'cat-exp-4', 'Mobile Postpaid/Prepaid', 0),
    ('sub-12', NULL, 'cat-exp-5', 'Petrol & Diesel', 0),
    ('sub-13', NULL, 'cat-exp-5', 'Ola / Uber Cabs', 0),
    ('sub-14', NULL, 'cat-exp-5', 'Metro & Bus Smart Card', 0),
    ('sub-15', NULL, 'cat-exp-6', 'Clothing & Apparel', 0),
    ('sub-16', NULL, 'cat-exp-6', 'Gadgets & Accessories', 0),
    ('sub-17', NULL, 'cat-exp-7', 'Pharmacy & Medicines', 0),
    ('sub-18', NULL, 'cat-exp-7', 'Doctor Consultation & Lab', 0),
    ('sub-19', NULL, 'cat-exp-8', 'OTT Subscriptions (Netflix/Prime)', 0),
    ('sub-20', NULL, 'cat-exp-8', 'Movie Tickets & Outings', 0)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name;
