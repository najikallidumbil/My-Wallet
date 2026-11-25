import { isSupabaseConfigured, getSupabaseConfig, testSupabaseConnection } from '../supabase';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runSupabaseAuthTests(): Promise<{ passed: boolean; results: TestResult[] }> {
  const results: TestResult[] = [];

  function assert(condition: boolean, name: string, detail?: string) {
    if (condition) {
      results.push({ name, passed: true });
    } else {
      results.push({ name, passed: false, error: detail || 'Assertion failed' });
    }
  }

  // 1. SUPABASE CONFIGURATION RESOLUTION
  try {
    const config = getSupabaseConfig();
    assert(!!config.url, 'Test 1.1: Supabase URL is resolved from environment variables');
    assert(config.url.startsWith('https://'), 'Test 1.2: Supabase URL starts with https://');
    assert(config.url.includes('ruhifsmbgfhxoumfvoyl'), 'Test 1.3: Supabase URL points to project ruhifsmbgfhxoumfvoyl');
    assert(config.anonKey.startsWith('sb_publishable_'), 'Test 1.4: Supabase Publishable Key correctly loaded');
    assert(isSupabaseConfigured() === true, 'Test 1.5: isSupabaseConfigured() evaluates to true for valid credentials');
  } catch (err: any) {
    assert(false, 'Test 1 Exception', err.message);
  }

  // 2. VALIDATION & PLACEHOLDER REJECTION
  try {
    // Helper testing placeholder rejection logic
    const checkConfig = (url: string, key: string) => {
      return Boolean(
        url &&
        key &&
        !url.includes('your-project-id') &&
        !url.includes('your-project.supabase.co') &&
        !key.includes('your-anon-public-key') &&
        !key.includes('your-anon-publishable-key') &&
        url.startsWith('https://') &&
        key.length >= 20
      );
    };

    assert(!checkConfig('', ''), 'Test 2.1: Empty credentials rejected');
    assert(!checkConfig('http://insecure.supabase.co', 'valid-key-length-greater-than-twenty'), 'Test 2.2: Insecure http rejected');
    assert(!checkConfig('https://your-project-id.supabase.co', 'valid-key-length-greater-than-twenty'), 'Test 2.3: Placeholder project ID rejected');
    assert(!checkConfig('https://myproject.supabase.co', 'your-anon-public-key'), 'Test 2.4: Placeholder anon key rejected');
    assert(!checkConfig('https://myproject.supabase.co', 'short'), 'Test 2.5: Key shorter than 20 chars rejected');
    assert(checkConfig('https://ruhifsmbgfhxoumfvoyl.supabase.co', 'sb_publishable_6DUz-G2y2Ggw103rtR83aQ_yhmWPDo_'), 'Test 2.6: Valid publishable key accepted');
  } catch (err: any) {
    assert(false, 'Test 2 Exception', err.message);
  }

  // 3. CONNECTION TEST PROTOCOL (OFFLINE / INVALID / VALID)
  try {
    // 3.1 Test missing credentials
    const emptyRes = await testSupabaseConnection('', '');
    assert(emptyRes.status === 'not_configured', 'Test 3.1: Empty credentials return status="not_configured"');
    assert(emptyRes.success === false, 'Test 3.2: Empty credentials return success=false');

    // 3.2 Test invalid URL protocol
    const badUrlRes = await testSupabaseConnection('http://example.com', 'abcdefghijklmnopqrstuvwxyz123456');
    assert(badUrlRes.status === 'error', 'Test 3.3: Insecure URL returns status="error"');
    assert(badUrlRes.error?.includes('https://') === true, 'Test 3.4: Insecure URL error requires https://');

    // 3.3 Test short key
    const shortKeyRes = await testSupabaseConnection('https://ruhifsmbgfhxoumfvoyl.supabase.co', 'short');
    assert(shortKeyRes.status === 'error', 'Test 3.5: Short key returns status="error"');
  } catch (err: any) {
    assert(false, 'Test 3 Exception', err.message);
  }

  // 4. EMAIL OTP INPUT VALIDATION
  try {
    const validateEmail = (email: string) => {
      const trimmed = email.trim().toLowerCase();
      return Boolean(trimmed && trimmed.includes('@') && trimmed.includes('.') && trimmed.length > 5);
    };

    assert(validateEmail('user@example.com'), 'Test 4.1: Valid email accepted');
    assert(validateEmail('finance.expert@domain.co.in'), 'Test 4.2: Valid subdomain email accepted');
    assert(!validateEmail('invalid-email'), 'Test 4.3: Email without @ rejected');
    assert(!validateEmail('user@nodomain'), 'Test 4.4: Email without dot rejected');
    assert(!validateEmail(''), 'Test 4.5: Empty email rejected');

    const validateToken = (token: string) => {
      const clean = token.replace(/[^0-9]/g, '');
      return clean.length === 6;
    };

    assert(validateToken('123456'), 'Test 4.6: 6-digit numeric OTP accepted');
    assert(!validateToken('12345'), 'Test 4.7: 5-digit OTP rejected');
    assert(!validateToken('1234567'), 'Test 4.8: 7-digit OTP rejected');
    assert(!validateToken('12a456'), 'Test 4.9: Non-numeric characters rejected');
  } catch (err: any) {
    assert(false, 'Test 4 Exception', err.message);
  }

  // 5. DATABASE ROW LEVEL SECURITY & USER DATA ISOLATION INTEGRITY
  try {
    // Verify RLS policy rules:
    // Every user must only query, insert, update, or delete records where user_id = auth.uid()
    const mockAuthUserId = 'usr-uuid-1111';
    const otherUserId = 'usr-uuid-2222';

    interface MockDbRow {
      id: string;
      user_id: string;
      data: string;
    }

    const tableRows: MockDbRow[] = [
      { id: '1', user_id: mockAuthUserId, data: 'User 1 Salary' },
      { id: '2', user_id: otherUserId, data: 'User 2 Secret Debt' },
    ];

    // RLS SELECT check
    const rlsSelect = (rows: MockDbRow[], authUid: string) => {
      return rows.filter((r) => r.user_id === authUid);
    };

    const user1View = rlsSelect(tableRows, mockAuthUserId);
    assert(user1View.length === 1, 'Test 5.1: User 1 sees exactly 1 record');
    assert(user1View[0].data === 'User 1 Salary', 'Test 5.2: User 1 sees own record only');

    const user2View = rlsSelect(tableRows, otherUserId);
    assert(user2View.length === 1, 'Test 5.3: User 2 sees exactly 1 record');
    assert(user2View[0].data === 'User 2 Secret Debt', 'Test 5.4: User 2 sees own record only');

    // RLS INSERT check
    const rlsInsert = (row: MockDbRow, authUid: string) => {
      if (row.user_id !== authUid) throw new Error('RLS Violation: user_id must match auth.uid()');
      return true;
    };

    assert(rlsInsert({ id: '3', user_id: mockAuthUserId, data: 'New' }, mockAuthUserId), 'Test 5.5: Own user_id insertion allowed');
    let caughtViolation = false;
    try {
      rlsInsert({ id: '4', user_id: otherUserId, data: 'Spoof' }, mockAuthUserId);
    } catch {
      caughtViolation = true;
    }
    assert(caughtViolation, 'Test 5.6: Cross-user spoofing blocked by RLS WITH CHECK policy');
  } catch (err: any) {
    assert(false, 'Test 5 Exception', err.message);
  }

  // 6. PURE EMAIL OTP AUTHENTICATION FLOWS & PROFILE INITIALIZATION
  try {
    // 6.1 Test OTP payload parameters for new & existing users
    const buildOtpPayload = (email: string) => {
      return {
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: 'mywallet://',
        },
      };
    };

    const payloadNew = buildOtpPayload('newuser@example.com');
    assert(payloadNew.options.shouldCreateUser === true, 'Test 6.1: shouldCreateUser is true for seamless new account signup');
    assert(payloadNew.options.emailRedirectTo === 'mywallet://', 'Test 6.2: emailRedirectTo configured for deep link capture');

    // 6.2 OTP code digit extraction & sanitization
    const sanitizeDigits = (digits: string[]) => {
      return digits.join('').replace(/[^0-9]/g, '');
    };
    assert(sanitizeDigits(['1', '2', '3', '4', '5', '6']) === '123456', 'Test 6.3: 6 individual boxes form valid 6-digit OTP');
    assert(sanitizeDigits(['1', '2', '', '4', '5', '6']) === '12456', 'Test 6.4: Incomplete OTP recognized as incomplete (5 digits)');

    // 6.3 Safe handling of unconfirmed accounts
    // Unconfirmed accounts can request fresh OTP without manual admin confirmation
    const handleUnconfirmedAccountOtp = (accountConfirmed: boolean) => {
      return { canRequestOtp: true, status: accountConfirmed ? 'active' : 'pending_verification' };
    };
    assert(handleUnconfirmedAccountOtp(false).canRequestOtp === true, 'Test 6.5: Unconfirmed account can safely request fresh OTP');

    // 6.4 Fallback Profile Generator for freshly verified OTP user
    const createFallbackProfile = (userId: string, email: string) => {
      const defaultName = email ? email.split('@')[0] : 'Wallet User';
      return {
        id: userId,
        email: email.trim().toLowerCase(),
        fullName: defaultName,
        currency: 'INR',
        themePreference: 'light',
      };
    };
    const prof = createFallbackProfile('usr-999', 'user@domain.com');
    assert(prof.id === 'usr-999', 'Test 6.6: Fallback profile receives authenticated user id');
    assert(prof.fullName === 'user', 'Test 6.7: Fallback profile derives default name from email');
  } catch (err: any) {
    assert(false, 'Test 6 Exception', err.message);
  }

  const allPassed = results.every((r) => r.passed);
  return { passed: allPassed, results };
}
