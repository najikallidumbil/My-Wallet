import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  testSupabaseConnection,
  initSupabaseCredentials,
  setCustomSupabaseCredentials,
  clearCustomSupabaseCredentials,
} from '../lib/supabase';
import { UserProfile } from '../types';
import { sha256Hex } from '../lib/crypto';
import { storage } from '../lib/storage';
import * as Linking from 'expo-linking';

export type ConnectionStatus = 'connected' | 'not_configured' | 'error' | 'offline' | 'checking';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isConfigured: boolean;
  isGuestMode: boolean;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  latencyMs: number | null;
  projectDomain: string | null;
  sendOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
  requestRecoveryEmailOtp: (recoveryEmail: string) => Promise<{ success: boolean; error?: string; devOtp?: string }>;
  verifyRecoveryEmailOtp: (recoveryEmail: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  registeredMobile: string;
  setRegisteredMobile: (mobile: string) => Promise<{ success: boolean; error?: string }>;
  removeRegisteredMobile: () => Promise<{ success: boolean; error?: string }>;
  enableGuestMode: () => void;
  checkConnection: (url?: string, key?: string) => Promise<boolean>;
  saveCredentials: (url: string, key: string) => Promise<{ success: boolean; error?: string }>;
  resetCredentials: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_MODE_STORAGE_KEY = 'my_wallet_guest_mode_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [registeredMobile, setRegisteredMobileState] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);

  // Live Supabase Connection State
  const [isConfigured, setIsConfigured] = useState<boolean>(isSupabaseConfigured());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    isSupabaseConfigured() ? 'checking' : 'not_configured'
  );
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [projectDomain, setProjectDomain] = useState<string | null>(null);
  const [configVersion, setConfigVersion] = useState<number>(0);

  // Load user profile from Supabase
  const loadProfile = useCallback(async (userId: string) => {
    const client = getSupabaseClient() as any;
    if (!client) return;

    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching user profile:', error.message);
        return;
      }

      if (data) {
        setProfile({
          id: data.id,
          email: data.email,
          fullName: data.full_name,
          phone: data.phone || undefined,
          avatarUrl: data.avatar_url,
          currency: data.currency || 'INR',
          themePreference: data.theme_preference || 'light',
          recoveryEmail: data.recovery_email,
          recoveryEmailVerified: data.recovery_email_verified || false,
          recoveryEmailVerifiedAt: data.recovery_email_verified_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
        // Associate mobile strictly with this user's profile:
        setRegisteredMobileState(data.phone || '');
        if (data.phone) {
          storage.setItem(`my_wallet_user_mobile_${userId}`, data.phone).catch(console.warn);
        } else {
          storage.removeItem(`my_wallet_user_mobile_${userId}`).catch(console.warn);
        }
      } else {
        setRegisteredMobileState('');
        // Safe profile initialization for newly authenticated OTP users
        const { data: userData } = await client.auth.getUser();
        const currentEmail = userData?.user?.email || '';
        const defaultName = currentEmail ? currentEmail.split('@')[0] : 'Wallet User';
        const { data: newProfile } = await client
          .from('profiles')
          .insert({
            id: userId,
            email: currentEmail,
            full_name: defaultName,
            currency: 'INR',
            theme_preference: 'light',
          })
          .select()
          .single();

        if (newProfile) {
          setProfile({
            id: newProfile.id,
            email: newProfile.email,
            fullName: newProfile.full_name,
            avatarUrl: newProfile.avatar_url,
            currency: newProfile.currency || 'INR',
            themePreference: newProfile.theme_preference || 'light',
            recoveryEmail: newProfile.recovery_email,
            recoveryEmailVerified: newProfile.recovery_email_verified || false,
            recoveryEmailVerifiedAt: newProfile.recovery_email_verified_at,
            createdAt: newProfile.created_at,
            updatedAt: newProfile.updated_at,
          });
        }
      }
    } catch (err) {
      console.warn('Failed to load profile:', err);
    }
  }, []);

  // Run live network connection test
  const checkConnection = useCallback(async (url?: string, key?: string): Promise<boolean> => {
    setConnectionStatus('checking');
    setConnectionError(null);

    const res = await testSupabaseConnection(url, key);
    setConnectionStatus(res.status);
    setConnectionError(res.error || null);
    setLatencyMs(res.latencyMs || null);
    setProjectDomain(res.projectDomain || null);

    const configured = isSupabaseConfigured();
    setIsConfigured(configured);

    return res.success;
  }, []);

  // Initialize stored credentials, session and connection test with instant non-blocking launch
  useEffect(() => {
    let mounted = true;

    // Safety timeout: under no circumstances should the loading screen hang beyond 1000ms
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        setIsLoading(false);
      }
    }, 1000);

    async function initAuth() {
      try {
        // 1. Parallel local storage initialization (fast & offline-safe)
        const [_, guestVal] = await Promise.all([
          initSupabaseCredentials().catch((err) => console.warn('initSupabaseCredentials notice:', err)),
          storage.getItem(GUEST_MODE_STORAGE_KEY).catch(() => null),
          // Clean up legacy global phone key so it never leaks across accounts
          storage.removeItem('my_wallet_registered_mobile_v1').catch(() => null),
        ]);

        if (!mounted) return;

        const configured = isSupabaseConfigured();
        setIsConfigured(configured);

        if (guestVal === 'true') {
          setIsGuestMode(true);
        }

        if (!configured) {
          setConnectionStatus('not_configured');
          setIsLoading(false);
          clearTimeout(safetyTimer);
          return;
        }

        const client = getSupabaseClient();
        if (!client) {
          setIsLoading(false);
          clearTimeout(safetyTimer);
          return;
        }

        // 2. Instant Local Session Retrieval (Supabase reads from local AsyncStorage in < 15ms)
        try {
          const { data: { session: initialSession }, error } = await Promise.race([
            client.auth.getSession(),
            new Promise<{ data: { session: null }; error: null }>((resolve) =>
              setTimeout(() => resolve({ data: { session: null }, error: null }), 600)
            ),
          ]);

          if (error) {
            console.warn('[Auth] Session notice:', error.message);
          }

          if (mounted) {
            setSession(initialSession);
            setUser(initialSession?.user || null);

            // UNBLOCK APP STARTUP IMMEDIATELY! User enters app instantly without waiting for network pings
            setIsLoading(false);
            clearTimeout(safetyTimer);

            // Preload user's own isolated mobile from local storage while profile loads in background
            if (initialSession?.user) {
              storage.getItem(`my_wallet_user_mobile_${initialSession.user.id}`).then((storedPhone) => {
                if (storedPhone && mounted) {
                  setRegisteredMobileState(storedPhone);
                }
              }).catch(() => null);

              loadProfile(initialSession.user.id).catch((pErr) =>
                console.warn('[Auth] Background profile load notice:', pErr)
              );
            } else {
              setRegisteredMobileState('');
            }
          }
        } catch (sessErr) {
          console.warn('[Auth] Local session check error:', sessErr);
          if (mounted) {
            setIsLoading(false);
            clearTimeout(safetyTimer);
          }
        }

        // 3. Background Network Connection Check (Never blocks startup UI or causes "verifying" lag)
        testSupabaseConnection()
          .then((testRes) => {
            if (mounted) {
              setConnectionStatus(testRes.status);
              setConnectionError(testRes.error || null);
              setLatencyMs(testRes.latencyMs || null);
              setProjectDomain(testRes.projectDomain || null);
            }
          })
          .catch((connErr) => {
            if (mounted) {
              setConnectionStatus('offline');
              setConnectionError(connErr.message || 'Offline mode');
            }
          });

        // 4. Listen for auth changes
        const {
          data: { subscription },
        } = client.auth.onAuthStateChange(async (_event, newSession) => {
          if (!mounted) return;
          setSession(newSession);
          setUser(newSession?.user || null);

          if (newSession?.user) {
            loadProfile(newSession.user.id).catch(console.warn);
          } else {
            setProfile(null);
          }
        });

        // 5. Handle incoming deep links for magic link authentication
        const handleDeepLink = async (url: string | null) => {
          if (!url || !mounted) return;
          const currentClient = getSupabaseClient();
          if (!currentClient) return;

          try {
            const parsed = Linking.parse(url);
            const queryParams = (parsed.queryParams || {}) as Record<string, string>;

            // Parse hash params if present
            let hashParams: Record<string, string> = {};
            if (url.includes('#')) {
              const hashString = url.split('#')[1];
              hashString.split('&').forEach((part) => {
                const [k, v] = part.split('=');
                if (k && v) hashParams[decodeURIComponent(k)] = decodeURIComponent(v);
              });
            }

            const accessToken = hashParams.access_token || queryParams.access_token;
            const refreshToken = hashParams.refresh_token || queryParams.refresh_token;
            const code = queryParams.code || hashParams.code;

            if (accessToken && refreshToken) {
              const { data, error } = await currentClient.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (!error && data.session?.user && mounted) {
                setSession(data.session);
                setUser(data.session.user);
                loadProfile(data.session.user.id).catch(console.warn);
              }
            } else if (code) {
              const { data, error } = await (currentClient.auth as any).exchangeCodeForSession(code);
              if (!error && data.session?.user && mounted) {
                setSession(data.session);
                setUser(data.session.user);
                loadProfile(data.session.user.id).catch(console.warn);
              }
            }
          } catch (err) {
            console.warn('Error handling auth deep link:', err);
          }
        };

        Linking.getInitialURL().then(handleDeepLink);
        const linkSub = Linking.addEventListener('url', (event) => handleDeepLink(event.url));

        return () => {
          subscription.unsubscribe();
          linkSub.remove();
        };
      } catch (err) {
        console.warn('Auth initialization error:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
          clearTimeout(safetyTimer);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
    };
  }, [configVersion, loadProfile]);

  // Save new Supabase credentials at runtime
  const saveCredentials = async (
    url: string,
    key: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanUrl = url.trim();
    const cleanKey = key.trim();

    if (!cleanUrl.startsWith('https://')) {
      return { success: false, error: 'Supabase URL must start with https://' };
    }
    if (!cleanKey || cleanKey.length < 20) {
      return { success: false, error: 'Please enter a valid Supabase publishable/anon key.' };
    }

    // Test connection first
    setConnectionStatus('checking');
    const testResult = await testSupabaseConnection(cleanUrl, cleanKey);

    // Save to storage
    await setCustomSupabaseCredentials(cleanUrl, cleanKey);
    setIsConfigured(true);
    setConnectionStatus(testResult.status);
    setConnectionError(testResult.error || null);
    setLatencyMs(testResult.latencyMs || null);
    setProjectDomain(testResult.projectDomain || null);
    setConfigVersion((v) => v + 1);

    if (testResult.success) {
      return { success: true };
    }

    return {
      success: true, // Saved successfully, though network reported warning
      error: testResult.error,
    };
  };

  // Reset to environment defaults
  const resetCredentials = async (): Promise<void> => {
    await clearCustomSupabaseCredentials();
    setConfigVersion((v) => v + 1);
  };

  // Send Email OTP (Works for both new signup and existing user login)
  const sendOtp = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: 'Supabase credentials are not configured.' };
    }

    const redirectUrl =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'mywallet://';

    try {
      const { error } = await client.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        if (error.status === 429 || error.message.toLowerCase().includes('rate limit')) {
          return {
            success: false,
            error: 'Rate limit reached. Please wait 60 seconds before requesting a fresh OTP.',
          };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send OTP.' };
    }
  };

  // Verify Email OTP (Multi-type resilient verification)
  const verifyOtp = async (
    email: string,
    token: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedToken = token.trim();
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: 'Supabase is not configured.' };
    }

    try {
      // 1. Primary verification with type: 'email' (Supabase JS v2 standard)
      let { data, error } = await client.auth.verifyOtp({
        email: trimmedEmail,
        token: trimmedToken,
        type: 'email',
      });

      // 2. Fallback: try type: 'signup' if user was newly registered or unconfirmed
      if (error && (error.message.toLowerCase().includes('invalid') || error.message.toLowerCase().includes('expired'))) {
        try {
          const signupRes = await client.auth.verifyOtp({
            email: trimmedEmail,
            token: trimmedToken,
            type: 'signup',
          });
          if (!signupRes.error && signupRes.data?.session) {
            data = signupRes.data;
            error = null;
          }
        } catch (_) {}
      }

      // 3. Fallback: try type: 'magiclink' if existing confirmed user
      if (error && (error.message.toLowerCase().includes('invalid') || error.message.toLowerCase().includes('expired'))) {
        try {
          const magicRes = await client.auth.verifyOtp({
            email: trimmedEmail,
            token: trimmedToken,
            type: 'magiclink',
          });
          if (!magicRes.error && magicRes.data?.session) {
            data = magicRes.data;
            error = null;
          }
        } catch (_) {}
      }

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && data.session && data.user) {
        setSession(data.session);
        setUser(data.user);
        await loadProfile(data.user.id);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Invalid or expired OTP code.' };
    }
  };

  // Request secondary recovery email OTP
  const requestRecoveryEmailOtp = async (
    recoveryEmail: string
  ): Promise<{ success: boolean; error?: string; devOtp?: string }> => {
    const client = getSupabaseClient();
    if (!client || !user) {
      return { success: false, error: 'User is not authenticated.' };
    }

    const trimmed = recoveryEmail.trim().toLowerCase();
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await sha256Hex(generatedOtp);

    try {
      const { data, error } = await (client.rpc as any)('request_recovery_email_otp', {
        target_email: trimmed,
        hashed_otp: otpHash,
        valid_seconds: 600,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && data.success === false) {
        return { success: false, error: data.error || 'Failed to request OTP' };
      }

      return { success: true, devOtp: generatedOtp };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to process recovery OTP request' };
    }
  };

  // Verify secondary recovery email OTP
  const verifyRecoveryEmailOtp = async (
    recoveryEmail: string,
    otp: string
  ): Promise<{ success: boolean; error?: string }> => {
    const client = getSupabaseClient();
    if (!client || !user) {
      return { success: false, error: 'User is not authenticated.' };
    }

    const trimmedEmail = recoveryEmail.trim().toLowerCase();
    const otpHash = await sha256Hex(otp.trim());

    try {
      const { data, error } = await (client.rpc as any)('verify_recovery_email_otp', {
        target_email: trimmedEmail,
        candidate_otp_hash: otpHash,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && data.success === false) {
        return { success: false, error: data.error || 'Invalid OTP code' };
      }

      await loadProfile(user.id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Verification failed.' };
    }
  };

  // Sign out
  const signOut = async (): Promise<void> => {
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.warn('Sign out error:', err);
      }
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setRegisteredMobileState('');
    setIsGuestMode(false);
    await storage.removeItem(GUEST_MODE_STORAGE_KEY);
  };

  // Enable guest/offline mode
  const enableGuestMode = async () => {
    setIsGuestMode(true);
    await storage.setItem(GUEST_MODE_STORAGE_KEY, 'true');
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const setRegisteredMobile = useCallback(async (mobile: string): Promise<{ success: boolean; error?: string }> => {
    const cleaned = mobile.trim();
    if (!user) return { success: false, error: 'User is not signed in.' };

    setRegisteredMobileState(cleaned);
    setProfile((prev) => (prev ? { ...prev, phone: cleaned || undefined } : prev));

    if (cleaned) {
      await storage.setItem(`my_wallet_user_mobile_${user.id}`, cleaned);
    } else {
      await storage.removeItem(`my_wallet_user_mobile_${user.id}`);
    }

    const client = getSupabaseClient() as any;
    if (client) {
      try {
        const { error } = await client.from('profiles').update({ phone: cleaned || null }).eq('id', user.id);
        if (error) {
          console.warn('[Auth] Error updating mobile in Supabase profile:', error.message);
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.warn('[Auth] Network notice updating mobile:', err);
      }
    }
    return { success: true };
  }, [user]);

  const removeRegisteredMobile = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User is not signed in.' };

    setRegisteredMobileState('');
    setProfile((prev) => (prev ? { ...prev, phone: undefined } : prev));
    await storage.removeItem(`my_wallet_user_mobile_${user.id}`);

    const client = getSupabaseClient() as any;
    if (client) {
      try {
        const { error } = await client.from('profiles').update({ phone: null }).eq('id', user.id);
        if (error) {
          console.warn('[Auth] Error clearing mobile in Supabase profile:', error.message);
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.warn('[Auth] Network notice clearing mobile:', err);
      }
    }
    return { success: true };
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        registeredMobile,
        setRegisteredMobile,
        removeRegisteredMobile,
        isLoading,
        isConfigured,
        isGuestMode,
        connectionStatus,
        connectionError,
        latencyMs,
        projectDomain,
        sendOtp,
        verifyOtp,
        requestRecoveryEmailOtp,
        verifyRecoveryEmailOtp,
        signOut,
        refreshProfile,
        enableGuestMode,
        checkConnection,
        saveCredentials,
        resetCredentials,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
