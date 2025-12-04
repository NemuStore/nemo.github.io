import 'dotenv/config';

export default {
  expo: {
    name: 'Nemu',
    slug: 'nemu',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    splash: {
      resizeMode: 'contain',
      backgroundColor: '#EE1C47',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.nemu.app',
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#EE1C47',
      },
      package: 'com.nemu.app',
      permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
    },
    web: {
      bundler: 'metro',
      build: {
        babel: {
          include: ['@expo/vector-icons'],
        },
      },
    },
    plugins: [
      'expo-router',
      [
        'expo-notifications',
        {
          color: '#ffffff',
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'نحتاج موقعك لتوصيل الطلبات',
        },
      ],
    ],
    scheme: 'nemu',
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: '78b6347a-09fe-4958-9436-38fee73e802c',
      },
      // Include environment variables for Android APK
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://fdxxynnsxgiozaiiexlm.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkeHh5bm5zeGdpb3phaWlleGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MTUxMDcsImV4cCI6MjA3ODM5MTEwN30.1YW6uu973Zh0P3ElnCTyxdg4cqN7a1KAlyPJkup2fN8',
      EXPO_PUBLIC_IMGBB_API_KEY: process.env.EXPO_PUBLIC_IMGBB_API_KEY || 'cfbb69eef89f4ad826855a221bcde9ee',
    },
    owner: 'nemu700',
  },
};



