import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Database } from '../types/database.types';

// Default Supabase production project credentials for My Wallet
// Ensures standalone APK always initializes properly even without local .env
export const DEFAULT_SUPABASE_URL = 'https://ruhifsmbgfhxoumfvoyl.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_6DUz-G2y2Ggw103rtR83aQ_yhmWPDo_';

// Safe universal storage adapter (supports React Native, Web, and Node.js testing/SSR)
const memoryStore = new Map<string, string>();
const isReactNativeOrWeb = typeof window !== 'undefined' || (typeof navigator !== 'undefined' && (navigator as any).product === 'ReactNative');

const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (isReactNativeOrWeb) {
        return await AsyncStorage.getItem(key);
      }
      return memoryStore.get(key) || null;
    } catch {
      return memoryStore.get(key) || null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (isReactNativeOrWeb) {
        await AsyncStorage.setItem(key, value);
      }
      memoryStore.set(key, value);
    } catch {
      memoryStore.set(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (isReactNativeOrWeb) {
        await AsyncStorage.removeItem(key);
      }
      memoryStore.delete(key);
    } catch {
      memoryStore.delete(key);
    }
  },
};

/**
 * Universal Supabase URL Resolution with multi-layer fallback:
 * 1. Direct static process.env.EXPO_PUBLIC_SUPABASE_URL (Inlined at bundle time by Babel/Metro)
 * 2. process.env.VITE_SUPABASE_URL / process.env.SUPABASE_URL
 * 3. Constants.expoConfig?.extra?.supabaseUrl (Baked into APK manifest via app.json)
 * 4. Vite import.meta.env
 * 5. Production project DEFAULT_SUPABASE_URL fallback
 */
function resolveSupabaseUrl(): string {
  // 1. Direct static access (Required for Babel/Metro inlining in Expo builds)
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_URL.startsWith('https://')) {
        return process.env.EXPO_PUBLIC_SUPABASE_URL.trim();
      }
      if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_URL.startsWith('https://')) {
        return process.env.VITE_SUPABASE_URL.trim();
      }
      if (process.env.SUPABASE_URL && process.env.SUPABASE_URL.startsWith('https://')) {
        return process.env.SUPABASE_URL.trim();
      }
    }
  } catch {}

  // 2. Expo Constants extra (Embedded into standalone APK manifest by app.json)
  try {
    const extra = Constants?.expoConfig?.extra || (Constants as any)?.manifest?.extra;
    if (extra?.supabaseUrl && typeof extra.supabaseUrl === 'string' && extra.supabaseUrl.startsWith('https://')) {
      return extra.supabaseUrl.trim();
    }
  } catch {}

  // 3. Vite import.meta.env
  try {
    const metaEnv = (new Function('try { return import.meta.env; } catch { return undefined; }'))();
    if (metaEnv?.EXPO_PUBLIC_SUPABASE_URL?.startsWith('https://')) {
      return metaEnv.EXPO_PUBLIC_SUPABASE_URL.trim();
    }
    if (metaEnv?.VITE_SUPABASE_URL?.startsWith('https://')) {
      return metaEnv.VITE_SUPABASE_URL.trim();
    }
  } catch {}

  // 4. Default production project fallback
  return DEFAULT_SUPABASE_URL;
}

/**
 * Universal Supabase Key Resolution with multi-layer fallback:
 * 1. Direct static process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY / PUBLISHABLE_KEY
 * 2. Constants.expoConfig?.extra?.supabaseAnonKey / supabasePublishableKey
 * 3. Vite import.meta.env
 * 4. Production project DEFAULT_SUPABASE_ANON_KEY fallback
 */
function resolveSupabaseKey(): string {
  // 1. Direct static access (Required for Babel/Metro inlining in Expo builds)
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.length >= 20) {
        return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.trim();
      }
      if (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY && process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.length >= 20) {
        return process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.trim();
      }
      if (process.env.VITE_SUPABASE_ANON_KEY && process.env.VITE_SUPABASE_ANON_KEY.length >= 20) {
        return process.env.VITE_SUPABASE_ANON_KEY.trim();
      }
      if (process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY.length >= 20) {
        return process.env.SUPABASE_ANON_KEY.trim();
      }
    }
  } catch {}

  // 2. Expo Constants extra (Embedded into standalone APK manifest by app.json)
  try {
    const extra = Constants?.expoConfig?.extra || (Constants as any)?.manifest?.extra;
    const extraKey = extra?.supabaseAnonKey || extra?.supabasePublishableKey;
    if (extraKey && typeof extraKey === 'string' && extraKey.length >= 20) {
      return extraKey.trim();
    }
  } catch {}

  // 3. Vite import.meta.env
  try {
    const metaEnv = (new Function('try { return import.meta.env; } catch { return undefined; }'))();
    if (metaEnv?.EXPO_PUBLIC_SUPABASE_ANON_KEY?.length >= 20) {
      return metaEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY.trim();
    }
    if (metaEnv?.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.length >= 20) {
      return metaEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.trim();
    }
    if (metaEnv?.VITE_SUPABASE_ANON_KEY?.length >= 20) {
      return metaEnv.VITE_SUPABASE_ANON_KEY.trim();
    }
  } catch {}

  // 4. Default production project fallback
  return DEFAULT_SUPABASE_ANON_KEY;
}

const STORAGE_KEY_URL = 'my_wallet_supabase_custom_url';
const STORAGE_KEY_KEY = 'my_wallet_supabase_custom_anon_key';

// Initial resolution from environment variables & defaults
const defaultEnvUrl = resolveSupabaseUrl();
const defaultEnvKey = resolveSupabaseKey();

let cachedUrl = defaultEnvUrl;
let cachedKey = defaultEnvKey;
let isUsingCustomCredentials = false;
let clientInstance: SupabaseClient<Database> | null = null;

