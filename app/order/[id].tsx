import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Order, OrderItem } from '@/types';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import SweetAlert from '@/components/SweetAlert';
import { SkeletonCard } from '@/components/SkeletonCard';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const sweetAlert = useSweetAlert();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [productImages, setProductImages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      loadOrderDetails();
    }
  }, [id]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      setImagesLoading(true);

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      let accessToken = supabaseKey || '';
      if (typeof window !== 'undefined') {
        const supabaseUrlForStorage = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
        const projectRef = supabaseUrlForStorage.split('//')[1]?.split('.')[0] || 'default';
        const storageKey = `sb-${projectRef}-auth-token`;
        const tokenData = localStorage.getItem(storageKey);
        if (tokenData) {
          const parsed = JSON.parse(tokenData);
          accessToken = parsed?.access_token || supabaseKey || '';
        }
      }

      // جلب معلومات الطلب
      const orderResponse = await fetch(
        `${supabaseUrl}/rest/v1/orders?id=eq.${id}&select=*`,
        {
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!orderResponse.ok) {
        throw new Error('فشل تحميل معلومات الطلب');
      }

      const orderData = await orderResponse.json();
      if (orderData.length === 0) {
        throw new Error('الطلب غير موجود');
      }

      setOrder(orderData[0]);

      // جلب order_items
      const orderItemsResponse = await fetch(
        `${supabaseUrl}/rest/v1/order_items?order_id=eq.${id}&select=*`,
        {
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!orderItemsResponse.ok) {
        throw new Error('فشل تحميل منتجات الطلب');
      }

      const itemsData = await orderItemsResponse.json();
      
      // جلب معلومات المنتجات لكل order_item
      if (itemsData.length > 0) {
        const productIds = itemsData.map((item: OrderItem) => item.product_id);
        
        // بناء استعلام للبحث عن عدة IDs
        // في PostgREST، يمكننا استخدام in operator أو عدة or conditions
        const productIdsQuery = productIds.map((id: string) => `id.eq.${id}`).join(',');
        
        console.log('🔍 Fetching products with IDs:', productIds);
        console.log('🔍 Query:', `or=(${productIdsQuery})`);
        
        const productsResponse = await fetch(
          `${supabaseUrl}/rest/v1/products?or=(${productIdsQuery})&select=*`,
          {
            headers: {
              'apikey': supabaseKey || '',
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            }
          }
        );
        
        console.log('📡 Products response status:', productsResponse.status);

        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          console.log('📦 Products loaded:', productsData.length);
          console.log('📦 Products data:', productsData);
          
          const productsMap = new Map(productsData.map((p: any) => [p.id, p]));
          
          // ربط المنتجات مع order_items
          const itemsWithProducts = itemsData.map((item: OrderItem) => {
            const product = productsMap.get(item.product_id);
            console.log(`🔗 Linking item ${item.id} with product ${item.product_id}:`, product?.name || 'NOT FOUND');
            return {
              ...item,
              product: product || null,
            };
          });
          
          console.log('✅ Items with products:', itemsWithProducts);
          setOrderItems(itemsWithProducts);
        } else {
          const errorText = await productsResponse.text();
          console.error('❌ Failed to load products:', errorText);
          // إذا فشل جلب المنتجات، نستخدم order_items بدون منتجات
          setOrderItems(itemsData);
        }

        // جلب صور المنتجات
        await loadProductImages(itemsData);
      } else {
        setOrderItems([]);
      }

    } catch (error: any) {
      console.error('Error loading order details:', error);
      sweetAlert.showError('خطأ', error.message || 'فشل تحميل تفاصيل الطلب', () => {
        router.back();
      });
    } finally {
      setLoading(false);
      setImagesLoading(false);
      setRefreshing(false);
    }
  };

  const loadProductImages = async (items: OrderItem[]) => {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const imagesMap: Record<string, string> = {};
      
      const productIds = items
        .map(item => item.product_id)
        .filter((id): id is string => Boolean(id));
      
      if (productIds.length === 0) {
        return;
      }
      
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

  const onRefresh = () => {
    setRefreshing(true);
    loadOrderDetails();
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#EE1C47" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تفاصيل الطلب</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>الطلب غير موجود</Text>
        </View>
      </View>
    );
  }

  const isWeb = Platform.OS === 'web';
  const { width } = Dimensions.get('window');
  const maxContentWidth = isWeb ? 1000 : width;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تفاصيل الطلب</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.contentWrapper, { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
          {/* Order Info Card */}
          <View style={styles.orderInfoCard}>
            <View style={styles.orderHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderNumber}>#{order.order_number}</Text>
                <Text style={styles.orderDate}>
                  {new Date(order.created_at).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
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

            {/* العنوان */}
            <View style={styles.addressSection}>
              <View style={styles.addressHeader}>
                <Ionicons name="location-outline" size={18} color="#666" />
                <Text style={styles.sectionLabel}>عنوان التوصيل</Text>
              </View>
              <Text style={styles.addressText}>{order.shipping_address}</Text>
            </View>

            {/* الملاحظات */}
            {order.delivery_notes && (
              <View style={styles.notesSection}>
                <View style={styles.addressHeader}>
                  <Ionicons name="pricetag-outline" size={18} color="#666" />
                  <Text style={styles.sectionLabel}>ملاحظة / علامة مميزة</Text>
                </View>
                <Text style={styles.notesText}>{order.delivery_notes}</Text>
              </View>
            )}

            <View style={styles.orderFooter}>
              <View>
                <Text style={styles.orderAmount}>
                  {order.total_amount.toFixed(2)} ج.م
                </Text>
                {order.estimated_delivery_days && (
                  <Text style={styles.deliveryInfo}>
                    متوقع الوصول خلال {order.estimated_delivery_days} أيام
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Products Section */}
          <View style={styles.productsSection}>
            <Text style={styles.sectionTitle}>المنتجات ({orderItems.length})</Text>
            
            {orderItems.length === 0 ? (
              <View style={styles.emptyProductsContainer}>
                <Ionicons name="cube-outline" size={60} color="#ccc" />
                <Text style={styles.emptyProductsText}>لا توجد منتجات في هذا الطلب</Text>
              </View>
            ) : (
              orderItems.map((item) => {
                const product = item.product || (item as any).products?.[0] || null;
                const productImage = productImages[item.product_id] || product?.image_url || product?.primary_image_url || 'https://via.placeholder.com/150';
                
                // Debug log
                if (!product) {
                  console.warn(`⚠️ Product not found for order_item ${item.id}, product_id: ${item.product_id}`);
                }
                
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.productCard}
                    onPress={() => router.push(`/product/${item.product_id}`)}
                    activeOpacity={0.7}
                  >
                    {imagesLoading ? (
                      <SkeletonCard width={80} height={80} borderRadius={8} />
                    ) : productImage && productImage !== 'https://via.placeholder.com/150' ? (
                      <Image
                        source={{ uri: productImage }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.productImage, styles.placeholderImage]}>
                        <Ionicons name="image-outline" size={40} color="#ccc" />
                      </View>
                    )}
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>
                        {product?.name || `منتج غير معروف (ID: ${item.product_id.substring(0, 8)}...)`}
                      </Text>
                      <View style={styles.productDetails}>
                        <Text style={styles.productQuantity}>الكمية: {item.quantity}</Text>
                        <Text style={styles.productPrice}>
                          {item.price.toFixed(2)} ج.م
                        </Text>
                      </View>
                      <Text style={styles.productTotal}>
                        الإجمالي: {(item.price * item.quantity).toFixed(2)} ج.م
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Platform.OS === 'web' ? 16 : 12,
    paddingBottom: 16,
  },
  contentWrapper: {
    padding: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  orderInfoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  addressSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  addressText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
    paddingRight: 0,
  },
  notesSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  notesText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    paddingRight: 0,
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EE1C47',
    marginBottom: 4,
  },
  deliveryInfo: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  productsSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  emptyProductsContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyProductsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  productQuantity: {
    fontSize: 14,
    color: '#666',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  productTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#EE1C47',
  },
});

