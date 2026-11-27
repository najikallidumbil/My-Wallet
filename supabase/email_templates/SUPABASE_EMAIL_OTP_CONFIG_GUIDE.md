# MY WALLET – Supabase Email OTP & Custom SMTP Delivery Guide

This guide details how to configure Supabase for maximum email OTP deliverability, professional branding, and reliable inbox placement.

---

## 1. Supabase Built-in Email Provider: Limits & Delivery Restrictions

By default, Supabase sends verification emails through its shared built-in mailer (`noreply@mail.app.supabase.io`).

### Critical Built-in Restrictions:
1. **Rate Limit of 30 emails / hour**:
   - The default shared mailer has a hard limit of **30 emails per hour (max 4 per minute)** for your entire Supabase project.
   - If testing repeatedly or if several users request OTPs around the same time, Supabase returns HTTP `429: Rate limit exceeded` (or `over_email_send_rate_limit`).
2. **Spam & Junk Folder Placement**:
   - Because thousands of free development projects share the default `noreply@mail.app.supabase.io` IP and domain, major email providers (Gmail, Outlook/Hotmail, Yahoo) frequently flag these messages as **Spam**, **Junk**, or **Promotions**.
3. **Sender Name**:
   - Without custom configuration, emails display generic sender headers that may appear unfamiliar to your users.

---

## 2. Recommended: Enable Custom SMTP (Instant Inbox Delivery)

To eliminate the 30 emails/hour limit and guarantee that OTPs arrive in the user's primary inbox in **1–2 seconds**, configure a Custom SMTP Provider in your Supabase Dashboard:

### Step 2.1: Choose a Free / Production SMTP Provider
- **Resend** (Recommended by Supabase): Free tier gives **3,000 emails/month** (100 emails/day) with industry-leading deliverability.
- **Brevo (formerly Sendinblue)**: Free tier gives **300 emails/day**.
- **Amazon SES**: \$0.10 for 10,000 emails (highest reliability).
- **Google Workspace / Gmail SMTP**: Can be used with an App Password if you have a Google Workspace domain.

### Step 2.2: Configure in Supabase Dashboard
1. Open your Supabase Project Dashboard: [https://supabase.com/dashboard/project/ruhifsmbgfhxoumfvoyl](https://supabase.com/dashboard/project/ruhifsmbgfhxoumfvoyl)
2. In the left sidebar, navigate to **Project Settings** (gear icon) -> **Authentication** (or **Authentication** -> **Providers** -> **Email**).
3. Scroll to **SMTP Settings** and toggle **Enable Custom SMTP** to **ON**.
4. Enter your SMTP details:
   - **Sender email**: `noreply@yourdomain.com` (or your verified sender address)
   - **Sender name**: `MY WALLET`
   - **Host**: e.g., `smtp.resend.com` (or your provider's host)
   - **Port**: `465` (SSL) or `587` (TLS)
   - **User**: `resend` (or your SMTP username / API key)
   - **Password**: your SMTP API Key
5. Click **Save Changes**.

---

## 3. Configure Email Subjects & Templates in Supabase

Supabase uses two templates during passwordless OTP login:
1. **Magic Link** (for returning users or OTP sign-in)
2. **Confirm signup** (for new user sign-ups)

### Step 3.1: Configure "Magic Link" Template
1. Go to **Authentication** -> **Email Templates** -> **Magic Link**.
2. Set **Subject**:
   ```
   {{ .Token }} is your MY WALLET verification code
   ```
   *(Placing the token first allows users to view the 6-digit code directly in their phone's lock screen notification or email preview).*
3. In the **Body** tab, paste the contents of `supabase/email_templates/magic_link_otp_template.html`.
4. Click **Save**.

### Step 3.2: Configure "Confirm signup" Template
1. Go to **Authentication** -> **Email Templates** -> **Confirm signup**.
2. Set **Subject**:
   ```
   {{ .Token }} is your MY WALLET verification code
   ```
3. In the **Body** tab, paste the contents of `supabase/email_templates/magic_link_otp_template.html`.
4. Click **Save**.

---

## 4. Supabase Auth Rate Limit Settings

To prevent artificial bottlenecks during login:
1. Go to **Authentication** -> **Rate Limits** (or **Attack Protection**).
2. Check the **Email Rate Limits**:
   - With Default Mailer: Cannot exceed 30/hour.
   - With Custom SMTP: You can increase the limit up to **300+ requests per hour** to support higher active user volumes.
3. Ensure **OTP Expiry** is set to **600 seconds** (10 minutes) so users have sufficient time to enter the code.

---

## 5. In-App Experience Highlights Implemented

The MY WALLET application has been upgraded with:
1. **Spam & Junk Folder Guidance**:
   - Reassuring notice on the OTP screen reminding users to check their Spam/Junk folder if the email is delayed.
2. **30-Second Resend Cooldown**:
   - Prevents accidental spamming or duplicate requests.
   - Resets and autofocuses OTP input boxes when a fresh code is requested.
3. **Zero Security Leaks**:
   - OTP codes are never logged to console or stored in debug state.
4. **Resilient Verification**:
   - Multi-phase verification supporting standard `email` OTP, `signup` OTP, and `magiclink` session tokens seamlessly.
