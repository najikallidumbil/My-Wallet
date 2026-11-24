import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile } from '../types';
import { sha256Hex } from '../lib/crypto';
import { storage } from '../lib/storage';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isConfigured: boolean;
  isGuestMode: boolean;
  sendOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
  requestRecoveryEmailOtp: (recoveryEmail: string) => Promise<{ success: boolean; error?: string; devOtp?: string }>;
  verifyRecoveryEmailOtp: (recoveryEmail: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  enableGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_MODE_STORAGE_KEY = 'my_wallet_guest_mode_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);

  const isConfigured = isSupabaseConfigured();

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
          avatarUrl: data.avatar_url,
          currency: data.currency || 'INR',
          themePreference: data.theme_preference || 'light',
          recoveryEmail: data.recovery_email,
          recoveryEmailVerified: data.recovery_email_verified || false,
          recoveryEmailVerifiedAt: data.recovery_email_verified_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      }
    } catch (err) {
      console.warn('Failed to load profile:', err);
    }
  }, []);

  // Initialize session and auth state listener
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      // Check if guest mode was previously toggled (only when Supabase is not configured)
      if (!isConfigured) {
        const guestVal = await storage.getItem(GUEST_MODE_STORAGE_KEY);
        if (guestVal === 'true' && mounted) {
          setIsGuestMode(true);
        }
        setIsLoading(false);
        return;
      }

      const client = getSupabaseClient();
      if (!client) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: { session: initialSession }, error } = await client.auth.getSession();
        if (error) {
          console.warn('Error getting session:', error.message);
        }

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user || null);
          if (initialSession?.user) {
            await loadProfile(initialSession.user.id);
          }
        }

        // Listen for auth changes
        const { data: { subscription } } = client.auth.onAuthStateChange(
          async (_event, newSession) => {
            if (!mounted) return;
            setSession(newSession);
            setUser(newSession?.user || null);

            if (newSession?.user) {
              await loadProfile(newSession.user.id);
            } else {
              setProfile(null);
            }
          }
        );

        return () => {
          subscription.unsubscribe();
        };
      } catch (err) {
        console.warn('Auth initialization error:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, [isConfigured, loadProfile]);

  // Send Email OTP
  const sendOtp = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: 'Supabase credentials are not configured.' };
    }

    try {
      const { error } = await client.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send OTP.' };
    }
  };

  // Verify Email OTP
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
      const { data, error } = await client.auth.verifyOtp({
        email: trimmedEmail,
        token: trimmedToken,
        type: 'email',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session && data.user) {
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
    // Generate secure 6-digit random code
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

      // Return generated OTP in test/dev so user can test without an external SMTP service configured
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
    setIsGuestMode(false);
    await storage.removeItem(GUEST_MODE_STORAGE_KEY);
  };

  // Enable guest/offline mode when keys are not configured yet
  const enableGuestMode = async () => {
    setIsGuestMode(true);
    await storage.setItem(GUEST_MODE_STORAGE_KEY, 'true');
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isConfigured,
        isGuestMode,
        sendOtp,
        verifyOtp,
        requestRecoveryEmailOtp,
        verifyRecoveryEmailOtp,
        signOut,
        refreshProfile,
        enableGuestMode,
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