/**
 * Initialize custom credentials stored in AsyncStorage (if previously saved)
 */
export const initSupabaseCredentials = async (): Promise<void> => {
  try {
    const [storedUrl, storedKey] = await Promise.all([
      safeStorage.getItem(STORAGE_KEY_URL),
      safeStorage.getItem(STORAGE_KEY_KEY),
    ]);

    if (storedUrl && storedKey && storedUrl.startsWith('https://') && storedKey.length >= 20) {
      cachedUrl = storedUrl.trim();
      cachedKey = storedKey.trim();
      isUsingCustomCredentials = true;
      clientInstance = null;
    }
  } catch (err) {
    console.warn('Failed to load stored Supabase credentials:', err);
  }
};

/**
 * Save runtime Supabase credentials (stored securely in AsyncStorage, never browser localStorage)
 */
export const setCustomSupabaseCredentials = async (url: string, key: string): Promise<void> => {
  cachedUrl = url.trim();
  cachedKey = key.trim();
  isUsingCustomCredentials = true;
  clientInstance = null;

  try {
    await safeStorage.setItem(STORAGE_KEY_URL, cachedUrl);
    await safeStorage.setItem(STORAGE_KEY_KEY, cachedKey);
  } catch (err) {
    console.warn('Failed to persist custom Supabase credentials:', err);
  }
};

/**
 * Clear custom credentials and revert back to environment variables
 */
export const clearCustomSupabaseCredentials = async (): Promise<void> => {
  cachedUrl = defaultEnvUrl;
  cachedKey = defaultEnvKey;
  isUsingCustomCredentials = false;
  clientInstance = null;

  try {
    await safeStorage.removeItem(STORAGE_KEY_URL);
    await safeStorage.removeItem(STORAGE_KEY_KEY);
  } catch (err) {
    console.warn('Failed to clear custom Supabase credentials:', err);
  }
};

export const getSupabaseConfig = () => {
  return {
    url: cachedUrl,
    anonKey: cachedKey,
    isCustom: isUsingCustomCredentials,
    hasEnvDefaults: Boolean(defaultEnvUrl && defaultEnvKey),
  };
};

/**
 * Check if the current credentials form a valid, non-placeholder Supabase configuration
 */
export const isSupabaseConfigured = (): boolean => {
  const url = cachedUrl;
  const key = cachedKey;
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

/**
 * Get or create the singleton Supabase client instance
 */
export const getSupabaseClient = (): SupabaseClient<Database> | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!clientInstance) {
    clientInstance = createClient<Database>(cachedUrl, cachedKey, {
      auth: {
        storage: safeStorage as any,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return clientInstance;
};

export interface ConnectionTestResult {
  success: boolean;
  status: 'connected' | 'not_configured' | 'error' | 'offline';
  error?: string;
  latencyMs?: number;
  projectDomain?: string;
}

/**
 * Live connection test to Supabase (does not claim 'connected' without actual network verification)
 */
export const testSupabaseConnection = async (
  testUrl?: string,
  testKey?: string
): Promise<ConnectionTestResult> => {
  const rawUrl = (testUrl ?? cachedUrl ?? '').trim();
  const rawKey = (testKey ?? cachedKey ?? '').trim();

  if (!rawUrl || !rawKey) {
    return {
      success: false,
      status: 'not_configured',
      error: 'Supabase credentials are not configured.',
    };
  }

  if (!rawUrl.startsWith('https://')) {
    return {
      success: false,
      status: 'error',
      error: 'Project URL must start with https://',
    };
  }

  if (rawKey.length < 20) {
    return {
      success: false,
      status: 'error',
      error: 'Supabase publishable or anon key is too short or invalid.',
    };
  }

  const cleanUrl = rawUrl.replace(/\/+$/, '');
  const projectDomain = cleanUrl.replace('https://', '');

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    // 1. Check Auth health endpoint with the apikey header
    const authRes = await fetch(`${cleanUrl}/auth/v1/health`, {
      method: 'GET',
      headers: {
        apikey: rawKey,
      },
      signal: controller.signal,
    }).catch((e) => {
      if (e.name === 'AbortError') throw e;
      return null;
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (authRes && authRes.ok) {
      return {
        success: true,
        status: 'connected',
        latencyMs,
        projectDomain,
      };
    }

    if (authRes && (authRes.status === 401 || authRes.status === 403)) {
      return {
        success: false,
        status: 'error',
        error: 'Invalid Supabase API key (401 Unauthorized). Verify your publishable/anon key.',
        projectDomain,
      };
    }

    // 2. Direct client session verification fallback
    const tempClient = createClient(cleanUrl, rawKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: sessionError } = await tempClient.auth.getSession();
    if (!sessionError) {
      return {
        success: true,
        status: 'connected',
        latencyMs,
        projectDomain,
      };
    }

    return {
      success: false,
      status: 'offline',
      error: sessionError.message || 'Cannot reach Supabase. Check your network or URL.',
      projectDomain,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        status: 'offline',
        error: 'Connection timed out (8s). Check your internet connection or URL.',
        projectDomain,
      };
    }
    const msg = err.message || '';
    if (
      msg.includes('Network') ||
      msg.includes('Failed to fetch') ||
      msg.includes('ENOTFOUND') ||
      msg.includes('TypeError: fetch failed')
    ) {
      return {
        success: false,
        status: 'offline',
        error: 'Network request failed. Check your internet connection or Project URL.',
        projectDomain,
      };
    }
    return {
      success: false,
      status: 'error',
      error: msg || 'Connection test failed.',
      projectDomain,
    };
  }
};

export const supabase = isSupabaseConfigured() ? getSupabaseClient() : null;
