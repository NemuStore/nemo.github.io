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
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Order, OrderItem } from '@/types';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import SweetAlert from '@/components/SweetAlert';
import { SkeletonCard } from '@/components/SkeletonCard';

export default function AdminOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const sweetAlert = useSweetAlert();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());
  const [updatingPurchase, setUpdatingPurchase] = useState(false);
  const [adminStatus, setAdminStatus] = useState<string>('');
  const [customerStatus, setCustomerStatus] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

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

      const orderDataItem = orderData[0];
      setOrder(orderDataItem);
      setAdminStatus((orderDataItem as any).admin_status || 'pending');
      setCustomerStatus(orderDataItem.status || 'pending');

      // جلب order_items مع variant
      const orderItemsResponse = await fetch(
        `${supabaseUrl}/rest/v1/order_items?order_id=eq.${id}&select=*,product_variants(*)`,
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
      console.log('📦 Admin Order: Order items data:', JSON.stringify(itemsData.slice(0, 2), null, 2)); // Log first 2 items for debugging
      
      // جلب معلومات المنتجات لكل order_item
      if (itemsData.length > 0) {
        const productIds = itemsData.map((item: OrderItem) => item.product_id);
        const productIdsQuery = productIds.map((id: string) => `id.eq.${id}`).join(',');
        
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

        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          const productsMap = new Map(productsData.map((p: any) => [p.id, p]));
          
          // ربط المنتجات مع order_items وإضافة حالة الشراء
          const itemsWithProducts = itemsData.map((item: OrderItem) => {
            const product = productsMap.get(item.product_id);
            // Supabase PostgREST يعيد product_variants كـ object (لأنه foreign key واحد)
            // لكن قد يعيده كـ array في بعض الحالات، لذا نتعامل مع الحالتين
            let variant = null;
            if ((item as any).product_variants) {
              if (Array.isArray((item as any).product_variants)) {
                // إذا كان array، نأخذ الأول
                variant = (item as any).product_variants.length > 0 ? (item as any).product_variants[0] : null;
              } else {
                // إذا كان object، نأخذه مباشرة
                variant = (item as any).product_variants;
              }
            }
            console.log('🔍 Admin Order: Item variant:', item.variant_id, '→', variant ? `${variant.color} - ${variant.size}` : 'null');
            if ((item as any).is_purchased) {
              purchasedItems.add(item.id);
            }
            return {
              ...item,
              product: product || null,
              variant: variant || null,
            };
          });
          
          setOrderItems(itemsWithProducts);
          setPurchasedItems(new Set(itemsData.filter((item: any) => item.is_purchased).map((item: OrderItem) => item.id)));
        } else {
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

  const handleOpenProductUrl = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        sweetAlert.showError('خطأ', 'لا يمكن فتح الرابط');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      sweetAlert.showError('خطأ', 'فشل فتح الرابط');
    }
  };

  const handleCopyProductCode = async (productId: string, productSku?: string) => {
    try {
      const codeToCopy = productSku || productId;
      
      if (Platform.OS === 'web') {
        // على الويب
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(codeToCopy);
          sweetAlert.showSuccess('نجح', 'تم نسخ الكود بنجاح');
        } else {
          // Fallback للواجهات القديمة
          const textArea = document.createElement('textarea');
          textArea.value = codeToCopy;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          sweetAlert.showSuccess('نجح', 'تم نسخ الكود بنجاح');
        }
      } else {
        // على الموبايل - استخدام Clipboard API
        try {
          const { default: Clipboard } = await import('@react-native-clipboard/clipboard');
          Clipboard.setString(codeToCopy);
          sweetAlert.showSuccess('نجح', 'تم نسخ الكود بنجاح');
        } catch (clipboardError) {
          // Fallback: عرض الكود في رسالة
          sweetAlert.showSuccess('الكود', `الكود: ${codeToCopy}\n\nيمكنك نسخه يدوياً`);
        }
      }
    } catch (error) {
      console.error('Error copying code:', error);
      // Fallback: عرض الكود في رسالة
      const codeToCopy = productSku || productId;
      sweetAlert.showSuccess('الكود', `الكود: ${codeToCopy}\n\nيمكنك نسخه يدوياً`);
    }
  };

  const handleTogglePurchase = async (itemId: string, isPurchased: boolean) => {
    setUpdatingPurchase(true);
    try {
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

      const response = await fetch(
        `${supabaseUrl}/rest/v1/order_items?id=eq.${itemId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_purchased: isPurchased,
          })
        }
      );

      if (response.ok) {
        const newPurchasedItems = new Set(purchasedItems);
        if (isPurchased) {
          newPurchasedItems.add(itemId);
        } else {
          newPurchasedItems.delete(itemId);
        }
        setPurchasedItems(newPurchasedItems);
      } else {
        throw new Error('فشل تحديث حالة الشراء');
      }
    } catch (error: any) {
      sweetAlert.showError('خطأ', error.message || 'فشل تحديث حالة الشراء');
    } finally {
      setUpdatingPurchase(false);
    }
  };

  const getCustomerStatusFromAdminStatus = async (adminStatus: string): Promise<string | null> => {
    try {
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

      // جلب الحالة المقابلة من جدول التعيين
      const response = await fetch(
        `${supabaseUrl}/rest/v1/admin_status_mapping?admin_status=eq.${adminStatus}&is_active=eq.true&select=customer_status`,
        {
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          return data[0].customer_status;
        }
      }
      
      // إذا لم يتم العثور على تعيين، استخدم القيم الافتراضية
      const defaultMapping: Record<string, string> = {
        'pending': 'pending',
        'in_progress': 'confirmed',
        'purchased': 'shipped_from_china',
        'shipped': 'shipped_from_uae',
        'completed': 'delivered',
        'cancelled': 'cancelled',
      };
      
      return defaultMapping[adminStatus] || null;
    } catch (error) {
      console.error('Error fetching status mapping:', error);
      // في حالة الخطأ، استخدم القيم الافتراضية
      const defaultMapping: Record<string, string> = {
        'pending': 'pending',
        'in_progress': 'confirmed',
        'purchased': 'shipped_from_china',
        'shipped': 'shipped_from_uae',
        'completed': 'delivered',
        'cancelled': 'cancelled',
      };
      return defaultMapping[adminStatus] || null;
    }
  };

  const handleUpdateAdminStatus = async (newStatus: string) => {
    if (!order) return;
    
    setUpdatingStatus(true);
    try {
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

      // الحصول على الحالة المقابلة للعميل تلقائياً
      const customerStatus = await getCustomerStatusFromAdminStatus(newStatus);
      
      // تحديث الحالتين معاً
      const updateData: any = {
        admin_status: newStatus,
      };
      
      if (customerStatus) {
        updateData.status = customerStatus;
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/orders?id=eq.${order.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData)
        }
      );

      if (response.ok) {
        setAdminStatus(newStatus);
        if (customerStatus) {
          setCustomerStatus(customerStatus);
          setOrder({ ...order, admin_status: newStatus as any, status: customerStatus as any });
        } else {
          setOrder({ ...order, admin_status: newStatus as any });
        }
        sweetAlert.showSuccess(
          'نجح', 
          customerStatus 
            ? `تم تحديث الحالة الإدارية إلى "${getAdminStatusText(newStatus)}" وحالة العميل إلى "${getStatusText(customerStatus)}" تلقائياً`
            : 'تم تحديث الحالة الإدارية بنجاح'
        );
      } else {
        throw new Error('فشل تحديث الحالة الإدارية');
      }
    } catch (error: any) {
      sweetAlert.showError('خطأ', error.message || 'فشل تحديث الحالة الإدارية');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUpdateCustomerStatus = async (newStatus: string) => {
    if (!order) return;
    
    setUpdatingStatus(true);
    try {
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

      const response = await fetch(
        `${supabaseUrl}/rest/v1/orders?id=eq.${order.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: newStatus,
          })
        }
      );

      if (response.ok) {
        setCustomerStatus(newStatus);
        setOrder({ ...order, status: newStatus as any });
        sweetAlert.showSuccess('نجح', 'تم تحديث حالة العميل بنجاح');
      } else {
        throw new Error('فشل تحديث حالة العميل');
      }
    } catch (error: any) {
      sweetAlert.showError('خطأ', error.message || 'فشل تحديث حالة العميل');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSelectAll = async () => {
    const allPurchased = orderItems.every(item => purchasedItems.has(item.id));
    const newPurchasedState = !allPurchased;
    
    setUpdatingPurchase(true);
    try {
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

      // تحديث جميع المنتجات
      const itemIds = orderItems.map(item => item.id);
      const updates = itemIds.map(id => ({
        id,
        is_purchased: newPurchasedState,
      }));

      // تحديث كل منتج على حدة
      await Promise.all(
        updates.map(update =>
          fetch(`${supabaseUrl}/rest/v1/order_items?id=eq.${update.id}`, {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey || '',
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              is_purchased: update.is_purchased,
            })
          })
        )
      );

      setPurchasedItems(new Set(newPurchasedState ? itemIds : []));
      sweetAlert.showSuccess('نجح', newPurchasedState ? 'تم تحديد جميع المنتجات كتم الشراء' : 'تم إلغاء تحديد جميع المنتجات');
    } catch (error: any) {
      sweetAlert.showError('خطأ', error.message || 'فشل تحديث حالة الشراء');
    } finally {
      setUpdatingPurchase(false);
    }
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

  const getAdminStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'قيد الانتظار',
      in_progress: 'قيد المعالجة',
      purchased: 'تم الشراء',
      shipped: 'تم الشحن',
      completed: 'مكتمل',
      cancelled: 'ملغي',
    };
    return statusMap[status] || status;
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
  const allPurchased = orderItems.length > 0 && orderItems.every(item => purchasedItems.has(item.id));

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

            {/* الحالات */}
            <View style={styles.statusSection}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>حالة العميل:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusPicker}>
                  {['pending', 'confirmed', 'shipped_from_china', 'received_in_uae', 'shipped_from_uae', 'received_in_egypt', 'in_warehouse', 'out_for_delivery', 'delivered', 'cancelled'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        customerStatus === status && styles.statusOptionActive
                      ]}
                      onPress={() => handleUpdateCustomerStatus(status)}
                      disabled={updatingStatus}
                    >
                      <Text style={[
                        styles.statusOptionText,
                        customerStatus === status && styles.statusOptionTextActive
                      ]}>
                        {getStatusText(status)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>الحالة الإدارية:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.adminStatusPicker}>
                  {['pending', 'in_progress', 'purchased', 'shipped', 'completed', 'cancelled'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.adminStatusOption,
                        adminStatus === status && styles.adminStatusOptionActive
                      ]}
                      onPress={() => handleUpdateAdminStatus(status)}
                      disabled={updatingStatus}
                    >
                      <Text style={[
                        styles.adminStatusOptionText,
                        adminStatus === status && styles.adminStatusOptionTextActive
                      ]}>
                        {getAdminStatusText(status)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

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
            <View style={styles.productsHeader}>
              <Text style={styles.sectionTitle}>المنتجات ({orderItems.length})</Text>
              {orderItems.length > 0 && (
                <TouchableOpacity
                  style={styles.selectAllButton}
                  onPress={handleSelectAll}
                  disabled={updatingPurchase}
                >
                  <Text style={styles.selectAllText}>
                    {allPurchased ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            {orderItems.length === 0 ? (
              <View style={styles.emptyProductsContainer}>
                <Ionicons name="cube-outline" size={60} color="#ccc" />
                <Text style={styles.emptyProductsText}>لا توجد منتجات في هذا الطلب</Text>
              </View>
            ) : (
              orderItems.map((item) => {
                const product = item.product || (item as any).products?.[0] || null;
                const productImage = productImages[item.product_id] || product?.image_url || product?.primary_image_url || 'https://via.placeholder.com/150';
                const productUrl = product?.product_url || (product as any)?.product_url;
                const isPurchased = purchasedItems.has(item.id);
                
                return (
                  <View key={item.id} style={styles.productCard}>
                    <View style={styles.productCardContent}>
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
                        {/* عرض معلومات المتغير (اللون والمقاس) */}
                        {item.variant_id && (item as any).variant && (
                          <View style={styles.variantInfo}>
                            {(item as any).variant.color && (
                              <View style={styles.variantBadge}>
                                <Text style={styles.variantBadgeText}>
                                  اللون: {(item as any).variant.color}
                                </Text>
                              </View>
                            )}
                            {(item as any).variant.size && (
                              <View style={styles.variantBadge}>
                                <Text style={styles.variantBadgeText}>
                                  المقاس: {(item as any).variant.size}
                                  {(item as any).variant.size_unit ? ` (${(item as any).variant.size_unit})` : ''}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                        <View style={styles.productDetails}>
                          <Text style={styles.productQuantity}>الكمية: {item.quantity}</Text>
                          <Text style={styles.productPrice}>
                            {item.price.toFixed(2)} ج.م
                          </Text>
                        </View>
                        <Text style={styles.productTotal}>
                          الإجمالي: {(item.price * item.quantity).toFixed(2)} ج.م
                        </Text>
                        
                        {/* رابط المنتج ونسخ الكود */}
                        <View style={styles.productActionsRow}>
                          {productUrl && (
                            <TouchableOpacity
                              style={[styles.productUrlButton, { flex: 1, marginRight: 6 }]}
                              onPress={() => handleOpenProductUrl(productUrl)}
                            >
                              <Ionicons name="link-outline" size={16} color="#EE1C47" />
                              <Text style={styles.productUrlText}>افتح رابط المنتج</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[styles.productUrlButton, { 
                              flex: productUrl ? 1 : undefined,
                              backgroundColor: '#2196F3',
                              marginLeft: productUrl ? 6 : 0 
                            }]}
                            onPress={() => handleCopyProductCode(item.product_id, product?.sku)}
                          >
                            <Ionicons name="copy-outline" size={16} color="#fff" />
                            <Text style={[styles.productUrlText, { color: '#fff' }]}>نسخ الكود</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                    
                    {/* Checkbox تم الشراء */}
                    <View style={styles.purchaseCheckboxContainer}>
                      <TouchableOpacity
                        style={[styles.checkbox, isPurchased && styles.checkboxChecked]}
                        onPress={() => handleTogglePurchase(item.id, !isPurchased)}
                        disabled={updatingPurchase}
                      >
                        {isPurchased && <Ionicons name="checkmark" size={16} color="#fff" />}
                      </TouchableOpacity>
                      <Text style={styles.checkboxLabel}>تم الشراء</Text>
                    </View>
                  </View>
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
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EE1C47',
    borderRadius: 8,
  },
  selectAllText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productCardContent: {
    flexDirection: 'row',
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
    marginBottom: 8,
  },
  productActionsRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 6,
  },
  productUrlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  productUrlText: {
    color: '#EE1C47',
    fontSize: 12,
    fontWeight: '600',
  },
  purchaseCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  variantInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  variantBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  variantBadgeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statusSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    minWidth: 100,
  },
  statusBadgeSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusTextSmall: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  statusPicker: {
    flexDirection: 'row',
    maxHeight: 40,
    flex: 1,
  },
  statusOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusOptionActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  statusOptionText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  statusOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  adminStatusPicker: {
    flexDirection: 'row',
    maxHeight: 40,
    flex: 1,
  },
  adminStatusOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  adminStatusOptionActive: {
    backgroundColor: '#EE1C47',
    borderColor: '#EE1C47',
  },
  adminStatusOptionText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  adminStatusOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});

