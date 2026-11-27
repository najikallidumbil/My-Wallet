-- ==============================================================================
-- MY WALLET — Database Migration: Fix Categories, Subcategories & Accounts FKs
-- Safe, Idempotent, Zero Data Loss
-- ==============================================================================
-- Resolves:
-- 1. "insert or update on table transactions violates foreign key constraint transactions_account_id_fkey"
-- 2. "insert or update on table transactions violates foreign key constraint transactions_category_id_fkey"
-- 3. "insert or update on table subcategories violates foreign key constraint subcategories_category_id_fkey"
-- 4. Potential "transactions_subcategory_id_fkey" violations for default subcategories
-- 5. Potential "account_transfers" foreign key violations
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Ensure public.accounts table exists with correct schema and NULLABLE user_id
-- ------------------------------------------------------------------------------
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

-- Crucial: Make user_id nullable in accounts so global default accounts (acc-cash, acc-bank, acc-upi) can exist
ALTER TABLE public.accounts ALTER COLUMN user_id DROP NOT NULL;

-- ------------------------------------------------------------------------------
-- 2. Ensure public.categories table exists with correct schema
-- ------------------------------------------------------------------------------
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

-- Ensure user_id column in categories is nullable (so global system defaults can have user_id = NULL)
ALTER TABLE public.categories ALTER COLUMN user_id DROP NOT NULL;

