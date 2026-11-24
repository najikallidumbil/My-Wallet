import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '../types/database.types';

// Environment variable resolution supporting Expo and Web
const resolveEnvVar = (expoKey: string, viteKey: string): string => {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env[expoKey]) return process.env[expoKey] as string;
    if (process.env[viteKey]) return process.env[viteKey] as string;
  }
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env) {
      const val = (import.meta as any).env[viteKey];
      if (val) return val;
    }
  } catch {
    // Ignore in non-Vite environments
  }
  return '';
};

let cachedUrl = resolveEnvVar('EXPO_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL');
let cachedKey = resolveEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');

export const setCustomSupabaseCredentials = (url: string, key: string) => {
  cachedUrl = url.trim();
  cachedKey = key.trim();
  clientInstance = null;
};

export const getSupabaseConfig = () => {
  return {
    url: cachedUrl,
    anonKey: cachedKey,
  };
};

export const isSupabaseConfigured = (): boolean => {
  const url = cachedUrl;
  const key = cachedKey;
  return Boolean(
    url &&
    key &&
    !url.includes('your-project-id') &&
    !key.includes('your-anon-public-key') &&
    url.startsWith('https://')
  );
};

let clientInstance: SupabaseClient<Database> | null = null;

export const getSupabaseClient = (): SupabaseClient<Database> | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!clientInstance) {
    clientInstance = createClient<Database>(cachedUrl, cachedKey, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return clientInstance;
};

export const supabase = isSupabaseConfigured() ? getSupabaseClient() : null;
