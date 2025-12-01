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
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Order } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useCart } from '@/contexts/CartContext';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import SweetAlert from '@/components/SweetAlert';
import { SkeletonCard } from '@/components/SkeletonCard';

export default function CartScreen() {
  const { cartItems, removeFromCart, updateQuantity, getTotal, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [variantImages, setVariantImages] = useState<Record<string, string>>({}); // variant_id -> image_url
  const [productImages, setProductImages] = useState<Record<string, string>>({}); // product_id -> primary_image_url
  const router = useRouter();
  const sweetAlert = useSweetAlert();

  useEffect(() => {
    loadUser();
    const loadAllImages = async () => {
      setImagesLoading(true);
      await Promise.all([loadVariantImages(), loadProductImages()]);
      setImagesLoading(false);
    };
    loadAllImages();
  }, [cartItems]);

  const loadVariantImages = async () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const imagesMap: Record<string, string> = {};
    
    // Get all unique variant_ids from cart items
    const variantIds = cartItems
      .map(item => (item.product as any).variant_id)
      .filter((id): id is string => Boolean(id));
    
    if (variantIds.length === 0) {
      return;
    }
    
    try {
      // Load images for all variants at once
      const variantIdConditions = variantIds.map(id => `variant_id.eq.${id}`).join(',');
      const response = await fetch(
        `${supabaseUrl}/rest/v1/product_images?or=(${variantIdConditions})&order=display_order.asc,is_primary.desc&limit=100`,
        {
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${supabaseKey || ''}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (response.ok) {
        const imagesData = await response.json();
        // Map variant_id to first image_url
        imagesData.forEach((img: any) => {
          if (img.variant_id && !imagesMap[img.variant_id]) {
            imagesMap[img.variant_id] = img.image_url;
          }
        });
        setVariantImages(imagesMap);
      }
    } catch (error) {
      console.warn('⚠️ Error loading variant images:', error);
    }
  };

  const loadProductImages = async () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const imagesMap: Record<string, string> = {};
    
    // Get all unique product_ids from cart items
    const productIds = cartItems
      .map(item => item.product.id)
      .filter((id): id is string => Boolean(id));
    
    if (productIds.length === 0) {
      return;
    }
    
    try {
      // Load primary images for all products at once
      const productIdConditions = productIds.map(id => `product_id.eq.${id}`).join(',');
      const response = await fetch(
        `${supabaseUrl}/rest/v1/product_images?or=(${productIdConditions})&is_primary=eq.true&variant_id=is.null&order=display_order.asc&limit=100`,
        {
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${supabaseKey || ''}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (response.ok) {
        const imagesData = await response.json();
        // Map product_id to primary image_url
        imagesData.forEach((img: any) => {
          if (img.product_id && !imagesMap[img.product_id]) {
            imagesMap[img.product_id] = img.image_url;
          }
        });
        setProductImages(imagesMap);
      }
    } catch (error) {
      console.warn('⚠️ Error loading product images:', error);
    }
  };

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
      sweetAlert.showError('خطأ', 'يجب تسجيل الدخول أولاً', () => {
        router.push('/auth');
      });
      return;
    }

    if (cartItems.length === 0) {
      sweetAlert.showError('خطأ', 'السلة فارغة');
      return;
    }

    setLoading(true);

    try {
      console.log('🛒 Cart: Starting order creation...');
      
      // Get location (optional)
      const location = await getLocation();
      
      // Get address from user
      let address = user.address || 'عنوان غير محدد';
      
      // فصل المنتجات حسب source_type
      const warehouseItems = cartItems.filter(item => 
        item.product.source_type === 'warehouse' || !item.product.source_type
      );
      const externalItems = cartItems.filter(item => 
        item.product.source_type === 'external'
      );
      
      console.log('📦 Cart: Warehouse items:', warehouseItems.length);
      console.log('📦 Cart: External items:', externalItems.length);
      
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
      
      const createdOrders = [];
      
      // إنشاء طلب للمنتجات الداخلية (إن وجدت)
      if (warehouseItems.length > 0) {
        const warehouseTotal = warehouseItems.reduce((sum, item) => 
          sum + (item.product.price * item.quantity), 0
        );
        const warehouseOrderNumber = `ORD-W-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        console.log('📡 Cart: Creating warehouse order...');
        const warehouseOrderResponse = await fetch(`${supabaseUrl}/rest/v1/orders`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            user_id: user.id,
            order_number: warehouseOrderNumber,
            status: 'pending',
            total_amount: warehouseTotal,
            shipping_address: address,
            latitude: location?.latitude || null,
            longitude: location?.longitude || null,
            source_type: 'warehouse',
          })
        });
        
        if (!warehouseOrderResponse.ok) {
          const errorText = await warehouseOrderResponse.text();
          throw new Error(errorText || 'فشل إنشاء طلب المخزن');
        }
        
        const warehouseOrderData = await warehouseOrderResponse.json();
        const warehouseOrder = Array.isArray(warehouseOrderData) ? warehouseOrderData[0] : warehouseOrderData;
        console.log('✅ Cart: Warehouse order created:', warehouseOrder.id);
        
        // Create order items
        const warehouseOrderItems = warehouseItems.map((item) => ({
          order_id: warehouseOrder.id,
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        }));
        
        await fetch(`${supabaseUrl}/rest/v1/order_items`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(warehouseOrderItems)
        });
        
        createdOrders.push(warehouseOrder);
      }
      
      // إنشاء طلب للمنتجات الخارجية (إن وجدت)
      if (externalItems.length > 0) {
        const externalTotal = externalItems.reduce((sum, item) => 
          sum + (item.product.price * item.quantity), 0
        );
        const externalOrderNumber = `ORD-E-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        console.log('📡 Cart: Creating external order...');
        const externalOrderResponse = await fetch(`${supabaseUrl}/rest/v1/orders`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            user_id: user.id,
            order_number: externalOrderNumber,
            status: 'pending',
            total_amount: externalTotal,
            shipping_address: address,
            latitude: location?.latitude || null,
            longitude: location?.longitude || null,
            source_type: 'external',
            parent_order_id: createdOrders.length > 0 ? createdOrders[0].id : null, // ربط الطلب الثاني بالأول
          })
        });
        
        if (!externalOrderResponse.ok) {
          const errorText = await externalOrderResponse.text();
          throw new Error(errorText || 'فشل إنشاء طلب الخارج');
        }
        
        const externalOrderData = await externalOrderResponse.json();
        const externalOrder = Array.isArray(externalOrderData) ? externalOrderData[0] : externalOrderData;
        console.log('✅ Cart: External order created:', externalOrder.id);
        
        // Create order items
        const externalOrderItems = externalItems.map((item) => ({
          order_id: externalOrder.id,
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        }));
        
        await fetch(`${supabaseUrl}/rest/v1/order_items`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(externalOrderItems)
        });
        
        createdOrders.push(externalOrder);
      }
      
      // عرض رسالة للعميل
      if (createdOrders.length === 2) {
        sweetAlert.showSuccess(
          'تم إنشاء الطلبين',
          `تم إنشاء طلبين منفصلين:\n- طلب من المخزن: ${createdOrders[0].order_number}\n- طلب من الخارج: ${createdOrders[1].order_number}`,
          () => router.push('/(tabs)/orders')
        );
      } else if (createdOrders.length === 1) {
        const order = createdOrders[0];
        const orderType = order.source_type === 'warehouse' ? 'من المخزن' : 'من الخارج';
        sweetAlert.showConfirm(
          'نجح',
          `تم إنشاء الطلب بنجاح (${orderType})\nرقم الطلب: ${order.order_number}\nهل تريد الذهاب لصفحة الطلبات؟`,
          () => router.push('/(tabs)/orders')
        );
      }
      
      // Clear cart بعد نجاح إنشاء الطلبات
      clearCart();
      
    } catch (error: any) {
      console.error('❌ Cart: Error creating order:', error);
      sweetAlert.showError('خطأ', error.message || 'فشل إنشاء الطلب');
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
          {cartItems.map((item) => {
            const variantId = (item.product as any).variant_id;
            const variantName = (item.product as any).variant_name || '';
            const variantImage = variantId ? variantImages[variantId] : null;
            const productPrimaryImage = productImages[item.product.id];
            const displayImage = variantImage || productPrimaryImage || item.product.image_url || item.product.primary_image_url || 'https://via.placeholder.com/150';
            
            // Extract color and size from variant_name (format: "لون - مقاس" or "لون - مقاس (وحدة)")
            let color = '';
            let size = '';
            if (variantName) {
              const parts = variantName.split(' - ');
              if (parts.length >= 1) color = parts[0].trim();
              if (parts.length >= 2) {
                size = parts[1].split('(')[0].trim(); // Remove unit if exists
              }
            }
            
            // Calculate discount info
            const currentPrice = item.product.price;
            const originalPrice = item.product.original_price;
            const discountPercentage = item.product.discount_percentage;
            const hasDiscount = originalPrice && originalPrice > currentPrice;
            
            return (
              <TouchableOpacity
                key={item.product.id}
                style={styles.cartItem}
                onPress={() => router.push(`/product/${item.product.id}`)}
                activeOpacity={0.7}
              >
                {imagesLoading ? (
                  <SkeletonCard width={80} height={80} borderRadius={8} />
                ) : displayImage && displayImage !== 'https://via.placeholder.com/150' ? (
                  <Image
                    source={{ uri: displayImage }}
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.itemImage, styles.placeholderImage]}>
                    <Ionicons name="image-outline" size={40} color="#ccc" />
                  </View>
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product.name}</Text>
                  
                  {/* Variant Info (Color & Size) */}
                  {(color || size) && (
                    <View style={styles.variantInfo}>
                      {color && (
                        <View style={styles.variantBadge}>
                          <Text style={styles.variantBadgeText}>اللون: {color}</Text>
                        </View>
                      )}
                      {size && (
                        <View style={styles.variantBadge}>
                          <Text style={styles.variantBadgeText}>المقاس: {size}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  
                  {/* Price Info */}
                  <View style={styles.priceInfo}>
                    {hasDiscount ? (
                      <View style={styles.priceRow}>
                        <View style={styles.priceColumn}>
                          <Text style={styles.itemPrice}>
                            {currentPrice.toFixed(2)} ج.م
                          </Text>
                          <Text style={styles.originalPrice}>
                            {originalPrice?.toFixed(2)} ج.م
                          </Text>
                        </View>
                        {discountPercentage && (
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountBadgeText}>-{discountPercentage}%</Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <Text style={styles.itemPrice}>
                        {currentPrice.toFixed(2)} ج.م
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.quantityContainer}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        updateQuantity(item.product.id, item.quantity - 1);
                      }}
                    >
                      <Ionicons name="remove" size={20} color="#EE1C47" />
                    </TouchableOpacity>
                    <Text style={styles.quantity}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        updateQuantity(item.product.id, item.quantity + 1);
                      }}
                    >
                      <Ionicons name="add" size={20} color="#EE1C47" />
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    removeFromCart(item.product.id);
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#ff4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
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
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>تأكيد الطلب</Text>
          )}
        </TouchableOpacity>
        </View>
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
    backgroundColor: '#f0f0f0',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
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
  variantInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  variantBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  variantBadgeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  priceInfo: {
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceColumn: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  itemPrice: {
    fontSize: 16,
    color: '#EE1C47',
    fontWeight: 'bold',
  },
  originalPrice: {
    fontSize: 13,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
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

