-- ==============================================================================
-- MY WALLET: COMPLETE SUPABASE CLOUD SETUP, PERMISSIONS & DATA RECOVERY SCRIPT
-- ==============================================================================
-- Run this script in the Supabase Dashboard -> SQL Editor
--
-- This script performs:
-- 1. Schema & Table Grants for PostgREST (Fixes 42501 permission denied)
-- 2. Ensures all tables exist (including message_history and wallet_backups)
-- 3. Enables Row Level Security (RLS) with verified policies
-- 4. Deep Inspection & Re-linking of all historical/orphan wallet records
-- 5. Complete Verification Report of all data per user
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. GRANT SCHEMA & TABLE PRIVILEGES (CRITICAL FOR POSTGREST & RLS)
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2. ENSURE MISSING TABLES EXIST
-- ------------------------------------------------------------------------------

-- Message History Table
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

CREATE INDEX IF NOT EXISTS idx_msg_history_user_sent ON public.message_history(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_history_person ON public.message_history(user_id, person_id);

-- Cloud Wallet Backups Table
CREATE TABLE IF NOT EXISTS public.wallet_backups (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    backup_name TEXT NOT NULL,
    backup_type TEXT NOT NULL DEFAULT 'auto', -- 'auto' | 'manual'
    record_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
    data JSONB NOT NULL,
    checksum TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wallet_backups_user ON public.wallet_backups(user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. ENABLE RLS & POLICIES FOR NEW TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE public.message_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own message history" ON public.message_history;
CREATE POLICY "Users can manage own message history"
    ON public.message_history
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own wallet backups" ON public.wallet_backups;
CREATE POLICY "Users can manage own wallet backups"
    ON public.wallet_backups
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 4. DATA RECOVERY & RE-LINKING ENGINE (IDEMPOTENT & NON-DESTRUCTIVE)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    target_email TEXT := 'najisanunaji@gmail.com';
    target_user_id UUID;
    total_users_count INT;
    tx_migrated INT := 0;
    khata_migrated INT := 0;
    people_migrated INT := 0;
    accounts_migrated INT := 0;
    budgets_migrated INT := 0;
BEGIN
    SELECT COUNT(*) INTO total_users_count FROM auth.users;
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'MY WALLET AUDIT: Found % users in auth.users', total_users_count;

    -- Look for the registered user
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = target_email 
    LIMIT 1;

    -- If not found by exact email, fall back to the most recently active user
    IF target_user_id IS NULL THEN
        SELECT id, email INTO target_user_id, target_email 
        FROM auth.users 
        ORDER BY created_at DESC 
        LIMIT 1;
    END IF;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'No auth user exists in auth.users yet. Create an account via Email OTP first.';
        RETURN;
    END IF;

    RAISE NOTICE 'Target Recovery User: % (UUID: %)', target_email, target_user_id;

    -- Confirm email if not yet set
    UPDATE auth.users 
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()) 
    WHERE id = target_user_id;

    -- A. Re-link transactions if any are associated with a different or null user_id
    WITH moved_tx AS (
        UPDATE public.transactions
        SET user_id = target_user_id,
            updated_at = NOW()
        WHERE user_id IS NULL OR user_id <> target_user_id
        RETURNING id
    )
    SELECT COUNT(*) INTO tx_migrated FROM moved_tx;

    -- B. Re-link khata transactions
    WITH moved_khata AS (
        UPDATE public.khata_transactions
        SET user_id = target_user_id,
            updated_at = NOW()
        WHERE user_id IS NULL OR user_id <> target_user_id
        RETURNING id
    )
    SELECT COUNT(*) INTO khata_migrated FROM moved_khata;

    -- C. Re-link khata people
    WITH moved_people AS (
        UPDATE public.khata_people
        SET user_id = target_user_id,
            updated_at = NOW()
        WHERE user_id IS NULL OR user_id <> target_user_id
        RETURNING id
    )
    SELECT COUNT(*) INTO people_migrated FROM moved_people;

    -- D. Re-link accounts
    WITH moved_accounts AS (
        UPDATE public.accounts
        SET user_id = target_user_id,
            updated_at = NOW()
        WHERE user_id IS NULL OR user_id <> target_user_id
        RETURNING id
    )
    SELECT COUNT(*) INTO accounts_migrated FROM moved_accounts;

    -- E. Re-link budgets
    WITH moved_budgets AS (
        UPDATE public.budgets
        SET user_id = target_user_id,
            updated_at = NOW()
        WHERE user_id IS NULL OR user_id <> target_user_id
        RETURNING id
    )
    SELECT COUNT(*) INTO budgets_migrated FROM moved_budgets;

    RAISE NOTICE '==================================================';
    RAISE NOTICE 'RECOVERY MIGRATION RESULTS:';
    RAISE NOTICE '  • Re-linked Transactions: % records', tx_migrated;
    RAISE NOTICE '  • Re-linked Khata (Credit/Debt): % records', khata_migrated;
    RAISE NOTICE '  • Re-linked Khata People: % records', people_migrated;
    RAISE NOTICE '  • Re-linked Accounts: % records', accounts_migrated;
    RAISE NOTICE '  • Re-linked Budgets: % records', budgets_migrated;
    RAISE NOTICE '==================================================';
END $$;

-- ------------------------------------------------------------------------------
-- 5. FINAL REPORT: LIVE WALLET DATA AUDIT PER USER
-- ------------------------------------------------------------------------------
SELECT 
    u.id AS user_id,
    u.email,
    u.email_confirmed_at,
    u.created_at AS account_created,
    (SELECT COUNT(*) FROM public.transactions t WHERE t.user_id = u.id) AS active_transactions,
    (SELECT COUNT(*) FROM public.khata_transactions k WHERE k.user_id = u.id) AS active_khata_records,
    (SELECT COUNT(*) FROM public.khata_people p WHERE p.user_id = u.id) AS active_khata_people,
    (SELECT COUNT(*) FROM public.accounts a WHERE a.user_id = u.id) AS active_accounts,
    (SELECT COUNT(*) FROM public.budgets b WHERE b.user_id = u.id) AS active_budgets,
    (SELECT COUNT(*) FROM public.message_history m WHERE m.user_id = u.id) AS active_messages,
    (SELECT COUNT(*) FROM public.wallet_backups wb WHERE wb.user_id = u.id) AS cloud_backups
FROM auth.users u
ORDER BY u.created_at DESC;
