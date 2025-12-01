import Constants from 'expo-constants';

/**
 * Get environment variables from process.env (development/web) or Constants.expoConfig.extra (production/APK)
 * This ensures environment variables work in both development and production builds
 */
export const getEnvVar = (key: string): string => {
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

/**
 * Get Supabase URL
 */
export const getSupabaseUrl = (): string => {
  return getEnvVar('EXPO_PUBLIC_SUPABASE_URL');
};

/**
 * Get Supabase Anon Key
 */
export const getSupabaseAnonKey = (): string => {
  return getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');
};

/**
 * Get ImgBB API Key
 */
export const getImgbbApiKey = (): string => {
  return getEnvVar('EXPO_PUBLIC_IMGBB_API_KEY');
};

