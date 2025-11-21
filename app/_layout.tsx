import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { CartProvider } from '@/contexts/CartContext';
import { DarkModeProvider } from '@/contexts/DarkModeContext';
import * as Linking from 'expo-linking';
import { useRouter, useSegments } from 'expo-router';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Initialize Supabase session and ensure user profile exists
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Check if user profile exists
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!userProfile && !profileError) {
          // Create user profile with default role 'customer'
          await supabase.from('users').insert({
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'مستخدم',
            role: 'customer', // دور افتراضي: مستخدم
          }).catch(console.error);
        }
      }
    }).catch(console.error);

    // Listen for auth state changes to create user profile automatically
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Ensure user profile exists when user signs in
        const { data: userProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!userProfile) {
          // Create user profile with default role 'customer'
          await supabase.from('users').insert({
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'مستخدم',
            role: 'customer', // دور افتراضي: مستخدم
          }).catch(console.error);
        }
      }
    });

    // Handle OAuth callback - Supabase handles this automatically for web
    // The callback page will handle the redirect

    // Listen for deep links (for mobile)
    const handleDeepLink = (event: { url: string }) => {
      try {
        const url = new URL(event.url);
        if (url.pathname === '/auth/callback') {
          // The callback page will handle this
          router.replace('/auth/callback');
        }
      } catch (error) {
        console.error('Deep link error:', error);
      }
    };

    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      authSubscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  return (
    <DarkModeProvider>
      <CartProvider>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="auth/callback" />
            <Stack.Screen name="product/[id]" />
          </Stack>
        </SafeAreaProvider>
      </CartProvider>
    </DarkModeProvider>
  );
}

