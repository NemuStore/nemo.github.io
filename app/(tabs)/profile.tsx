import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Order, OrderItem } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import SweetAlert from '@/components/SweetAlert';

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const sweetAlert = useSweetAlert();
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      console.log('👤 Loading profile data...');
      
      // Add timeout
      timeoutId = setTimeout(() => {
        console.warn('⚠️ Profile load timeout');
        setLoading(false);
        setRefreshing(false);
      }, 10000);
      
      // Get user ID from localStorage (faster and more reliable on web)
      console.log('🔐 Getting user...');
      let userId: string | null = null;
      
      if (typeof window !== 'undefined') {
        try {
          // Try to find Supabase session in localStorage
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
          const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default';
          const storageKey = `sb-${projectRef}-auth-token`;
          
          const tokenData = localStorage.getItem(storageKey);
          if (tokenData) {
            try {
              const parsed = JSON.parse(tokenData);
              userId = parsed?.user?.id || parsed?.currentSession?.user?.id;
              if (userId) {
                console.log('✅ Got user from localStorage:', userId);
              }
            } catch (e) {
              console.log('⚠️ Could not parse localStorage token');
            }
          }
          
          // Fallback: search all localStorage keys
          if (!userId) {
            const allKeys = Object.keys(localStorage);
            for (const key of allKeys) {
              if (key.includes('supabase') || key.includes('auth')) {
                try {
                  const data = localStorage.getItem(key);
                  if (data) {
                    const parsed = JSON.parse(data);
                    userId = parsed?.user?.id || parsed?.currentSession?.user?.id || parsed?.session?.user?.id;
                    if (userId) {
                      console.log('✅ Got user from localStorage key:', key);
                      break;
                    }
                  }
                } catch (e) {
                  // Continue searching
                }
              }
            }
          }
        } catch (e) {
          console.log('⚠️ Error reading localStorage:', e);
        }
      }
      
      // Fallback: Try getSession with timeout
      if (!userId) {
        console.log('⚠️ No user in localStorage, trying getSession...');
        try {
          const sessionPromise = supabase.auth.getSession();
          const sessionTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session timeout')), 2000)
          );
          
          const sessionResult = await Promise.race([sessionPromise, sessionTimeout]) as any;
          userId = sessionResult?.data?.session?.user?.id;
          if (userId) {
            console.log('✅ Got user from getSession:', userId);
          }
        } catch (sessionError) {
          console.log('⚠️ getSession timeout');
        }
      }
      
      if (!userId) {
        console.log('❌ No auth user, redirecting to auth');
        if (timeoutId) clearTimeout(timeoutId);
        router.push('/auth');
        return;
      }

      console.log('✅ Auth user found:', userId);
      // Use fetch for web compatibility
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      // Get access_token from localStorage
      let accessToken = supabaseKey || '';
      if (typeof window !== 'undefined') {
        try {
          const supabaseUrlForStorage = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
          const projectRef = supabaseUrlForStorage.split('//')[1]?.split('.')[0] || 'default';
          const storageKey = `sb-${projectRef}-auth-token`;
          const tokenData = localStorage.getItem(storageKey);
          if (tokenData) {
            const parsed = JSON.parse(tokenData);
            accessToken = parsed?.access_token || supabaseKey || '';
          }
        } catch (e) {
          console.log('⚠️ Could not get access_token from localStorage');
        }
      }
      
      // Get user data
      console.log('📡 Fetching user data...');
      const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}&select=*`, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`, // Use access_token for RLS
          'Content-Type': 'application/json',
        }
      });
      
      console.log('📡 User response status:', userResponse.status);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log('✅ User data loaded:', userData.length, 'users');
        setUser(userData[0] || null);
      } else {
        const errorText = await userResponse.text();
        console.error('❌ User fetch error:', errorText);
      }

      // Load orders
      console.log('📡 Fetching orders...');
      const ordersResponse = await fetch(`${supabaseUrl}/rest/v1/orders?user_id=eq.${userId}&select=*&order=created_at.desc`, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`, // Use access_token for RLS
          'Content-Type': 'application/json',
        }
      });

      console.log('📡 Orders response status:', ordersResponse.status);
      if (ordersResponse.ok) {
        const orders = await ordersResponse.json();
        console.log('✅ Orders loaded:', orders.length, 'orders');
        const pending = orders.filter(
          (o: Order) => !['delivered', 'cancelled'].includes(o.status)
        );
        const delivered = orders.filter((o: Order) => o.status === 'delivered');
        setPendingOrders(pending);
        setDeliveredOrders(delivered);
      } else {
        const errorText = await ordersResponse.text();
        console.error('❌ Orders fetch error:', errorText);
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      console.log('✅ Loading finished');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'قيد الانتظار',
      confirmed: 'تم التأكيد',
      shipped_from_china: 'شُحنت من الصين',
      received_in_uae: 'وصلت الإمارات',
      shipped_from_uae: 'شُحنت من الإمارات',
      received_in_egypt: 'وصلت مصر',
      in_warehouse: 'في المخزن',
      out_for_delivery: 'قيد التوصيل',
      delivered: 'تم التسليم',
      cancelled: 'ملغي',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    if (status === 'delivered') return '#4CAF50';
    if (status === 'cancelled') return '#f44336';
    if (status === 'in_warehouse' || status === 'out_for_delivery') return '#2196F3';
    return '#FF9800';
  };

  const performLogout = async () => {
    try {
      console.log('🚪 Logging out...');
      
      // Clear localStorage on web
      if (typeof window !== 'undefined') {
        try {
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
          const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default';
          const storageKey = `sb-${projectRef}-auth-token`;
          
          // Remove Supabase auth token
          localStorage.removeItem(storageKey);
          
          // Remove all Supabase-related keys
          const allKeys = Object.keys(localStorage);
          for (const key of allKeys) {
            if (key.includes('supabase') || key.includes('auth')) {
              localStorage.removeItem(key);
            }
          }
          
          console.log('✅ localStorage cleared');
        } catch (e) {
          console.error('⚠️ Error clearing localStorage:', e);
        }
      }
      
      // Try to sign out from Supabase (may timeout on web)
      try {
        const signOutPromise = supabase.auth.signOut();
        const signOutTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sign out timeout')), 2000)
        );
        
        await Promise.race([signOutPromise, signOutTimeout]);
        console.log('✅ Supabase sign out successful');
      } catch (signOutError) {
        console.warn('⚠️ Supabase sign out timeout, but continuing...');
      }
      
      // Redirect to auth page
      router.replace('/auth');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Redirect anyway
      router.replace('/auth');
    }
  };

  const handleLogout = () => {
    sweetAlert.showConfirm('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', () => {
      performLogout();
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#EE1C47" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text>يجب تسجيل الدخول</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/auth')}
        >
          <Text style={styles.loginButtonText}>تسجيل الدخول</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isWeb = Platform.OS === 'web';
  const { width } = Dimensions.get('window');
  const maxContentWidth = isWeb ? 1000 : width;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={[styles.contentWrapper, { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
        {/* User Info */}
        <View style={styles.userSection}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="#EE1C47" />
        </View>
        <Text style={styles.userName}>{user.full_name || user.email}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        {user.phone && <Text style={styles.userPhone}>{user.phone}</Text>}
        {user.address && <Text style={styles.userAddress}>{user.address}</Text>}
      </View>

      {/* Pending Orders */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الطلبات القادمة</Text>
        {pendingOrders.length === 0 ? (
          <Text style={styles.emptyText}>لا توجد طلبات قادمة</Text>
        ) : (
          pendingOrders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderNumber}>#{order.order_number}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(order.status) },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {getStatusText(order.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.orderAmount}>
                {order.total_amount.toFixed(2)} ج.م
              </Text>
              {order.estimated_delivery_days && (
                <Text style={styles.deliveryInfo}>
                  متوقع الوصول خلال {order.estimated_delivery_days} أيام
                </Text>
              )}
            </View>
          ))
        )}
      </View>

      {/* Delivered Orders */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الطلبات المستلمة</Text>
        {deliveredOrders.length === 0 ? (
          <Text style={styles.emptyText}>لا توجد طلبات مستلمة</Text>
        ) : (
          deliveredOrders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderNumber}>#{order.order_number}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(order.status) },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {getStatusText(order.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.orderAmount}>
                {order.total_amount.toFixed(2)} ج.م
              </Text>
            </View>
          ))
        )}
      </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </View>
      {sweetAlert.alert.options && (
        <SweetAlert
          visible={sweetAlert.alert.visible}
          type={sweetAlert.alert.options.type}
          title={sweetAlert.alert.options.title}
          message={sweetAlert.alert.options.message}
          confirmText={sweetAlert.alert.options.confirmText}
          cancelText={sweetAlert.alert.options.cancelText}
          onConfirm={sweetAlert.alert.options.onConfirm}
          onCancel={sweetAlert.alert.options.onCancel}
          onClose={sweetAlert.hideAlert}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: Platform.OS === 'web' ? 20 : 0,
  },
  contentWrapper: {
    padding: Platform.OS === 'web' ? 0 : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  userSection: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  userAddress: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 20,
  },
  orderCard: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EE1C47',
    marginBottom: 5,
  },
  deliveryInfo: {
    fontSize: 12,
    color: '#666',
  },
  loginButton: {
    backgroundColor: '#EE1C47',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#f44336',
    margin: 20,
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

