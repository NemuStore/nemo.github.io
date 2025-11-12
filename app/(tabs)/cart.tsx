import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Order } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useCart } from '@/contexts/CartContext';

export default function CartScreen() {
  const { cartItems, removeFromCart, updateQuantity, getTotal, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      console.log('👤 Cart: Loading user data...');
      let userId: string | null = null;
      let accessToken: string | null = null;
      
      // Try to get user from localStorage first (faster on web)
      if (typeof window !== 'undefined') {
        try {
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
          const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default';
          const storageKey = `sb-${projectRef}-auth-token`;
          const tokenData = localStorage.getItem(storageKey);
          
          if (tokenData) {
            try {
              const parsed = JSON.parse(tokenData);
              userId = parsed?.user?.id || parsed?.currentSession?.user?.id || parsed?.session?.user?.id;
              accessToken = parsed?.access_token || parsed?.currentSession?.access_token || parsed?.session?.access_token;
              
              if (userId) {
                console.log('✅ Cart: Got user from localStorage:', userId);
              }
            } catch (e) {
              console.log('⚠️ Cart: Error parsing localStorage token');
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
                    accessToken = parsed?.access_token || parsed?.currentSession?.access_token || parsed?.session?.access_token;
                    if (userId) {
                      console.log('✅ Cart: Got user from localStorage key:', key);
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
          console.log('⚠️ Cart: Error reading localStorage:', e);
        }
      }
      
      // Fallback: Try getSession with timeout
      if (!userId) {
        console.log('⚠️ Cart: No user in localStorage, trying getSession...');
        try {
          const sessionPromise = supabase.auth.getSession();
          const sessionTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session timeout')), 2000)
          );
          
          const sessionResult = await Promise.race([sessionPromise, sessionTimeout]) as any;
          userId = sessionResult?.data?.session?.user?.id;
          accessToken = sessionResult?.data?.session?.access_token;
          if (userId) {
            console.log('✅ Cart: Got user from getSession:', userId);
          }
        } catch (sessionError) {
          console.log('⚠️ Cart: getSession timeout');
        }
      }
      
      if (!userId) {
        console.log('❌ Cart: No auth user found');
        setUser(null);
        return;
      }

      console.log('✅ Cart: Auth user found:', userId);
      
      // Use fetch for web compatibility
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      // Use access_token if available, otherwise use anon key
      const authToken = accessToken || supabaseKey || '';
      
      console.log('📡 Cart: Fetching user data...');
      const response = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}&select=*`, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        }
      });
      
      console.log('📡 Cart: User response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Cart: User data loaded:', data.length > 0 ? data[0].full_name : 'No user');
        if (data && data.length > 0) {
          setUser(data[0]);
        } else {
          setUser(null);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Cart: User fetch error:', errorText);
        setUser(null);
      }
    } catch (error: any) {
      console.error('❌ Cart: Error loading user:', error);
      setUser(null);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      console.log('✅ Cart: Loading finished');
    }
  };

  const getLocation = async () => {
    try {
      // On web, location may not be available or needed
      if (Platform.OS === 'web') {
        return null; // Skip location on web for now
      }
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('⚠️ Location permission not granted');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({});
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  };

  const confirmOrder = async () => {
    if (!user) {
      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        window.alert('يجب تسجيل الدخول أولاً');
      } else {
        Alert.alert('خطأ', 'يجب تسجيل الدخول أولاً');
      }
      router.push('/auth');
      return;
    }

    if (cartItems.length === 0) {
      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        window.alert('السلة فارغة');
      } else {
        Alert.alert('خطأ', 'السلة فارغة');
      }
      return;
    }

    setLoading(true);

    try {
      console.log('🛒 Cart: Starting order creation...');
      
      // Get location (optional)
      const location = await getLocation();
      
      // Get address from user
      let address = user.address || 'عنوان غير محدد';
      
      // Calculate total amount
      const total_amount = cartItems.reduce((sum, item) => {
        return sum + (item.product.price * item.quantity);
      }, 0);
      
      console.log('💰 Cart: Total amount:', total_amount);
      
      // Generate order number
      const order_number = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('📝 Cart: Order number:', order_number);
      
      // Get access_token from localStorage
      let accessToken = '';
      if (typeof window !== 'undefined') {
        try {
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
          const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default';
          const storageKey = `sb-${projectRef}-auth-token`;
          const tokenData = localStorage.getItem(storageKey);
          if (tokenData) {
            const parsed = JSON.parse(tokenData);
            accessToken = parsed?.access_token || parsed?.currentSession?.access_token || parsed?.session?.access_token || '';
          }
        } catch (e) {
          console.log('⚠️ Cart: Error getting access_token');
        }
      }
      
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const authToken = accessToken || supabaseKey || '';
      
      // Create order directly using fetch
      console.log('📡 Cart: Creating order...');
      const orderResponse = await fetch(`${supabaseUrl}/rest/v1/orders`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: user.id,
          order_number,
          status: 'pending',
          total_amount,
          shipping_address: address,
          latitude: location?.latitude || null,
          longitude: location?.longitude || null,
        })
      });
      
      console.log('📡 Cart: Order response status:', orderResponse.status);
      
      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error('❌ Cart: Order creation error:', errorText);
        throw new Error(errorText || 'فشل إنشاء الطلب');
      }
      
      const orderData = await orderResponse.json();
      const order = Array.isArray(orderData) ? orderData[0] : orderData;
      console.log('✅ Cart: Order created:', order.id);
      
      // Create order items
      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
      }));
      
      console.log('📦 Cart: Creating order items...');
      const itemsResponse = await fetch(`${supabaseUrl}/rest/v1/order_items`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(orderItems)
      });
      
      console.log('📡 Cart: Order items response status:', itemsResponse.status);
      
      if (!itemsResponse.ok) {
        const errorText = await itemsResponse.text();
        console.error('❌ Cart: Order items creation error:', errorText);
        throw new Error('فشل إضافة عناصر الطلب');
      }
      
      console.log('✅ Cart: Order created successfully!');
      
      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        if (window.confirm('تم إنشاء الطلب بنجاح! هل تريد الذهاب إلى صفحة الملف الشخصي؟')) {
          clearCart();
          router.push('/(tabs)/profile');
        } else {
          clearCart();
        }
      } else {
        Alert.alert('نجح', 'تم إنشاء الطلب بنجاح', [
          {
            text: 'موافق',
            onPress: () => {
              clearCart();
              router.push('/(tabs)/profile');
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error('❌ Cart: Error creating order:', error);
      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        window.alert(error.message || 'فشل إنشاء الطلب');
      } else {
        Alert.alert('خطأ', error.message || 'فشل إنشاء الطلب');
      }
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={80} color="#ccc" />
        <Text style={styles.emptyText}>السلة فارغة</Text>
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.shopButtonText}>تسوق الآن</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isWeb = Platform.OS === 'web';
  const { width } = Dimensions.get('window');
  const maxContentWidth = isWeb ? 1000 : width;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.cartItemsContainer, { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
          {cartItems.map((item) => (
            <View key={item.product.id} style={styles.cartItem}>
            <Image
              source={{ uri: item.product.image_url }}
              style={styles.itemImage}
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.product.name}</Text>
              <Text style={styles.itemPrice}>
                {item.product.price.toFixed(2)} ج.م
              </Text>
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                >
                  <Ionicons name="remove" size={20} color="#EE1C47" />
                </TouchableOpacity>
                <Text style={styles.quantity}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                >
                  <Ionicons name="add" size={20} color="#EE1C47" />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeFromCart(item.product.id)}
            >
              <Ionicons name="trash-outline" size={20} color="#ff4444" />
            </TouchableOpacity>
          </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, isWeb && styles.footerWeb]}>
        <View style={[styles.footerContent, { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>الإجمالي:</Text>
          <Text style={styles.totalAmount}>{getTotal().toFixed(2)} ج.م</Text>
        </View>
        <TouchableOpacity
          style={[styles.confirmButton, loading && styles.confirmButtonDisabled]}
          onPress={confirmOrder}
          disabled={loading}
        >
          <Text style={styles.confirmButtonText}>
            {loading ? 'جاري المعالجة...' : 'تأكيد الطلب'}
          </Text>
        </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Platform.OS === 'web' ? 20 : 0,
  },
  cartItemsContainer: {
    padding: Platform.OS === 'web' ? 0 : 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
    marginBottom: 30,
  },
  shopButton: {
    backgroundColor: '#EE1C47',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 10,
    padding: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  itemPrice: {
    fontSize: 14,
    color: '#EE1C47',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EE1C47',
    borderRadius: 15,
  },
  quantity: {
    marginHorizontal: 15,
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    justifyContent: 'center',
    padding: 5,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  footerWeb: {
    padding: 20,
  },
  footerContent: {
    padding: 0,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EE1C47',
  },
  confirmButton: {
    backgroundColor: '#EE1C47',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

