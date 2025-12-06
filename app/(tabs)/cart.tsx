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
  TextInput,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useCart } from '@/contexts/CartContext';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import SweetAlert from '@/components/SweetAlert';
import { SkeletonCard } from '@/components/SkeletonCard';

type TabType = 'external' | 'warehouse';

export default function CartScreen() {
  const { cartItems, removeFromCart, updateQuantity, getTotal, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [variantImages, setVariantImages] = useState<Record<string, string>>({}); // variant_id -> image_url
  const [productImages, setProductImages] = useState<Record<string, string>>({}); // product_id -> primary_image_url
  const [shippingAddress, setShippingAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('external'); // التبويب النشط
  const router = useRouter();
  const sweetAlert = useSweetAlert();

  // فصل المنتجات حسب source_type
  const externalItems = cartItems.filter(item => 
    item.product.source_type === 'external'
  );
  const warehouseItems = cartItems.filter(item => 
    item.product.source_type === 'warehouse' || !item.product.source_type
  );

  // تحديد التبويب الافتراضي بناءً على المنتجات المتاحة
  useEffect(() => {
    const hasExternal = externalItems.length > 0;
    const hasWarehouse = warehouseItems.length > 0;
    
    if (hasExternal && !hasWarehouse) {
      setActiveTab('external');
    } else if (hasWarehouse && !hasExternal) {
      setActiveTab('warehouse');
    } else if (hasExternal && activeTab !== 'external' && activeTab !== 'warehouse') {
      setActiveTab('external'); // الافتراضي لمنتجات الخارج
    }
  }, [externalItems.length, warehouseItems.length]);

  // الحصول على المنتجات للتبويب النشط
  const getActiveTabItems = () => {
    return activeTab === 'external' ? externalItems : warehouseItems;
  };

  // حساب الإجمالي للتبويب النشط
  const getActiveTabTotal = () => {
    const items = getActiveTabItems();
    return items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  useEffect(() => {
    loadUser();
    const loadAllImages = async () => {
      setImagesLoading(true);
      await Promise.all([loadVariantImages(), loadProductImages()]);
      setImagesLoading(false);
    };
    loadAllImages();
  }, [cartItems]);

  // تحديث العنوان ورقم الهاتف من بيانات المستخدم عند التحميل
  useEffect(() => {
    if (user) {
      // سحب العنوان تلقائياً من بيانات المستخدم
      if (user.address) {
        setShippingAddress(user.address);
      }
      if (user.phone) {
        setPhoneNumber(user.phone);
      }
    }
  }, [user]);

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

    // الحصول على المنتجات للتبويب النشط فقط
    const activeItems = getActiveTabItems();

    if (activeItems.length === 0) {
      sweetAlert.showError('خطأ', `لا توجد منتجات في تبويب ${activeTab === 'external' ? 'من الخارج' : 'من المخزن'}`);
      return;
    }

    setLoading(true);

    try {
      console.log('🛒 Cart: Starting order creation for tab:', activeTab);
      
      // التحقق من العنوان ورقم الهاتف
      if (!shippingAddress || shippingAddress.trim() === '') {
        sweetAlert.showError('خطأ', 'يرجى إدخال عنوان التوصيل');
        setLoading(false);
        return;
      }

      if (!phoneNumber || phoneNumber.trim() === '') {
        sweetAlert.showError('خطأ', 'يرجى إدخال رقم الهاتف');
        setLoading(false);
        return;
      }

      // Get location (optional)
      const location = await getLocation();
      
      // استخدام العنوان المدخل
      const address = shippingAddress.trim();
      
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
      
      // حساب إجمالي المنتجات في التبويب النشط فقط
      const totalAmount = activeItems.reduce((sum, item) => 
        sum + (item.product.price * item.quantity), 0
      );
      
      // تحديد source_type بناءً على التبويب النشط
      const sourceType = activeTab === 'external' ? 'external' : 'warehouse';
      
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('📡 Cart: Creating order for tab:', activeTab);
      console.log('📦 Cart: Total items:', activeItems.length);
      console.log('💰 Cart: Total amount:', totalAmount);
      console.log('📦 Cart: Source type:', sourceType);
      
      // إنشاء طلب للمنتجات في التبويب النشط فقط
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
          order_number: orderNumber,
          status: 'pending',
          total_amount: totalAmount,
          shipping_address: address,
          latitude: location?.latitude || null,
          longitude: location?.longitude || null,
          source_type: sourceType,
        })
      });
      
      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        throw new Error(errorText || 'فشل إنشاء الطلب');
      }
      
      const orderData = await orderResponse.json();
      const order = Array.isArray(orderData) ? orderData[0] : orderData;
      console.log('✅ Cart: Order created:', order.id);
      console.log('📋 Cart: Order data:', JSON.stringify(order, null, 2));
      
      // إنشاء order items للمنتجات في التبويب النشط فقط
      const orderItems = activeItems.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        variant_id: (item.product as any).variant_id || null, // حفظ variant_id إذا كان موجوداً
        quantity: item.quantity,
        price: item.product.price,
      }));
      
      console.log('📦 Cart: Creating order items:', orderItems.length);
      console.log('📦 Cart: Order items with variants:', JSON.stringify(orderItems.slice(0, 2), null, 2)); // Log first 2 items for debugging
      const orderItemsResponse = await fetch(`${supabaseUrl}/rest/v1/order_items`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(orderItems)
      });
      
      if (!orderItemsResponse.ok) {
        const errorText = await orderItemsResponse.text();
        console.error('❌ Cart: Failed to create order items:', errorText);
        throw new Error(errorText || 'فشل إنشاء عناصر الطلب');
      }
      
      const createdOrderItems = await orderItemsResponse.json();
      console.log('✅ Cart: Order items created successfully:', Array.isArray(createdOrderItems) ? createdOrderItems.length : 1);
      
      // إزالة المنتجات من السلة (التبويب النشط فقط)
      activeItems.forEach(item => {
        removeFromCart(item.product.id);
      });
      
      const orderType = sourceType === 'warehouse' ? 'من المخزن' : 'من الخارج';
      console.log('🎉 Cart: Showing success message for order:', order.order_number);
      
      const navigateToOrders = () => {
        console.log('🚀🚀🚀 Cart: navigateToOrders CALLED!');
        console.log('🚀 Cart: onConfirm callback called, navigating to orders...');
        console.log('📍 Cart: Platform.OS:', Platform.OS);
        console.log('📍 Cart: window exists:', typeof window !== 'undefined');
        console.log('📍 Cart: router exists:', !!router);
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          console.log('🌐 Cart: Using window.location.href for web');
          window.location.href = '/orders';
          console.log('✅ Cart: window.location.href set to /orders');
        } else {
          console.log('📱 Cart: Using router.replace for mobile');
          router.replace('/orders');
          console.log('✅ Cart: router.replace called');
        }
      };
      
      sweetAlert.showSuccess(
        'تم إنشاء الطلب بنجاح',
        `تم إنشاء الطلب بنجاح (${orderType})\nرقم الطلب: ${order.order_number}`,
        navigateToOrders
      );
      
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
        {/* Checkout Steps - Temu Style */}
        <View style={[styles.stepsContainer, { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
          <View style={styles.step}>
            <View style={[styles.stepCircle, styles.stepActive]}>
              <Text style={[styles.stepNumber, styles.stepActiveText]}>1</Text>
            </View>
            <Text style={[styles.stepLabel, styles.stepActiveLabel]}>معلومات التوصيل</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.step}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <Text style={styles.stepLabel}>الدفع</Text>
          </View>
        </View>

        {/* Shipping Information Form - Temu Style */}
        <View style={[styles.shippingForm, { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
          <View style={styles.formHeader}>
            <Ionicons name="location" size={20} color="#EE1C47" />
            <Text style={styles.sectionTitle}>معلومات التوصيل</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>العنوان الكامل *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="أدخل عنوان التوصيل الكامل"
              placeholderTextColor="#999"
              value={shippingAddress}
              onChangeText={setShippingAddress}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>رقم الهاتف *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="أدخل رقم الهاتف"
              placeholderTextColor="#999"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Tabs for External and Warehouse Products */}
        {(externalItems.length > 0 || warehouseItems.length > 0) && (
          <View style={[styles.tabsContainer, { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
            {externalItems.length > 0 && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'external' && styles.tabActive]}
                onPress={() => setActiveTab('external')}
              >
                <Text style={[styles.tabText, activeTab === 'external' && styles.tabTextActive]}>
                  من الخارج ({externalItems.length})
                </Text>
              </TouchableOpacity>
            )}
            {warehouseItems.length > 0 && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'warehouse' && styles.tabActive]}
                onPress={() => setActiveTab('warehouse')}
              >
                <Text style={[styles.tabText, activeTab === 'warehouse' && styles.tabTextActive]}>
                  من المخزن ({warehouseItems.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={[styles.cartItemsContainer, { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
          {getActiveTabItems().length === 0 ? (
            <View style={styles.emptyTabContainer}>
              <Ionicons name="cart-outline" size={60} color="#ccc" />
              <Text style={styles.emptyTabText}>
                لا توجد منتجات في تبويب {activeTab === 'external' ? 'من الخارج' : 'من المخزن'}
              </Text>
            </View>
          ) : (
            getActiveTabItems().map((item) => {
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
            
            // إنشاء key فريد يجمع بين product.id و variant_id
            const uniqueKey = `${item.product.id}-${variantId || 'no-variant'}`;
            
            return (
              <TouchableOpacity
                key={uniqueKey}
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
                        updateQuantity(item.product.id, item.quantity - 1, variantId);
                      }}
                    >
                      <Ionicons name="remove" size={20} color="#EE1C47" />
                    </TouchableOpacity>
                    <Text style={styles.quantity}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        updateQuantity(item.product.id, item.quantity + 1, variantId);
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
                    removeFromCart(item.product.id, variantId);
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#ff4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
            })
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, isWeb && styles.footerWeb]}>
        <View style={[styles.footerContent, { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>الإجمالي ({activeTab === 'external' ? 'من الخارج' : 'من المخزن'}):</Text>
          <Text style={styles.totalAmount}>{getActiveTabTotal().toFixed(2)} ج.م</Text>
        </View>
        <TouchableOpacity
          style={[styles.confirmButton, (loading || getActiveTabItems().length === 0) && styles.confirmButtonDisabled]}
          onPress={confirmOrder}
          disabled={loading || getActiveTabItems().length === 0}
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
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  step: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepActive: {
    backgroundColor: '#EE1C47',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  stepActiveText: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 12,
    color: '#666',
  },
  stepActiveLabel: {
    color: '#EE1C47',
    fontWeight: '600',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 10,
    marginBottom: 24,
  },
  shippingForm: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
    minHeight: 44,
    textAlignVertical: 'top',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 10,
    marginTop: 0,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: '#EE1C47',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyTabContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTabText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
});

