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
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import SweetAlert from '@/components/SweetAlert';
import * as Location from 'expo-location';

// بيانات المحافظات والمناطق المصرية
const EGYPT_GOVERNORATES: Record<string, string[]> = {
  'القاهرة': ['وسط البلد', 'المعادي', 'المقطم', 'مدينة نصر', 'شبرا', 'الزمالك', 'مصر الجديدة', 'العباسية', 'الدقي', 'المهندسين', 'الزيتون', 'حدائق القبة', 'المنيل', 'السيدة زينب', 'الفسطاط', 'الخليفة', 'المعصرة', 'التبين', 'طرة', 'حلوان'],
  'الجيزة': ['الدقي', 'المهندسين', 'العجوزة', 'المنيل', 'الزمالك', 'أكتوبر', '6 أكتوبر', 'الشيخ زايد', 'الهرم', 'كرداسة', 'أوسيم', 'البدرشين', 'الصف', 'أطفيح', 'منشأة القناطر', 'كفر غطاطي', 'أبو النمرس'],
  'الإسكندرية': ['المنتزه', 'سيدي بشر', 'سموحة', 'جليم', 'ستانلي', 'سيدي جابر', 'محطة الرمل', 'العطارين', 'المنشية', 'الرمل', 'باب شرقي', 'باب غربي', 'الأنفوشي', 'المعمورة', 'العجمي', 'أبو قير', 'برج العرب', 'برج العرب الجديدة'],
  'المنيا': ['المنيا', 'ملوي', 'دير مواس', 'مطاي', 'بني مزار', 'سمالوط', 'أبو قرقاص', 'مغاغة', 'عدوة'],
  'أسيوط': ['أسيوط', 'أبنوب', 'أبو تيج', 'ديروط', 'الغنايم', 'ساحل سليم', 'البداري', 'صدفا', 'الفتح', 'منفلوط'],
  'سوهاج': ['سوهاج', 'أخميم', 'البلينا', 'المراغة', 'المنشأة', 'طهطا', 'طما', 'جرجا', 'دار السلام', 'جهينة'],
  'قنا': ['قنا', 'قفط', 'نقادة', 'دشنا', 'فرشوط', 'أبو تشت', 'الوقف', 'الوقف الجديدة'],
  'الأقصر': ['الأقصر', 'إسنا', 'الطود', 'الزينية', 'أرمنت', 'بياضة'],
  'أسوان': ['أسوان', 'كوم أمبو', 'دراو', 'نصر النوبة', 'إدفو', 'كلابشة'],
  'البحر الأحمر': ['الغردقة', 'رأس غارب', 'سفاجا', 'القصير', 'مرسى علم', 'شلاتين', 'حلايب'],
  'الوادي الجديد': ['الخارجة', 'الداخلة', 'الفرافرة', 'باريس', 'بلاط'],
  'مطروح': ['مرسى مطروح', 'الحمام', 'السلوم', 'سيوة', 'النجيلة', 'رأس الحكمة'],
  'شمال سيناء': ['العريش', 'رفح', 'الشيخ زويد', 'بئر العبد', 'الحسنة', 'نخل'],
  'جنوب سيناء': ['الطور', 'شرم الشيخ', 'دهب', 'نويبع', 'طابا', 'سانت كاترين', 'رأس سدر'],
  'بورسعيد': ['بورسعيد', 'بورفؤاد'],
  'الإسماعيلية': ['الإسماعيلية', 'فايد', 'القنطرة شرق', 'القنطرة غرب', 'أبو صوير', 'التل الكبير'],
  'السويس': ['السويس', 'الأربعين', 'فيصل', 'عتاقة', 'الجناين'],
  'الشرقية': ['الزقازيق', 'أبو حماد', 'أبو كبير', 'بلبيس', 'ديرب نجم', 'فاقوس', 'الحسينية', 'كفر صقر', 'مشتول السوق', 'منيا القمح', 'ههيا', 'صان الحجر', 'أولاد صقر'],
  'الدقهلية': ['المنصورة', 'بلقاس', 'دكرنس', 'المنزلة', 'ميت غمر', 'أجا', 'الجمالية', 'شربين', 'طلخا', 'ميت سلسيل', 'نبروه', 'السنبلاوين', 'بني عبيد', 'المنزلة', 'كفر البطيخ'],
  'كفر الشيخ': ['كفر الشيخ', 'دسوق', 'فوه', 'مطوبس', 'بلطيم', 'الحامول', 'سيدي سالم', 'قلين', 'الرياض', 'سيدي غازي'],
  'الغربية': ['طنطا', 'المحلة الكبرى', 'زفتى', 'كفر الزيات', 'بسيون', 'قطور', 'سمنود', 'شبراخيت', 'السنطة', 'بسيون'],
  'المنوفية': ['شبين الكوم', 'منوف', 'أشمون', 'الباجور', 'قويسنا', 'تلا', 'بركة السبع', 'السادات', 'سرس الليان'],
  'البحيرة': ['دمنهور', 'رشيد', 'إدكو', 'أبو المطامير', 'أبو حمص', 'الدلنجات', 'المحمودية', 'حوش عيسى', 'شبراخيت', 'كوم حمادة', 'وادي النطرون', 'النوبارية الجديدة'],
  'القليوبية': ['بنها', 'قليوب', 'شبرا الخيمة', 'الخانكة', 'كفر شكر', 'طوخ', 'القناطر الخيرية', 'أبو زعبل'],
  'دمياط': ['دمياط', 'فارسكور', 'الزرقا', 'كفر البطيخ', 'رأس البر', 'عزبة البرج', 'السرو'],
  'بني سويف': ['بني سويف', 'الواسطي', 'ناصر', 'إهناسيا', 'ببا', 'سمسطا', 'الفشن', 'دشاش'],
  'الفيوم': ['الفيوم', 'طامية', 'سنورس', 'إطسا', 'أبشواي', 'يوسف الصديق'],
  'المنيا': ['المنيا', 'ملوي', 'دير مواس', 'مطاي', 'بني مزار', 'سمالوط', 'أبو قرقاص', 'مغاغة', 'عدوة'],
};