-- ------------------------------------------------------------------------------
-- 3. Ensure public.subcategories table exists and user_id is NULLABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subcategories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    budget NUMERIC(14, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crucial: Make user_id nullable in subcategories so global default subcategories can exist
ALTER TABLE public.subcategories ALTER COLUMN user_id DROP NOT NULL;

-- ------------------------------------------------------------------------------
-- 4. Ensure public.transactions table exists and has proper columns & constraints
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id TEXT REFERENCES public.accounts(id) ON DELETE SET NULL,
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    subcategory_id TEXT REFERENCES public.subcategories(id) ON DELETE SET NULL,
    subcategory_name TEXT,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    payment_method TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL,
    transaction_time TIME NOT NULL DEFAULT '12:00:00',
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_id TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add subcategory_name if missing
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS subcategory_name TEXT;

-- ------------------------------------------------------------------------------
-- 5. Ensure public.account_transfers table exists
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_transfers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_account_id TEXT REFERENCES public.accounts(id) ON DELETE SET NULL,
    to_account_id TEXT REFERENCES public.accounts(id) ON DELETE SET NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transfer_time TEXT DEFAULT '12:00',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 6. Seed Default Accounts (acc-cash, acc-bank, acc-upi)
-- ------------------------------------------------------------------------------
INSERT INTO public.accounts (id, user_id, name, type, opening_balance, current_balance, icon, color, is_default)
VALUES
    ('acc-cash', NULL, 'Cash in Hand', 'cash', 0, 0, 'Banknote', '#10b981', true),
    ('acc-bank', NULL, 'Primary Bank Account', 'bank', 0, 0, 'Building2', '#3b82f6', true),
    ('acc-upi', NULL, 'UPI Wallet', 'upi', 0, 0, 'Smartphone', '#8b5cf6', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    is_default = true;

-- ------------------------------------------------------------------------------
-- 7. Seed Standard Categories (Frontend cat-inc-* and cat-exp-*)
-- ------------------------------------------------------------------------------
INSERT INTO public.categories (id, user_id, name, type, icon, color, is_default, budget)
VALUES
    -- Standard Income Categories
    ('cat-inc-1', NULL, 'Salary', 'income', 'Briefcase', '#10b981', true, 0),
    ('cat-inc-2', NULL, 'Freelance & Projects', 'income', 'TrendingUp', '#059669', true, 0),
    ('cat-inc-3', NULL, 'Investments & Dividends', 'income', 'Coins', '#047857', true, 0),
    ('cat-inc-4', NULL, 'Cashback & Rewards', 'income', 'Gift', '#34d399', true, 0),
    ('cat-inc-5', NULL, 'Rental Income', 'income', 'Home', '#2dd4bf', true, 0),
    ('cat-inc-6', NULL, 'Other Income', 'income', 'Wallet', '#6ee7b7', true, 0),

    -- Standard Expense Categories
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

    -- Legacy Aliases (preserves backward compatibility with earlier database setups)
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

-- ------------------------------------------------------------------------------
-- 8. Seed Standard Default Subcategories
-- ------------------------------------------------------------------------------
INSERT INTO public.subcategories (id, user_id, category_id, name, budget)
VALUES
    -- Food & Dining (cat-exp-1)
    ('sub-1', NULL, 'cat-exp-1', 'Restaurants & Dining Out', 0),
    ('sub-2', NULL, 'cat-exp-1', 'Food Delivery (Swiggy/Zomato)', 0),
    ('sub-3', NULL, 'cat-exp-1', 'Cafes & Snacks', 0),

    -- Groceries & Mart (cat-exp-2)
    ('sub-4', NULL, 'cat-exp-2', 'Supermarket Supplies', 0),
    ('sub-5', NULL, 'cat-exp-2', 'Vegetables & Fruits', 0),
    ('sub-6', NULL, 'cat-exp-2', 'Dairy & Bakery', 0),

    -- Rent & Housing (cat-exp-3)
    ('sub-7', NULL, 'cat-exp-3', 'Apartment Rent', 0),
    ('sub-8', NULL, 'cat-exp-3', 'Society Maintenance', 0),

    -- Bills & Utilities (cat-exp-4)
    ('sub-9', NULL, 'cat-exp-4', 'Electricity Bill', 0),
    ('sub-10', NULL, 'cat-exp-4', 'Fiber Wi-Fi Broadband', 0),
    ('sub-11', NULL, 'cat-exp-4', 'Mobile Postpaid/Prepaid', 0),

    -- Fuel & Transportation (cat-exp-5)
    ('sub-12', NULL, 'cat-exp-5', 'Petrol & Diesel', 0),
    ('sub-13', NULL, 'cat-exp-5', 'Ola / Uber Cabs', 0),
    ('sub-14', NULL, 'cat-exp-5', 'Metro & Bus Smart Card', 0),

    -- Shopping & Electronics (cat-exp-6)
    ('sub-15', NULL, 'cat-exp-6', 'Clothing & Apparel', 0),
    ('sub-16', NULL, 'cat-exp-6', 'Gadgets & Accessories', 0),

    -- Healthcare & Medicine (cat-exp-7)
    ('sub-17', NULL, 'cat-exp-7', 'Pharmacy & Medicines', 0),
    ('sub-18', NULL, 'cat-exp-7', 'Doctor Consultation & Lab', 0),

    -- Entertainment & OTT (cat-exp-8)
    ('sub-19', NULL, 'cat-exp-8', 'OTT Subscriptions (Netflix/Prime)', 0),
    ('sub-20', NULL, 'cat-exp-8', 'Movie Tickets & Outings', 0)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name;

-- ------------------------------------------------------------------------------
-- 9. Ensure Foreign Key Constraints Exist and Handle Updates Cleanly
-- ------------------------------------------------------------------------------
-- Subcategories -> Categories
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'subcategories_category_id_fkey' AND table_name = 'subcategories'
    ) THEN
        ALTER TABLE public.subcategories DROP CONSTRAINT subcategories_category_id_fkey;
    END IF;
    ALTER TABLE public.subcategories
        ADD CONSTRAINT subcategories_category_id_fkey
        FOREIGN KEY (category_id) REFERENCES public.categories(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
END $$;

-- Transactions -> Categories
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'transactions_category_id_fkey' AND table_name = 'transactions'
    ) THEN
        ALTER TABLE public.transactions DROP CONSTRAINT transactions_category_id_fkey;
    END IF;
    ALTER TABLE public.transactions
        ADD CONSTRAINT transactions_category_id_fkey
        FOREIGN KEY (category_id) REFERENCES public.categories(id)
        ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

-- Transactions -> Subcategories
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'transactions_subcategory_id_fkey' AND table_name = 'transactions'
    ) THEN
        ALTER TABLE public.transactions DROP CONSTRAINT transactions_subcategory_id_fkey;
    END IF;
    ALTER TABLE public.transactions
        ADD CONSTRAINT transactions_subcategory_id_fkey
        FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id)
        ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

-- Transactions -> Accounts
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'transactions_account_id_fkey' AND table_name = 'transactions'
    ) THEN
        ALTER TABLE public.transactions DROP CONSTRAINT transactions_account_id_fkey;
    END IF;
    ALTER TABLE public.transactions
        ADD CONSTRAINT transactions_account_id_fkey
        FOREIGN KEY (account_id) REFERENCES public.accounts(id)
        ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

-- Account Transfers -> Accounts (from_account_id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'account_transfers_from_account_id_fkey' AND table_name = 'account_transfers'
    ) THEN
        ALTER TABLE public.account_transfers DROP CONSTRAINT account_transfers_from_account_id_fkey;
    END IF;
    ALTER TABLE public.account_transfers
        ADD CONSTRAINT account_transfers_from_account_id_fkey
        FOREIGN KEY (from_account_id) REFERENCES public.accounts(id)
        ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

