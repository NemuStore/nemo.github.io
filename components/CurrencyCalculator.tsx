import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useDarkMode } from '@/contexts/DarkModeContext';

interface CurrencyRate {
  currency_code: string;
  currency_name: string;
  rate_to_egp: number;
  last_updated: string;
}

interface CurrencyCalculatorProps {
  onPriceCalculated?: (priceInEgp: number) => void;
}

// قائمة افتراضية للعملات (في حالة فشل التحميل)
// تم تحديث القيم الافتراضية لتطابق الأسعار المحدثة في قاعدة البيانات
const DEFAULT_CURRENCY_RATES: CurrencyRate[] = [
  { currency_code: 'AED', currency_name: 'درهم إماراتي', rate_to_egp: 12.99, last_updated: '', is_active: true },
  { currency_code: 'USD', currency_name: 'دولار أمريكي', rate_to_egp: 47.76, last_updated: '', is_active: true },
  { currency_code: 'EUR', currency_name: 'يورو', rate_to_egp: 55.04, last_updated: '', is_active: true },
  { currency_code: 'EGP', currency_name: 'جنيه مصري', rate_to_egp: 1, last_updated: '', is_active: true },
];

export default function CurrencyCalculator({ onPriceCalculated }: CurrencyCalculatorProps) {
  const [visible, setVisible] = useState(false);
  const [currencyRates, setCurrencyRates] = useState<CurrencyRate[]>(DEFAULT_CURRENCY_RATES);
  const [isUsingDefaultRates, setIsUsingDefaultRates] = useState(true); // تتبع ما إذا كانت القيم افتراضية
  const [loading, setLoading] = useState(false);
  const [fromCurrency, setFromCurrency] = useState('AED');
  const [toCurrency, setToCurrency] = useState('EGP');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<number | null>(null);
  const { isDarkMode, colors } = useDarkMode();

  useEffect(() => {
    if (visible) {
      // استخدم القائمة الافتراضية أولاً
      setCurrencyRates(DEFAULT_CURRENCY_RATES);
      setIsUsingDefaultRates(true); // في البداية، نستخدم القيم الافتراضية
      setResult(null); // إعادة تعيين النتيجة
      setLoading(false); // تأكد من أن loading = false في البداية
      
      // ثم حاول تحميل البيانات من قاعدة البيانات (في الخلفية بدون تعطيل الزر)
      // استخدم setTimeout لتأخير التحميل قليلاً حتى تظهر النافذة أولاً
      const timer = setTimeout(() => {
        loadCurrencyRates();
      }, 200);
      
      return () => clearTimeout(timer);
    } else {
      // عند إغلاق النافذة، أعد تعيين القيم
      setAmount('');
      setResult(null);
      setLoading(false);
    }
  }, [visible]);

  const loadCurrencyRates = async () => {
    // لا نعطل الزر أثناء التحميل - التحميل في الخلفية
    try {
      console.log('📡 محاولة جلب أسعار العملات من قاعدة البيانات...');
      
      // استخدام fetch مباشرة (مثل admin.tsx) لضمان العمل على web
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn('⚠️ مفاتيح Supabase غير موجودة');
        setIsUsingDefaultRates(true);
        return;
      }
      
      const url = `${supabaseUrl}/rest/v1/currency_exchange_rates?select=*&is_active=eq.true&order=currency_code.asc`;
      
      const response = await fetch(url, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        console.warn('⚠️ لا توجد بيانات في قاعدة البيانات');
        console.log('📋 استخدام القائمة الافتراضية (قيم ثابتة)');
        setIsUsingDefaultRates(true);
        return;
      }
      
      console.log('✅ تم جلب', data.length, 'عملة من قاعدة البيانات');
      console.log('📦 البيانات الخام:', data);
      
      // تحويل البيانات وتأكد من أن rate_to_egp هو number
      const rates = data.map((rate: any) => {
        const convertedRate = typeof rate.rate_to_egp === 'string' 
          ? parseFloat(rate.rate_to_egp) 
          : (typeof rate.rate_to_egp === 'number' ? rate.rate_to_egp : 0);
        
        return {
          ...rate,
          rate_to_egp: convertedRate,
        };
      });
      
      console.log('📊 الأسعار المحملة والمحولة:', rates.map(r => `${r.currency_code}: ${r.rate_to_egp} (نوع: ${typeof r.rate_to_egp})`));
      
      // إضافة EGP كعملة افتراضية (1 EGP = 1 EGP)
      const egpRate = {
        currency_code: 'EGP',
        currency_name: 'جنيه مصري',
        rate_to_egp: 1,
        last_updated: new Date().toISOString(),
        is_active: true,
      };
      
      // التحقق من أن EGP غير موجودة بالفعل
      if (!rates.find(r => r.currency_code === 'EGP')) {
        rates.push(egpRate);
      }
      
      if (rates.length > 0) {
        console.log('✅ تحديث أسعار العملات من قاعدة البيانات');
        console.log('📊 الأسعار المحدثة (قبل setState):', rates);
        setCurrencyRates(rates);
        setIsUsingDefaultRates(false); // الآن نستخدم القيم من قاعدة البيانات
        console.log('✅ تم استدعاء setCurrencyRates');
      } else {
        console.log('⚠️ لا توجد بيانات صالحة، استخدام القائمة الافتراضية');
        setIsUsingDefaultRates(true); // ما زلنا نستخدم القيم الافتراضية
      }
    } catch (error: any) {
      console.error('❌ خطأ في جلب أسعار العملات:', error);
      console.error('❌ تفاصيل الخطأ:', error?.message || error, error?.stack);
      console.log('📋 استخدام القائمة الافتراضية (قيم ثابتة)');
      setIsUsingDefaultRates(true);
      // في حالة الخطأ، استخدم القائمة الافتراضية (موجودة بالفعل)
    }
  };

  const calculateExchange = () => {
    console.log('🔢 calculateExchange called', { amount, fromCurrency, toCurrency, currencyRatesLength: currencyRates.length });
    
    if (!amount || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
      Alert.alert('خطأ', 'يرجى إدخال مبلغ صحيح');
      return;
    }

    if (currencyRates.length === 0) {
      Alert.alert('خطأ', 'لم يتم تحميل أسعار العملات بعد. يرجى الانتظار...');
      return;
    }

    const fromRate = currencyRates.find((r) => r.currency_code === fromCurrency);
    const toRate = currencyRates.find((r) => r.currency_code === toCurrency);

    if (!fromRate) {
      Alert.alert('خطأ', `لم يتم العثور على سعر صرف للعملة: ${fromCurrency}`);
      return;
    }

    if (!toRate) {
      Alert.alert('خطأ', `لم يتم العثور على سعر صرف للعملة: ${toCurrency}`);
      return;
    }

    console.log('📊 Rates found:', { fromRate: fromRate.rate_to_egp, toRate: toRate.rate_to_egp });

    // تحويل من العملة الأولى إلى EGP ثم إلى العملة الثانية
    const amountInEgp = parseFloat(amount) * fromRate.rate_to_egp;
    const finalAmount = amountInEgp / toRate.rate_to_egp;

    console.log('✅ Calculation result:', finalAmount);
    setResult(finalAmount);

    // إذا كانت العملة الهدف هي EGP، أرسل النتيجة
    if (toCurrency === 'EGP' && onPriceCalculated) {
      onPriceCalculated(finalAmount);
    }
  };

  const styles = StyleSheet.create({
    floatingButton: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#EE1C47',
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      zIndex: 1000,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        },
        android: {
          elevation: 5,
        },
        web: {
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)',
        },
      }),
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderRadius: 20,
      padding: 16,
      width: Platform.OS === 'web' ? '400px' : '85%',
      maxWidth: Platform.OS === 'web' ? '400px' : 500,
      maxHeight: '60%',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        },
        android: {
          elevation: 5,
        },
        web: {
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
      }),
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    closeButton: {
      padding: 5,
    },
    inputContainer: {
      marginBottom: 15,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.card,
    },
    currencySelector: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 15,
    },
    currencyButton: {
      flex: 1,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      minHeight: 60,
      justifyContent: 'center',
    },
    currencyButtonActive: {
      borderColor: '#EE1C47',
      backgroundColor: '#EE1C4710',
    },
    currencyButtonText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '600',
    },
    calculateButton: {
      backgroundColor: '#EE1C47',
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 10,
    },
    calculateButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    resultContainer: {
      marginTop: 20,
      padding: 15,
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    resultLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 5,
    },
    resultValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#EE1C47',
    },
    ratesList: {
      marginTop: 15,
      maxHeight: 120,
    },
    ratesTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 10,
    },
    rateItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 10,
      backgroundColor: colors.card,
      borderRadius: 8,
      marginBottom: 5,
    },
    rateCode: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    rateValue: {
      fontSize: 14,
      color: colors.textSecondary,
    },
  });

  return (
    <>
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="calculator" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>حاسبة العملات</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>المبلغ</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="أدخل المبلغ"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>من</Text>
                {currencyRates.length > 0 ? (
                  <View style={styles.currencySelector}>
                    {currencyRates.map((rate) => (
                      <TouchableOpacity
                        key={rate.currency_code}
                        style={[
                          styles.currencyButton,
                          fromCurrency === rate.currency_code && styles.currencyButtonActive,
                        ]}
                        onPress={() => setFromCurrency(rate.currency_code)}
                      >
                        <Text style={styles.currencyButtonText} numberOfLines={1}>
                          {rate.currency_name}
                        </Text>
                        <Text style={[styles.currencyButtonText, { fontSize: 12, marginTop: 2, opacity: 0.7 }]}>
                          {rate.currency_code}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.label, { color: colors.textSecondary, fontStyle: 'italic' }]}>
                    جاري تحميل العملات...
                  </Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>إلى</Text>
                {currencyRates.length > 0 ? (
                  <View style={styles.currencySelector}>
                    {currencyRates.map((rate) => (
                      <TouchableOpacity
                        key={rate.currency_code}
                        style={[
                          styles.currencyButton,
                          toCurrency === rate.currency_code && styles.currencyButtonActive,
                        ]}
                        onPress={() => setToCurrency(rate.currency_code)}
                      >
                        <Text style={styles.currencyButtonText} numberOfLines={1}>
                          {rate.currency_name}
                        </Text>
                        <Text style={[styles.currencyButtonText, { fontSize: 12, marginTop: 2, opacity: 0.7 }]}>
                          {rate.currency_code}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.label, { color: colors.textSecondary, fontStyle: 'italic' }]}>
                    جاري تحميل العملات...
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.calculateButton, currencyRates.length === 0 && { opacity: 0.6 }]}
                onPress={() => {
                  console.log('🔘 Calculate button pressed');
                  calculateExchange();
                }}
                disabled={currencyRates.length === 0}
              >
                <Text style={styles.calculateButtonText}>
                  {currencyRates.length === 0 ? 'لا توجد عملات' : 'احسب'}
                </Text>
              </TouchableOpacity>

              {result !== null && (
                <View style={styles.resultContainer}>
                  <Text style={styles.resultLabel}>النتيجة</Text>
                  <Text style={styles.resultValue}>
                    {result.toFixed(2)} {toCurrency}
                  </Text>
                </View>
              )}

              <View style={styles.ratesList}>
                <Text style={styles.ratesTitle}>أسعار الصرف الحالية</Text>
                {currencyRates.map((rate) => (
                  <View key={rate.currency_code} style={styles.rateItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rateCode}>
                        {rate.currency_name} ({rate.currency_code})
                      </Text>
                      {rate.last_updated && (
                        <Text style={[styles.rateValue, { fontSize: 10, marginTop: 2 }]}>
                          آخر تحديث: {new Date(rate.last_updated).toLocaleDateString('ar-EG')}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.rateValue}>
                      {rate.rate_to_egp.toFixed(4)} EGP
                    </Text>
                  </View>
                ))}
                {!isUsingDefaultRates && (
                  <Text style={[styles.rateValue, { fontSize: 11, marginTop: 8, fontStyle: 'italic', textAlign: 'center', color: '#4CAF50' }]}>
                    ✅ أسعار محدثة من قاعدة البيانات
                  </Text>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

