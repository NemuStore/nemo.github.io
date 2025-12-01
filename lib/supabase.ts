import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get environment variables from process.env (development) or Constants.expoConfig.extra (production/APK)
const getEnvVar = (key: string): string => {
  // Try process.env first (for development/web)
  if (process.env[key]) {
    return process.env[key] || '';
  }
  // Try Constants.expoConfig.extra (for production/APK)
  if (Constants.expoConfig?.extra?.[key]) {
    return Constants.expoConfig.extra[key] || '';
  }
  return '';
};

const supabaseUrl = getEnvVar('EXPO_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file or app.config.js.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Enable to detect session from URL hash
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'sb-auth-token',
  },
});

