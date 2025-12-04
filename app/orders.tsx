import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Order } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import SweetAlert from '@/components/SweetAlert';
import * as Location from 'expo-location';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'delivered' | 'cancelled'>('all');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const router = useRouter();
  const sweetAlert = useSweetAlert();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      let userId: string | null = null;

      // Get user ID from localStorage
      if (typeof window !== 'undefined') {
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
        const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default';
        const storageKey = `sb-${projectRef}-auth-token`;
        const tokenData = localStorage.getItem(storageKey);
        if (tokenData) {
          const parsed = JSON.parse(tokenData);
          userId = parsed?.user?.id || parsed?.currentSession?.user?.id;
        }
      }

      if (!userId) {
        router.push('/auth');
        return;
      }

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
        `${supabaseUrl}/rest/v1/orders?user_id=eq.${userId}&select=*&order=created_at.desc`,
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
        setOrders(data);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
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

  const filteredOrders = orders.filter(order => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'pending') return !['delivered', 'cancelled'].includes(order.status);
    if (selectedFilter === 'delivered') return order.status === 'delivered';
    if (selectedFilter === 'cancelled') return order.status === 'cancelled';
    return true;
  });

  const getAddressFromLocation = async () => {
    try {
      setLoadingAddress(true);
      if (Platform.OS === 'web') {
        // على الويب، يمكن استخدام Geolocation API
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              // استخدام reverse geocoding API (مثل OpenStreetMap Nominatim)
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar`,
                {
                  headers: {
                    'User-Agent': 'Nemu App'
                  }
                }
              );
              const data = await response.json();
              if (data && data.display_name) {
                setEditAddress(data.display_name);
              }
            } catch (error) {
              console.error('Error getting address:', error);
            } finally {
              setLoadingAddress(false);
            }
          });
        } else {
          setLoadingAddress(false);
        }
      } else {
        // على الموبايل
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          sweetAlert.showError('خطأ', 'يجب السماح بالوصول للموقع');
          setLoadingAddress(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        
        // Reverse geocoding
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar`,
          {
            headers: {
              'User-Agent': 'Nemu App'
            }
          }
        );
        const data = await response.json();
        if (data && data.display_name) {
          setEditAddress(data.display_name);
        }
        setLoadingAddress(false);
      }
    } catch (error) {
      console.error('Error getting address:', error);
      setLoadingAddress(false);
    }
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setEditAddress(order.shipping_address || '');
    setEditNotes(order.delivery_notes || '');
  };

  const handleSaveOrder = async () => {
    if (!editingOrder) return;
    
    if (!editAddress.trim()) {
      sweetAlert.showError('خطأ', 'يرجى إدخال العنوان');
      return;
    }

    try {
      setLoading(true);
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
        `${supabaseUrl}/rest/v1/orders?id=eq.${editingOrder.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            shipping_address: editAddress.trim(),
            delivery_notes: editNotes.trim() || null,
          }),
        }
      );

      if (response.ok) {
        sweetAlert.showSuccess('نجح', 'تم تحديث الطلب بنجاح', () => {
          setEditingOrder(null);
          setEditAddress('');
          setEditNotes('');
          loadOrders();
        });
      } else {
        throw new Error('فشل تحديث الطلب');
      }
    } catch (error: any) {
      sweetAlert.showError('خطأ', error.message || 'فشل تحديث الطلب');
    } finally {
      setLoading(false);
    }
  };

  const isWeb = Platform.OS === 'web';
  const { width } = Dimensions.get('window');
  const maxContentWidth = isWeb ? 1000 : width;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#EE1C47" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>طلباتي</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>
            الكل ({orders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'pending' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('pending')}
        >
          <Text style={[styles.filterText, selectedFilter === 'pending' && styles.filterTextActive]}>
            قيد الانتظار ({orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'delivered' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('delivered')}
        >
          <Text style={[styles.filterText, selectedFilter === 'delivered' && styles.filterTextActive]}>
            تم التسليم ({orders.filter(o => o.status === 'delivered').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'cancelled' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('cancelled')}
        >
          <Text style={[styles.filterText, selectedFilter === 'cancelled' && styles.filterTextActive]}>
            ملغي ({orders.filter(o => o.status === 'cancelled').length})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Orders List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.contentWrapper, { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={80} color="#ccc" />
              <Text style={styles.emptyText}>لا توجد طلبات</Text>
            </View>
          ) : (
            filteredOrders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
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
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => handleEditOrder(order)}
                  >
                    <Ionicons name="create-outline" size={18} color="#EE1C47" />
                    <Text style={styles.editButtonText}>تعديل</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal لتعديل العنوان والملاحظات */}
      <Modal
        visible={editingOrder !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تعديل العنوان والملاحظات</Text>
              <TouchableOpacity onPress={() => setEditingOrder(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <View style={styles.inputLabelRow}>
                  <Text style={styles.inputLabel}>العنوان الكامل *</Text>
                  <TouchableOpacity 
                    style={styles.autoFillButton}
                    onPress={getAddressFromLocation}
                    disabled={loadingAddress}
                  >
                    {loadingAddress ? (
                      <ActivityIndicator size="small" color="#EE1C47" />
                    ) : (
                      <>
                        <Ionicons name="locate" size={16} color="#EE1C47" />
                        <Text style={styles.autoFillText}>سحب تلقائي</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="أدخل العنوان الكامل"
                  placeholderTextColor="#999"
                  value={editAddress}
                  onChangeText={setEditAddress}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>ملاحظة / علامة مميزة للمكان</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="مثل: بجوار المدرسة، الطابق الثالث، إلخ..."
                  placeholderTextColor="#999"
                  value={editNotes}
                  onChangeText={setEditNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => {
                  setEditingOrder(null);
                  setEditAddress('');
                  setEditNotes('');
                }}
              >
                <Text style={styles.cancelModalButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalButton}
                onPress={handleSaveOrder}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveModalButtonText}>حفظ</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    padding: 16,
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
  filtersContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#EE1C47',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Platform.OS === 'web' ? 20 : 10,
  },
  contentWrapper: {
    padding: Platform.OS === 'web' ? 0 : 0,
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
  orderCard: {
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
    marginBottom: 16,
  },
  orderNumber: {
    fontSize: 16,
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
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
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
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    paddingRight: 24,
  },
  notesSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    paddingRight: 24,
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EE1C47',
    marginBottom: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EE1C47',
  },
  editButtonText: {
    fontSize: 14,
    color: '#EE1C47',
    fontWeight: '600',
  },
  deliveryInfo: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  autoFillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  autoFillText: {
    fontSize: 12,
    color: '#EE1C47',
    fontWeight: '600',
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
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelModalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelModalButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveModalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#EE1C47',
    alignItems: 'center',
  },
  saveModalButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});

