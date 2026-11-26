-- ==============================================================================
-- MY WALLET: PRODUCTION PERMISSION & ROW LEVEL SECURITY (RLS) FIX
-- ==============================================================================
-- Run this script in your Supabase Dashboard:
-- 1. Open https://supabase.com/dashboard/project/ruhifsmbgfhxoumfvoyl/sql
-- 2. Click "New query"
-- 3. Paste this ENTIRE script
-- 4. Click "Run" (or Ctrl + Enter)
--
-- This script fixes Error [42501] (Permission denied on table 'khata_people')
-- by granting all necessary table privileges and configuring clean, robust RLS policies.
-- ==============================================================================

-- 1. GRANT SCHEMA PRIVILEGES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON SCHEMA public TO anon, authenticated, service_role, postgres;

-- 2. ENSURE ALL TABLES EXIST WITH PROPER SCHEMAS & DEFAULT VALUES
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
    recovery_email_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'light';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS recovery_email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS recovery_email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS recovery_email_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.user_settings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    opening_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    app_mode TEXT NOT NULL DEFAULT 'income_expense',
    currency TEXT NOT NULL DEFAULT 'INR',
    default_currency TEXT DEFAULT 'INR',
    reminder_prefs JSONB DEFAULT '{}'::jsonb,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'bank',
    opening_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    account_number TEXT,
    color TEXT DEFAULT '#3b82f6',
    icon TEXT DEFAULT 'Building2',
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.account_transfers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_account_id TEXT NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    to_account_id TEXT NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transfer_time TEXT DEFAULT '12:00',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    icon TEXT NOT NULL DEFAULT 'Tag',
    color TEXT NOT NULL DEFAULT '#6366f1',
    is_default BOOLEAN NOT NULL DEFAULT false,
    budget NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.subcategories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    budget NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.budgets (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    category_id TEXT REFERENCES public.categories(id) ON DELETE CASCADE,
    total_budget NUMERIC(15, 2) DEFAULT 0.00,
    monthly_budget NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    category_budgets JSONB DEFAULT '{}'::jsonb,
    subcategory_budgets JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- H. KHATA PEOPLE (The table referenced in error 42501)
CREATE TABLE IF NOT EXISTS public.khata_people (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.khata_people ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.khata_people ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.khata_people ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.khata_people ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

CREATE TABLE IF NOT EXISTS public.khata_transactions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    person_id TEXT REFERENCES public.khata_people(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debt')),
    counterpart_name TEXT NOT NULL,
    counterpart_phone TEXT,
    counterpart_email TEXT,
    original_amount NUMERIC(15, 2) NOT NULL CHECK (original_amount > 0),
    settled_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending',
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_time TEXT DEFAULT '12:00',
    due_date DATE,
    notes TEXT,
    repayments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id TEXT REFERENCES public.accounts(id) ON DELETE SET NULL,
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    subcategory_id TEXT REFERENCES public.subcategories(id) ON DELETE SET NULL,
    subcategory_name TEXT,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    title TEXT NOT NULL,
    description TEXT,
    payment_method TEXT NOT NULL DEFAULT 'upi',
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_time TEXT DEFAULT '12:00',
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    recurring_id TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.attachments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_type TEXT,
    parent_id TEXT,
    transaction_id TEXT REFERENCES public.transactions(id) ON DELETE CASCADE,
    khata_transaction_id TEXT REFERENCES public.khata_transactions(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    file_type TEXT,
    storage_path TEXT NOT NULL,
    data_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.message_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    record_id TEXT,
    person_id TEXT REFERENCES public.khata_people(id) ON DELETE SET NULL,
    person_name TEXT,
    recipient_name TEXT,
    recipient_phone TEXT,
    message_type TEXT NOT NULL,
    message_content TEXT,
    channel TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',
    language TEXT NOT NULL DEFAULT 'en',
    sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.wallet_backups (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    backup_name TEXT NOT NULL,
    backup_type TEXT NOT NULL DEFAULT 'manual',
    trigger_type TEXT NOT NULL DEFAULT 'manual',
    record_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
    snapshot_data JSONB,
    data JSONB,
    checksum TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
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

-- 4. DROP EXISTING POLICIES TO PREVENT CONFLICTS
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

-- 5. CREATE CLEAN, ROBUST RLS POLICIES FOR ALL TABLES

-- Profiles: allow full CRUD to the profile owner
CREATE POLICY "profiles_all" ON public.profiles
    FOR ALL TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- User Settings
CREATE POLICY "user_settings_all" ON public.user_settings
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Accounts
CREATE POLICY "accounts_all" ON public.accounts
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Account Transfers
CREATE POLICY "transfers_all" ON public.account_transfers
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Categories: allow reading system default categories (user_id IS NULL) + user's own
CREATE POLICY "categories_select" ON public.categories
    FOR SELECT TO authenticated
    USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "categories_insert" ON public.categories
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "categories_update" ON public.categories
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "categories_delete" ON public.categories
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Subcategories
CREATE POLICY "subcategories_all" ON public.subcategories
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Budgets
CREATE POLICY "budgets_all" ON public.budgets
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Khata People (CRITICAL FIX FOR 42501 ON khata_people)
CREATE POLICY "khata_people_all" ON public.khata_people
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Khata Transactions
CREATE POLICY "khata_transactions_all" ON public.khata_transactions
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Transactions
CREATE POLICY "transactions_all" ON public.transactions
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Attachments
CREATE POLICY "attachments_all" ON public.attachments
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Message History
CREATE POLICY "message_history_all" ON public.message_history
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Wallet Backups
CREATE POLICY "wallet_backups_all" ON public.wallet_backups
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. EXPLICITLY GRANT ALL PRIVILEGES ON EVERY TABLE TO authenticated, anon, service_role
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.user_settings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.accounts TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.account_transfers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.categories TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.subcategories TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.budgets TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.khata_people TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.khata_transactions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.transactions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.attachments TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.message_history TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.wallet_backups TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

SELECT 'SUCCESS: All tables, columns, permissions, and RLS policies have been successfully configured!' AS status;
