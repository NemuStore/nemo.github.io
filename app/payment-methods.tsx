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
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import SweetAlert from '@/components/SweetAlert';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}

export default function PaymentMethodsScreen() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const router = useRouter();
  const sweetAlert = useSweetAlert();

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      
      // Load payment methods from database or use defaults
      // For now, we'll use default methods that admin can configure
      const defaultMethods: PaymentMethod[] = [
        {
          id: 'cash_on_delivery',
          name: 'الدفع عند الاستلام',
          description: 'ادفع نقداً عند استلام الطلب',
          icon: 'cash',
          enabled: true,
        },
        {
          id: 'vodafone_cash',
          name: 'فودافون كاش',
          description: 'ادفع عبر فودافون كاش',
          icon: 'phone-portrait',
          enabled: true,
        },
        {
          id: 'instapay',
          name: 'انستا باي',
          description: 'ادفع عبر انستا باي',
          icon: 'card',
          enabled: true,
        },
      ];

      // Try to load from database if exists
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      try {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/payment_methods?select=*&enabled=eq.true&order=display_order`,
          {
            headers: {
              'apikey': supabaseKey || '',
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            setPaymentMethods(data.map((item: any) => ({
              id: item.id,
              name: item.name,
              description: item.description || '',
              icon: item.icon || 'card',
              enabled: item.enabled,
            })));
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.log('Using default payment methods');
      }

      setPaymentMethods(defaultMethods);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMethod = (methodId: string) => {
    setSelectedMethod(methodId);
    sweetAlert.showSuccess('تم', 'تم اختيار طريقة الدفع بنجاح');
  };

  const getIconName = (icon: string) => {
    const iconMap: Record<string, string> = {
      cash: 'cash-outline',
      'phone-portrait': 'phone-portrait-outline',
      card: 'card-outline',
    };
    return iconMap[icon] || 'card-outline';
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
        <Text style={styles.headerTitle}>طرق الدفع</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.contentWrapper, { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
          <Text style={styles.sectionDescription}>
            اختر طريقة الدفع المفضلة لديك. يمكن للمدير تفعيل أو تعطيل طرق الدفع من لوحة الإدارة.
          </Text>

          {paymentMethods.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="card-outline" size={80} color="#ccc" />
              <Text style={styles.emptyText}>لا توجد طرق دفع متاحة</Text>
            </View>
          ) : (
            paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentCard,
                  selectedMethod === method.id && styles.paymentCardSelected,
                ]}
                onPress={() => handleSelectMethod(method.id)}
              >
                <View style={styles.paymentCardLeft}>
                  <View style={styles.iconContainer}>
                    <Ionicons name={getIconName(method.icon) as any} size={28} color="#EE1C47" />
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentName}>{method.name}</Text>
                    <Text style={styles.paymentDescription}>{method.description}</Text>
                  </View>
                </View>
                <View style={styles.paymentCardRight}>
                  {selectedMethod === method.id ? (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="checkmark-circle" size={24} color="#EE1C47" />
                    </View>
                  ) : (
                    <View style={styles.radioButton}>
                      <View style={styles.radioButtonInner} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={24} color="#2196F3" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>معلومات مهمة</Text>
              <Text style={styles.infoText}>
                • الدفع عند الاستلام متاح لجميع الطلبات{'\n'}
                • فودافون كاش و انستا باي متاحان للطلبات التي تتجاوز 100 جنيه{'\n'}
                • يمكن للمدير تعديل طرق الدفع من لوحة الإدارة
              </Text>
            </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Platform.OS === 'web' ? 20 : 10,
  },
  contentWrapper: {
    padding: Platform.OS === 'web' ? 0 : 0,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
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
  paymentCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentCardSelected: {
    borderWidth: 2,
    borderColor: '#EE1C47',
  },
  paymentCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  paymentDescription: {
    fontSize: 14,
    color: '#666',
  },
  paymentCardRight: {
    marginLeft: 12,
  },
  selectedBadge: {
    // Already styled
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
});






