-- ==============================================================================
-- MY WALLET: MESSAGE HISTORY & SMART REMINDER AUDIT TABLE
-- Enables tracking for Payment Reminders, Due Date Reminders, Confirmations,
-- and custom notes sent via WhatsApp, SMS, or Copied.
-- ==============================================================================

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_msg_history_user_sent ON public.message_history(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_history_person ON public.message_history(user_id, person_id);
CREATE INDEX IF NOT EXISTS idx_msg_history_type ON public.message_history(user_id, message_type);

-- Enable Row Level Security (RLS)
ALTER TABLE public.message_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read and manage their own message history
CREATE POLICY "Users can manage own message history"
    ON public.message_history
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
