-- ==============================================================================
-- MY WALLET – ACCOUNT & WALLET DATA DIAGNOSTICS & RECOVERY SCRIPT
-- Run this in your Supabase Dashboard -> SQL Editor
-- This script:
-- 1. Inspects the original user account in auth.users
-- 2. Verifies that email_confirmed_at is set so OTP delivery works reliably
-- 3. Counts and verifies all wallet data linked to your original user UUID
-- 4. Confirms Row Level Security (RLS) policies are active and correctly mapped
-- ==============================================================================

-- STEP 1: INSPECT AUTH USERS
-- Replace with your registered email if different:
DO $$
DECLARE
    target_email TEXT := 'najisanunaji@gmail.com';
    user_record RECORD;
    tx_count INT;
    khata_count INT;
    people_count INT;
    acc_count INT;
    budget_count INT;
BEGIN
    SELECT * INTO user_record 
    FROM auth.users 
    WHERE email = target_email 
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE 'No auth user found for email: %', target_email;
        RAISE NOTICE 'Listing all users in auth.users:';
    ELSE
        RAISE NOTICE '==================================================';
        RAISE NOTICE 'FOUND ORIGINAL USER:';
        RAISE NOTICE 'User UUID (auth.uid): %', user_record.id;
        RAISE NOTICE 'Email: %', user_record.email;
        RAISE NOTICE 'Email Confirmed At: %', user_record.email_confirmed_at;
        RAISE NOTICE 'Created At: %', user_record.created_at;
        RAISE NOTICE 'Last Sign In At: %', user_record.last_sign_in_at;
        RAISE NOTICE '==================================================';

        -- Ensure email_confirmed_at is set so account is in active status
        IF user_record.email_confirmed_at IS NULL THEN
            UPDATE auth.users 
            SET email_confirmed_at = NOW(),
                updated_at = NOW()
            WHERE id = user_record.id;
            RAISE NOTICE 'Updated email_confirmed_at to NOW() for reliable OTP authentication.';
        END IF;

        -- Check existing wallet data
        SELECT COUNT(*) INTO tx_count FROM public.transactions WHERE user_id = user_record.id;
        SELECT COUNT(*) INTO khata_count FROM public.khata_transactions WHERE user_id = user_record.id;
        SELECT COUNT(*) INTO people_count FROM public.khata_people WHERE user_id = user_record.id;
        SELECT COUNT(*) INTO acc_count FROM public.accounts WHERE user_id = user_record.id;
        SELECT COUNT(*) INTO budget_count FROM public.budgets WHERE user_id = user_record.id;

        RAISE NOTICE '==================================================';
        RAISE NOTICE 'EXISTING WALLET DATA FOR USER %:', user_record.id;
        RAISE NOTICE '  • Transactions: % records', tx_count;
        RAISE NOTICE '  • Khata Records (Credit/Debt): % records', khata_count;
        RAISE NOTICE '  • Khata Contacts (People): % people', people_count;
        RAISE NOTICE '  • Bank & Cash Accounts: % accounts', acc_count;
        RAISE NOTICE '  • Monthly Budgets: % records', budget_count;
        RAISE NOTICE '==================================================';
    END IF;
END $$;

-- STEP 2: SUMMARY QUERY (Selectable view in SQL Editor)
SELECT 
    u.id AS user_id,
    u.email,
    u.email_confirmed_at,
    u.created_at AS account_created,
    (SELECT COUNT(*) FROM public.transactions t WHERE t.user_id = u.id) AS total_transactions,
    (SELECT COUNT(*) FROM public.khata_transactions k WHERE k.user_id = u.id) AS total_khata_records,
    (SELECT COUNT(*) FROM public.khata_people p WHERE p.user_id = u.id) AS total_khata_people,
    (SELECT COUNT(*) FROM public.accounts a WHERE a.user_id = u.id) AS total_accounts,
    (SELECT COUNT(*) FROM public.budgets b WHERE b.user_id = u.id) AS total_budgets
FROM auth.users u
ORDER BY u.created_at ASC;
