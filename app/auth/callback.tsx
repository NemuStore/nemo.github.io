import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    let isMounted = true;
    let hasHandled = false;
    
    const runCallback = async () => {
      if (isMounted && !hasHandled) {
        hasHandled = true;
        await handleAuthCallback();
      }
    };
    
    runCallback();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAuthCallback = async () => {
    try {
      console.log('🔐 Handling auth callback...');
      
      // For web, extract tokens from hash fragment
      if (typeof window !== 'undefined' && window.location.hash) {
        console.log('📝 Found hash fragment:', window.location.hash.substring(0, 50) + '...');
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');
        const error = hashParams.get('error');
        const error_description = hashParams.get('error_description');

        if (error) {
          console.error('❌ OAuth error:', error, error_description);
          router.replace('/auth');
          return;
        }

        if (access_token && refresh_token) {
          console.log('✅ Found tokens, setting session...');
          
          // Decode JWT to get user info without waiting for setSession
          try {
            const tokenParts = access_token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              const userId = payload.sub;
              const userEmail = payload.email;
              const userMetadata = payload.user_metadata || {};
              
              console.log('✅ Decoded user ID:', userId);
              
              // Save tokens to localStorage for Supabase
              if (typeof window !== 'undefined') {
                const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
                const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default';
                const storageKey = `sb-${projectRef}-auth-token`;
                
                const sessionData = {
                  access_token,
                  refresh_token,
                  expires_at: payload.exp,
                  expires_in: 3600,
                  token_type: 'bearer',
                  user: {
                    id: userId,
                    email: userEmail,
                    user_metadata: userMetadata,
                  }
                };
                
                localStorage.setItem(storageKey, JSON.stringify(sessionData));
                console.log('✅ Tokens saved to localStorage');
              }
              
              // Set session - this is critical for authentication
              console.log('🔐 Setting Supabase session...');
              let sessionSet = false;
              try {
                // Use Promise.race with timeout for setSession
                const setSessionPromise = supabase.auth.setSession({
                  access_token,
                  refresh_token,
                });
                
                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('setSession timeout')), 5000)
                );
                
                const result = await Promise.race([setSessionPromise, timeoutPromise]) as any;
                
                if (result?.error) {
                  console.error('❌ setSession error:', result.error);
                } else if (result?.data?.session) {
                  console.log('✅ Session set successfully, user ID:', result.data.session.user.id);
                  sessionSet = true;
                } else {
                  console.warn('⚠️ setSession returned no session data');
                }
              } catch (setSessionError: any) {
                console.error('❌ setSession exception:', setSessionError?.message || setSessionError);
                // Continue anyway - localStorage already has the tokens
                console.log('⚠️ Continuing despite setSession error - tokens are in localStorage');
              }
              
              // Verify session was set
              if (!sessionSet) {
                console.log('🔄 Verifying session after setSession...');
                try {
                  const verifyPromise = supabase.auth.getSession();
                  const verifyTimeout = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('getSession timeout')), 2000)
                  );
                  
                  const verifyResult = await Promise.race([verifyPromise, verifyTimeout]) as any;
                  if (verifyResult?.data?.session) {
                    console.log('✅ Session verified after setSession, user ID:', verifyResult.data.session.user.id);
                    sessionSet = true;
                  } else {
                    console.warn('⚠️ Session not found after setSession');
                  }
                } catch (verifyError) {
                  console.warn('⚠️ Could not verify session:', verifyError);
                }
              }
              
              // Use fetch to check/create user profile (faster on web)
              const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
              const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
              
              // Check if user profile exists
              console.log('📡 Checking user profile...');
              const checkResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}&select=*`, {
                headers: {
                  'apikey': supabaseKey || '',
                  'Authorization': `Bearer ${supabaseKey || ''}`,
                  'Content-Type': 'application/json',
                }
              });
              
              let userProfile = null;
              if (checkResponse.ok) {
                const userData = await checkResponse.json();
                userProfile = userData[0] || null;
                console.log('📡 User profile check result:', userProfile ? 'exists' : 'not found');
              } else {
                const errorText = await checkResponse.text();
                console.error('❌ User profile check error:', errorText);
              }

              if (!userProfile) {
                console.log('📝 Creating user profile...');
                const insertResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
                  method: 'POST',
                  headers: {
                    'apikey': supabaseKey || '',
                    'Authorization': `Bearer ${access_token}`, // Use access_token for RLS
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                  },
                  body: JSON.stringify({
                    id: userId,
                    email: userEmail || '',
                    full_name: userMetadata?.full_name || userEmail?.split('@')[0] || 'مستخدم',
                    role: 'customer', // دور افتراضي: مستخدم
                  })
                });

                if (insertResponse.ok) {
                  console.log('✅ User profile created');
                } else {
                  const errorText = await insertResponse.text();
                  const errorJson = JSON.parse(errorText);
                  // 409 means user already exists, which is fine
                  if (insertResponse.status === 409 || errorJson.code === '23505') {
                    console.log('✅ User profile already exists (409)');
                  } else {
                    console.error('❌ Profile creation error:', errorText);
                  }
                }
              } else {
                console.log('✅ User profile already exists');
              }
              
              // Wait a bit for session to be fully set
              console.log('⏳ Waiting for session to be fully set...');
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              // Final verification before redirect
              try {
                const finalCheckPromise = supabase.auth.getSession();
                const finalCheckTimeout = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Final check timeout')), 2000)
                );
                
                const finalCheck = await Promise.race([finalCheckPromise, finalCheckTimeout]) as any;
                if (finalCheck?.data?.session) {
                  console.log('✅ Final session check passed, user ID:', finalCheck.data.session.user.id);
                } else {
                  console.warn('⚠️ Final session check failed, but tokens are in localStorage');
                }
              } catch (finalError) {
                console.warn('⚠️ Final session check error:', finalError);
              }

              // Clear hash and redirect
              if (typeof window !== 'undefined') {
                window.history.replaceState(null, '', window.location.pathname);
              }
              console.log('🔄 Redirecting to tabs...');
              
              // Use router.replace instead of window.location to avoid full page reload
              setTimeout(() => {
                router.replace('/(tabs)');
              }, 300);
              return;
            }
          } catch (decodeError) {
            console.error('❌ Error decoding token:', decodeError);
            router.replace('/auth');
            return;
          }
        } else {
          console.log('⚠️ No tokens found in hash');
        }
      }

      // Fallback: try to get existing session
      console.log('🔄 Trying to get existing session...');
      const sessionPromise = supabase.auth.getSession();
      const sessionTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session timeout')), 3000)
      );
      
      let session = null;
      try {
        const sessionResult = await Promise.race([sessionPromise, sessionTimeout]) as any;
        session = sessionResult?.data?.session;
      } catch (sessionError) {
        console.error('❌ Get session error:', sessionError);
      }

      if (session) {
        console.log('✅ Found existing session, user ID:', session.user.id);
        
        // Use fetch to check/create user profile
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
        
        const checkResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${session.user.id}&select=*`, {
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${supabaseKey || ''}`,
            'Content-Type': 'application/json',
          }
        });
        
        let userProfile = null;
        if (checkResponse.ok) {
          const userData = await checkResponse.json();
          userProfile = userData[0] || null;
        }

        if (!userProfile) {
          console.log('📝 Creating user profile...');
          const insertResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
            method: 'POST',
            headers: {
              'apikey': supabaseKey || '',
              'Authorization': `Bearer ${session.access_token}`, // Use session access_token for RLS
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'مستخدم',
              role: 'customer',
            })
          });
          
          if (insertResponse.ok) {
            console.log('✅ User profile created');
          } else {
            const errorText = await insertResponse.text();
            const errorJson = JSON.parse(errorText);
            // 409 means user already exists, which is fine
            if (insertResponse.status === 409 || errorJson.code === '23505') {
              console.log('✅ User profile already exists (409)');
            } else {
              console.error('❌ Profile creation error:', errorText);
            }
          }
        }

        console.log('🔄 Redirecting to tabs...');
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 500);
      } else {
        console.log('⚠️ No session found, redirecting to auth...');
        router.replace('/auth');
      }
    } catch (error) {
      console.error('❌ Callback error:', error);
      router.replace('/auth');
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#EE1C47" />
      <Text style={styles.text}>جاري تسجيل الدخول...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
});

