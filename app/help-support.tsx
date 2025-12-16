import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HelpSupportScreen() {
  const router = useRouter();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const faqItems = [
    {
      id: '1',
      question: 'كيف يمكنني تتبع طلبي؟',
      answer: 'يمكنك تتبع طلبك من صفحة "طلباتي" في حسابك. ستحصل على تحديثات فورية عن حالة الطلب.',
    },
    {
      id: '2',
      question: 'ما هي طرق الدفع المتاحة؟',
      answer: 'نوفر الدفع عند الاستلام (نقداً، فودافون كاش، انستا باي). يمكنك اختيار طريقة الدفع المفضلة عند إتمام الطلب.',
    },
    {
      id: '3',
      question: 'ما هي مدة التوصيل؟',
      answer: 'عادة ما يتم التوصيل خلال 3-7 أيام عمل حسب موقعك. يمكنك رؤية الوقت المتوقع للتوصيل في صفحة الطلب.',
    },
    {
      id: '4',
      question: 'هل يمكنني إرجاع المنتج؟',
      answer: 'نعم، يمكنك إرجاع المنتج خلال 7 أيام من تاريخ الاستلام. يرجى التواصل مع خدمة العملاء لبدء عملية الإرجاع.',
    },
    {
      id: '5',
      question: 'كيف يمكنني تحديث معلوماتي؟',
      answer: 'يمكنك تحديث معلوماتك من صفحة "الإعدادات" ثم "الملف الشخصي".',
    },
  ];

  const contactMethods = [
    {
      id: 'phone',
      title: 'اتصل بنا',
      description: '01234567890',
      icon: 'call-outline',
      action: () => Linking.openURL('tel:01234567890'),
    },
    {
      id: 'email',
      title: 'راسلنا',
      description: 'support@nemu.com',
      icon: 'mail-outline',
      action: () => Linking.openURL('mailto:support@nemu.com'),
    },
    {
      id: 'whatsapp',
      title: 'واتساب',
      description: '01234567890',
      icon: 'logo-whatsapp',
      action: () => Linking.openURL('https://wa.me/201234567890'),
    },
  ];

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

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
        <Text style={styles.headerTitle}>المساعدة والدعم</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.contentWrapper, { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
          {/* Contact Methods */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>تواصل معنا</Text>
            {contactMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={styles.contactCard}
                onPress={method.action}
              >
                <View style={styles.contactLeft}>
                  <View style={styles.contactIconContainer}>
                    <Ionicons name={method.icon as any} size={24} color="#EE1C47" />
                  </View>
                  <View>
                    <Text style={styles.contactTitle}>{method.title}</Text>
                    <Text style={styles.contactDescription}>{method.description}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            ))}
          </View>

          {/* FAQ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الأسئلة الشائعة</Text>
            {faqItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.faqItem}
                onPress={() => toggleSection(item.id)}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Ionicons
                    name={expandedSection === item.id ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#666"
                  />
                </View>
                {expandedSection === item.id && (
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Links */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>روابط سريعة</Text>
            
            <TouchableOpacity style={styles.linkItem}>
              <View style={styles.linkLeft}>
                <Ionicons name="document-text-outline" size={24} color="#333" />
                <Text style={styles.linkText}>شروط الاستخدام</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkItem}>
              <View style={styles.linkLeft}>
                <Ionicons name="shield-outline" size={24} color="#333" />
                <Text style={styles.linkText}>سياسة الخصوصية</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkItem}>
              <View style={styles.linkLeft}>
                <Ionicons name="return-down-back-outline" size={24} color="#333" />
                <Text style={styles.linkText}>سياسة الإرجاع والاستبدال</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkItem}>
              <View style={styles.linkLeft}>
                <Ionicons name="car-outline" size={24} color="#333" />
                <Text style={styles.linkText}>معلومات الشحن</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  section: {
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    padding: 16,
    paddingBottom: 12,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 14,
    color: '#666',
  },
  faqItem: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    lineHeight: 20,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  linkText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
});