-- Account Transfers -> Accounts (to_account_id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'account_transfers_to_account_id_fkey' AND table_name = 'account_transfers'
    ) THEN
        ALTER TABLE public.account_transfers DROP CONSTRAINT account_transfers_to_account_id_fkey;
    END IF;
    ALTER TABLE public.account_transfers
        ADD CONSTRAINT account_transfers_to_account_id_fkey
        FOREIGN KEY (to_account_id) REFERENCES public.accounts(id)
        ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

-- ------------------------------------------------------------------------------
-- 10. Configure Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Accounts Policies (View default accounts OR own custom accounts)
DROP POLICY IF EXISTS "Users view accounts" ON public.accounts;
DROP POLICY IF EXISTS "accounts_select" ON public.accounts;
CREATE POLICY "accounts_select" ON public.accounts
    FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own accounts" ON public.accounts;
DROP POLICY IF EXISTS "accounts_insert" ON public.accounts;
CREATE POLICY "accounts_insert" ON public.accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own accounts" ON public.accounts;
DROP POLICY IF EXISTS "accounts_update" ON public.accounts;
CREATE POLICY "accounts_update" ON public.accounts
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own accounts" ON public.accounts;
DROP POLICY IF EXISTS "accounts_delete" ON public.accounts;
CREATE POLICY "accounts_delete" ON public.accounts
    FOR DELETE USING (auth.uid() = user_id);

-- Account Transfers Policies
DROP POLICY IF EXISTS "transfers_select" ON public.account_transfers;
CREATE POLICY "transfers_select" ON public.account_transfers
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "transfers_insert" ON public.account_transfers;
CREATE POLICY "transfers_insert" ON public.account_transfers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "transfers_update" ON public.account_transfers;
CREATE POLICY "transfers_update" ON public.account_transfers
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "transfers_delete" ON public.account_transfers;
CREATE POLICY "transfers_delete" ON public.account_transfers
    FOR DELETE USING (auth.uid() = user_id);

-- Categories Policies
DROP POLICY IF EXISTS "Users view categories" ON public.categories;
DROP POLICY IF EXISTS "Users insert own categories" ON public.categories;
DROP POLICY IF EXISTS "Users update own categories" ON public.categories;
DROP POLICY IF EXISTS "Users delete own categories" ON public.categories;

CREATE POLICY "Users view categories" ON public.categories
    FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users insert own categories" ON public.categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own categories" ON public.categories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own categories" ON public.categories
    FOR DELETE USING (auth.uid() = user_id);

-- Subcategories Policies
DROP POLICY IF EXISTS "Users view own subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Users view subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Users insert own subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Users update own subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Users delete own subcategories" ON public.subcategories;

CREATE POLICY "Users view subcategories" ON public.subcategories
    FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users insert own subcategories" ON public.subcategories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own subcategories" ON public.subcategories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own subcategories" ON public.subcategories
    FOR DELETE USING (auth.uid() = user_id);

-- Transactions Policies
DROP POLICY IF EXISTS "Users manage own transactions" ON public.transactions;
CREATE POLICY "Users manage own transactions" ON public.transactions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 11. Grant Permissions
-- ------------------------------------------------------------------------------
GRANT ALL ON public.accounts TO anon, authenticated, service_role;
GRANT ALL ON public.account_transfers TO anon, authenticated, service_role;
GRANT ALL ON public.categories TO anon, authenticated, service_role;
GRANT ALL ON public.subcategories TO anon, authenticated, service_role;
GRANT ALL ON public.transactions TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 12. Create Helpful Performance Indexes
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON public.categories(type);
CREATE INDEX IF NOT EXISTS idx_subcategories_cat ON public.subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_user ON public.subcategories(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_cat ON public.transactions(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_subcat ON public.transactions(user_id, subcategory_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_acc ON public.transactions(user_id, account_id);

COMMIT;

-- ==============================================================================
-- 13. Verification Queries (Run automatically at end of migration)
-- ==============================================================================
SELECT 'MIGRATION COMPLETE' AS status;

SELECT
    count(*) AS total_accounts,
    count(*) FILTER (WHERE user_id IS NULL) AS default_accounts
FROM public.accounts;

SELECT
    count(*) AS total_categories,
    count(*) FILTER (WHERE is_default = true) AS default_categories,
    count(*) FILTER (WHERE type = 'income') AS income_categories,
    count(*) FILTER (WHERE type = 'expense') AS expense_categories
FROM public.categories;

SELECT
    count(*) AS total_subcategories,
    count(*) FILTER (WHERE user_id IS NULL) AS default_subcategories
FROM public.subcategories;