interface Address {
  id: string;
  user_id: string;
  label: string;
  address: string;
  phone: string;
  is_default: boolean;
  created_at: string;
}

export default function AddressesScreen() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    country: 'مصر',
    governorate: '',
    city: '',
    area: '',
    phone: '',
    notes: '',
    is_default: false,
  });
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [showGovernorateDropdown, setShowGovernorateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const router = useRouter();
  const sweetAlert = useSweetAlert();

  // الحصول على قائمة المدن حسب المحافظة المختارة
  const getCitiesForGovernorate = (governorate: string): string[] => {
    return EGYPT_GOVERNORATES[governorate] || [];
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      let userId: string | null = null;

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

      // For now, get address from user table
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
        `${supabaseUrl}/rest/v1/users?id=eq.${userId}&select=id,address,phone`,
        {
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.ok) {
        const userData = await response.json();
        if (userData[0] && userData[0].address) {
          setAddresses([{
            id: '1',
            user_id: userId,
            label: 'عنواني الرئيسي',
            address: userData[0].address,
            phone: userData[0].phone || '',
            is_default: true,
            created_at: new Date().toISOString(),
          }]);
        }
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.governorate.trim()) {
      sweetAlert.showError('خطأ', 'يرجى اختيار المحافظة');
      return;
    }

    if (!formData.city.trim()) {
      sweetAlert.showError('خطأ', 'يرجى اختيار المدينة/المنطقة');
      return;
    }

    if (!formData.area.trim()) {
      sweetAlert.showError('خطأ', 'يرجى إدخال المكان/القرية');
      return;
    }

    if (!formData.phone.trim()) {
      sweetAlert.showError('خطأ', 'يرجى إدخال رقم الهاتف');
      return;
    }

    // بناء العنوان الكامل
    const fullAddress = `${formData.area}، ${formData.city}، ${formData.governorate}، ${formData.country}`;

    try {
      let userId: string | null = null;
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

      if (!userId) return;

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
        `${supabaseUrl}/rest/v1/users?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            address: fullAddress,
            phone: formData.phone,
          }),
        }
      );

      if (response.ok) {
        sweetAlert.showSuccess('نجح', 'تم حفظ العنوان بنجاح', () => {
          setShowAddForm(false);
          setEditingAddress(null);
          setFormData({ label: '', country: 'مصر', governorate: '', city: '', area: '', phone: '', notes: '', is_default: false });
          loadAddresses();
        });
      } else {
        throw new Error('فشل حفظ العنوان');
      }
    } catch (error) {
      sweetAlert.showError('خطأ', 'فشل حفظ العنوان');
    }
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    // محاولة تحليل العنوان الموجود
    const addressParts = address.address.split('،');
    let governorate = '';
    let city = '';
    let area = '';
    
    if (addressParts.length >= 3) {
      area = addressParts[0]?.trim() || '';
      city = addressParts[1]?.trim() || '';
      governorate = addressParts[2]?.trim() || '';
    } else {
      // إذا لم يكن العنوان منسقاً، نضع كل شيء في area
      area = address.address;
    }
    
    setFormData({
      label: address.label,
      country: 'مصر',
      governorate: governorate,
      city: city,
      area: area,
      phone: address.phone,
      notes: '',
      is_default: address.is_default,
    });
    setShowAddForm(true);
  };

  const handleDelete = (address: Address) => {
    sweetAlert.showConfirm('حذف العنوان', 'هل أنت متأكد من حذف هذا العنوان؟', () => {
      // Delete logic here
      sweetAlert.showSuccess('نجح', 'تم حذف العنوان بنجاح', () => {
        loadAddresses();
      });
    });
  };

  // دالة لتحليل العنوان المسترجع وملء الحقول
  const parseAddress = (addressData: any) => {
    const address = addressData.address || {};
    let governorate = '';
    let city = '';
    let area = addressData.display_name || '';

    // محاولة استخراج المحافظة
    const governorateKeys = ['state', 'region', 'province'];
    for (const key of governorateKeys) {
      if (address[key]) {
        governorate = address[key];
        break;
      }
    }

    // محاولة استخراج المدينة/المنطقة
    const cityKeys = ['city', 'town', 'village', 'suburb', 'neighbourhood'];
    for (const key of cityKeys) {
      if (address[key]) {
        city = address[key];
        break;
      }
    }

    // إذا لم نجد محافظة في البيانات، نحاول البحث في display_name
    if (!governorate && addressData.display_name) {
      const displayName = addressData.display_name;
      // البحث عن محافظة مصرية في العنوان
      for (const gov of Object.keys(EGYPT_GOVERNORATES)) {
        if (displayName.includes(gov)) {
          governorate = gov;
          break;
        }
      }
    }

    // إذا لم نجد مدينة، نحاول البحث في display_name
    if (!city && governorate) {
      const cities = getCitiesForGovernorate(governorate);
      const displayName = addressData.display_name || '';
      for (const c of cities) {
        if (displayName.includes(c)) {
          city = c;
          break;
        }
      }
    }

    // استخراج المكان/القرية من display_name
    if (addressData.display_name) {
      const parts = addressData.display_name.split(',');
      if (parts.length > 0) {
        area = parts[0].trim();
      }
    }

    setFormData(prev => ({
      ...prev,
      country: 'مصر',
      governorate: governorate || prev.governorate,
      city: city || prev.city,
      area: area || prev.area,
    }));
  };

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
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar&addressdetails=1`,
                {
                  headers: {
                    'User-Agent': 'Nemu App'
                  }
                }
              );
              const data = await response.json();
              if (data) {
                parseAddress(data);
              }
            } catch (error) {
              console.error('Error getting address:', error);
              sweetAlert.showError('خطأ', 'فشل الحصول على العنوان');
            } finally {
              setLoadingAddress(false);
            }
          }, (error) => {
            console.error('Geolocation error:', error);
            sweetAlert.showError('خطأ', 'فشل الحصول على الموقع');
            setLoadingAddress(false);
          });
        } else {
          sweetAlert.showError('خطأ', 'المتصفح لا يدعم تحديد الموقع');
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
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'Nemu App'
            }
          }
        );
        const data = await response.json();
        if (data) {
          parseAddress(data);
        }
        setLoadingAddress(false);
      }
    } catch (error) {
      console.error('Error getting address:', error);
      sweetAlert.showError('خطأ', 'فشل الحصول على العنوان');
      setLoadingAddress(false);
    }
  };

  const handleBack = () => {
    if (Platform.OS === 'web') {
      // على الويب، إذا كان هناك تاريخ سابق، استخدم back، وإلا اذهب للصفحة الرئيسية
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push('/');
      }
    } else {
      router.back();
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
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>عناوين التوصيل</Text>
        <TouchableOpacity 
          onPress={() => {
            setShowAddForm(true);
            setEditingAddress(null);
            setFormData({ label: '', country: 'مصر', governorate: '', city: '', area: '', phone: '', notes: '', is_default: false });
            setShowGovernorateDropdown(false);
            setShowCityDropdown(false);
          }} 
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color="#EE1C47" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.contentWrapper, { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
          {addresses.length === 0 && !showAddForm ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={80} color="#ccc" />
              <Text style={styles.emptyText}>لا توجد عناوين</Text>
              <TouchableOpacity
                style={styles.addFirstButton}
                onPress={() => setShowAddForm(true)}
              >
                <Text style={styles.addFirstButtonText}>إضافة عنوان جديد</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {addresses.map((address) => (
                <View key={address.id} style={styles.addressCard}>
                  <View style={styles.addressHeader}>
                    <View style={styles.addressInfo}>
                      <Text style={styles.addressLabel}>{address.label}</Text>
                      {address.is_default && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>افتراضي</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.addressActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEdit(address)}
                      >
                        <Ionicons name="create-outline" size={20} color="#666" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDelete(address)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#f44336" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.addressText}>{address.address}</Text>
                  {address.phone && (
                    <Text style={styles.addressPhone}>
                      <Ionicons name="call-outline" size={16} color="#666" /> {address.phone}
                    </Text>
                  )}
                </View>
              ))}

              {showAddForm && (
                <View style={styles.formCard}>
                  <Text style={styles.formTitle}>
                    {editingAddress ? 'تعديل العنوان' : 'إضافة عنوان جديد'}
                  </Text>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>اسم العنوان</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="مثل: المنزل، العمل"
                      placeholderTextColor="#999"
                      value={formData.label}
                      onChangeText={(text) => setFormData({ ...formData, label: text })}
                    />
                  </View>

                  {/* البلد */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>البلد</Text>
                    <View style={styles.readOnlyInput}>
                      <Text style={styles.readOnlyText}>{formData.country}</Text>
                    </View>
                  </View>

                  {/* المحافظة */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>المحافظة *</Text>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => {
                        setShowGovernorateDropdown(!showGovernorateDropdown);
                        setShowCityDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownButtonText, !formData.governorate && styles.placeholderText]}>
                        {formData.governorate || 'اختر المحافظة'}
                      </Text>
                      <Ionicons name={showGovernorateDropdown ? "chevron-up" : "chevron-down"} size={20} color="#666" />
                    </TouchableOpacity>
                    {showGovernorateDropdown && (
                      <View style={styles.dropdownContainer}>
                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                          {Object.keys(EGYPT_GOVERNORATES).map((gov) => (
                            <TouchableOpacity
                              key={gov}
                              style={[styles.dropdownItem, formData.governorate === gov && styles.dropdownItemActive]}
                              onPress={() => {
                                setFormData({ ...formData, governorate: gov, city: '' });
                                setShowGovernorateDropdown(false);
                                setShowCityDropdown(false);
                              }}
                            >
                              <Text style={[styles.dropdownItemText, formData.governorate === gov && styles.dropdownItemTextActive]}>
                                {gov}
                              </Text>
                              {formData.governorate === gov && (
                                <Ionicons name="checkmark" size={18} color="#EE1C47" />
                              )}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* المدينة/المنطقة */}
                  {formData.governorate && (
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>المدينة/المنطقة *</Text>
                      <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={() => {
                          if (getCitiesForGovernorate(formData.governorate).length > 0) {
                            setShowCityDropdown(!showCityDropdown);
                            setShowGovernorateDropdown(false);
                          }
                        }}
                        disabled={getCitiesForGovernorate(formData.governorate).length === 0}
                      >
                        <Text style={[styles.dropdownButtonText, !formData.city && styles.placeholderText]}>
                          {formData.city || 'اختر المدينة/المنطقة'}
                        </Text>
                        <Ionicons name={showCityDropdown ? "chevron-up" : "chevron-down"} size={20} color="#666" />
                      </TouchableOpacity>
                      {showCityDropdown && getCitiesForGovernorate(formData.governorate).length > 0 && (
                        <View style={styles.dropdownContainer}>
                          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                            {getCitiesForGovernorate(formData.governorate).map((city) => (
                              <TouchableOpacity
                                key={city}
                                style={[styles.dropdownItem, formData.city === city && styles.dropdownItemActive]}
                                onPress={() => {
                                  setFormData({ ...formData, city });
                                  setShowCityDropdown(false);
                                }}
                              >
                                <Text style={[styles.dropdownItemText, formData.city === city && styles.dropdownItemTextActive]}>
                                  {city}
                                </Text>
                                {formData.city === city && (
                                  <Ionicons name="checkmark" size={18} color="#EE1C47" />
                                )}
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  )}

                  {/* المكان/القرية */}
                  <View style={styles.inputContainer}>
                    <View style={styles.inputLabelRow}>
                      <Text style={styles.inputLabel}>المكان/القرية *</Text>
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
                      style={styles.textInput}
                      placeholder="أدخل المكان أو القرية بالتفصيل"
                      placeholderTextColor="#999"
                      value={formData.area}
                      onChangeText={(text) => setFormData({ ...formData, area: text })}
                    />
                  </View>

                  {/* الملاحظات */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>ملاحظات (اختياري)</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      placeholder="ملاحظات إضافية عن العنوان..."
                      placeholderTextColor="#999"
                      value={formData.notes}
                      onChangeText={(text) => setFormData({ ...formData, notes: text })}
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  {/* رقم الهاتف */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>رقم الهاتف *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="أدخل رقم الهاتف"
                      placeholderTextColor="#999"
                      value={formData.phone}
                      onChangeText={(text) => setFormData({ ...formData, phone: text })}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.formActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setShowAddForm(false);
                        setEditingAddress(null);
                        setFormData({ label: '', country: 'مصر', governorate: '', city: '', area: '', phone: '', notes: '', is_default: false });
                        setShowGovernorateDropdown(false);
                        setShowCityDropdown(false);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>إلغاء</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleSave}
                    >
                      <Text style={styles.saveButtonText}>حفظ</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
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
  addButton: {
    padding: 4,
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
    marginBottom: 24,
  },
  addFirstButton: {
    backgroundColor: '#EE1C47',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addressCard: {
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
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addressInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  defaultBadge: {
    backgroundColor: '#EE1C47',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  addressActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  addressPhone: {
    fontSize: 14,
    color: '#666',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  formCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#EE1C47',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  readOnlyInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F5F5F5',
    minHeight: 44,
    justifyContent: 'center',
  },
  readOnlyText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    minHeight: 44,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  dropdownContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#fff',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemActive: {
    backgroundColor: '#FFF5F5',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dropdownItemTextActive: {
    color: '#EE1C47',
    fontWeight: '600',
  },
});

