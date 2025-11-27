import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Product, Category, Section } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCart } from '@/contexts/CartContext';
import CountdownTimer from '@/components/CountdownTimer';
import { useDarkMode } from '@/contexts/DarkModeContext';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
// Responsive item width: Web gets more columns, mobile gets 2 columns
const itemWidth = isWeb 
  ? Math.min(250, Math.floor((Math.min(width, 1400) - 60) / 4)) // Max 4 columns on web, centered
  : (width - 40) / 2; // 2 columns on mobile
const maxContainerWidth = isWeb ? 1400 : width; // Max width for web container

export default function HomeScreen() {
  const { colors, isDarkMode } = useDarkMode();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadSections();
  }, []);

  useEffect(() => {
    // Reset category selection when section changes
    setSelectedCategory(null);
  }, [selectedSection]);

  const loadProducts = async () => {
    let timeoutId: NodeJS.Timeout | null = null;
    let timeoutTriggered = false;
    
    try {
      setLoading(true);
      setError(null);
      console.log('🛍️ Loading products...');
      console.log('🔗 Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...');
      console.log('🔑 Supabase Key exists:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
      
      // Add timeout to prevent infinite loading (reduced to 5 seconds)
      timeoutId = setTimeout(() => {
        timeoutTriggered = true;
        console.warn('⚠️ Query timeout - taking too long');
        setError('استغرق التحميل وقتاً طويلاً. يرجى المحاولة مرة أخرى.');
        setLoading(false);
      }, 5000);

      const startTime = Date.now();
      console.log('📡 Sending query...');
      
      // Use fetch directly since Supabase client has issues on web
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      console.log('🌐 Using direct fetch (Supabase client has issues on web)...');
      const response = await fetch(`${supabaseUrl}/rest/v1/products?select=*&order=created_at.desc`, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${supabaseKey || ''}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      });
      
      console.log('📡 Fetch status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Fetch error:', errorText);
        setError('حدث خطأ في تحميل المنتجات');
        setProducts([]);
        if (timeoutId) clearTimeout(timeoutId);
        return;
      }
      
      const data = await response.json();
      const endTime = Date.now();
      
      if (timeoutId) clearTimeout(timeoutId);

      if (timeoutTriggered) {
        console.log('⚠️ Timeout was triggered, ignoring response');
        return;
      }

      console.log(`⏱️ Query took ${endTime - startTime}ms`);
      console.log('✅ Products loaded:', data?.length || 0, 'products');
      
      // Load primary images for all products in parallel
      if (data && data.length > 0) {
        const productIds = data.map((p: any) => p.id);
        
        try {
          const primaryImagesResponse = await fetch(
            `${supabaseUrl}/rest/v1/product_images?select=product_id,image_url&is_primary=eq.true&variant_id=is.null&product_id=in.(${productIds.map((id: string) => `"${id}"`).join(',')})`,
            {
              headers: {
                'apikey': supabaseKey || '',
                'Authorization': `Bearer ${supabaseKey || ''}`,
                'Content-Type': 'application/json',
              }
            }
          );
          
          if (primaryImagesResponse.ok) {
            const primaryImagesData = await primaryImagesResponse.json();
            const primaryImagesMap: { [key: string]: string } = {};
            
            primaryImagesData.forEach((img: any) => {
              if (!primaryImagesMap[img.product_id]) {
                primaryImagesMap[img.product_id] = img.image_url;
              }
            });
            
            // Add primary_image_url to each product
            const productsWithImages = data.map((product: any) => ({
              ...product,
              primary_image_url: primaryImagesMap[product.id] || null,
            }));
            
            setProducts(productsWithImages || []);
            console.log('✅ Products with primary images loaded');
          } else {
            setProducts(data || []);
          }
        } catch (imgError) {
          console.warn('⚠️ Error loading primary images:', imgError);
          setProducts(data || []);
        }
      } else {
        setProducts(data || []);
      }
      
      if (data && data.length > 0) {
        console.log('📦 First product:', data[0].name);
      }
    } catch (error: any) {
      if (timeoutId) clearTimeout(timeoutId);
      if (timeoutTriggered) return;
      
      console.error('❌ Error loading products:', error);
      console.error('❌ Error stack:', error.stack);
      setError(error.message || 'حدث خطأ في تحميل المنتجات');
      setProducts([]);
    } finally {
      if (!timeoutTriggered) {
        setLoading(false);
        console.log('✅ Loading finished');
      }
    }
  };

  const loadSections = async () => {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${supabaseUrl}/rest/v1/sections?select=*&is_active=eq.true&order=display_order.asc,name.asc`, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${supabaseKey || ''}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSections(data || []);
      }
    } catch (error) {
      console.error('Error loading sections:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      // Load categories with their sections
      const response = await fetch(`${supabaseUrl}/rest/v1/categories?select=*,sections(*)&is_active=eq.true&order=display_order.asc,name.asc`, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${supabaseKey || ''}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // Filter categories by selected section
  const filteredCategories = selectedSection
    ? categories.filter(cat => cat.section_id === selectedSection)
    : categories;

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Check category match
    const matchesCategory = !selectedCategory || 
      (product.category_id === selectedCategory) || 
      (product.category === selectedCategory); // Backward compatibility
    
    // Check section match - find category in loaded categories and check its section_id
    let matchesSection = true;
    if (selectedSection) {
      if (product.category_id) {
        // Find the category in the loaded categories
        const productCategory = categories.find(cat => cat.id === product.category_id);
        matchesSection = productCategory?.section_id === selectedSection;
      } else {
        // If no category_id, don't match any section filter
        matchesSection = false;
      }
    }
    
    return matchesSearch && matchesCategory && matchesSection;
  });

  const handleProductPress = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  // Get discount from database fields
  const getDiscount = (product: Product): number => {
    // Check if limited time discount is active
    if (product.limited_time_discount_percentage && 
        product.limited_time_discount_end_date) {
      const endDate = new Date(product.limited_time_discount_end_date);
      const now = new Date();
      if (endDate > now) {
        // Limited time discount is active
        return product.limited_time_discount_percentage;
      }
    }
    
    // Use regular discount_percentage from database if available
    if (product.discount_percentage && product.discount_percentage > 0) {
      return product.discount_percentage;
    }
    return 0;
  };

  const hasDiscount = (product: Product): boolean => {
    // Check if limited time discount is active
    if (product.limited_time_discount_percentage && 
        product.limited_time_discount_end_date) {
      const endDate = new Date(product.limited_time_discount_end_date);
      const now = new Date();
      if (endDate > now && product.stock_quantity > 0) {
        return true;
      }
    }
    
    // Check if product has regular discount from database
    return product.discount_percentage !== null && 
           product.discount_percentage > 0 && 
           product.stock_quantity > 0;
  };
  
  const isLimitedDiscountActive = (product: Product): boolean => {
    if (product.limited_time_discount_percentage && 
        product.limited_time_discount_end_date) {
      const endDate = new Date(product.limited_time_discount_end_date);
      const now = new Date();
      return endDate > now;
    }
    return false;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="ابحث عن منتج..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Lightning Deals Banner (inspired by Temu) */}
      {filteredProducts.length > 0 && !loading && (
        <View style={[styles.dealsBanner, { backgroundColor: isDarkMode ? '#2D1B0E' : '#FFF3E0' }]}>
          <View style={styles.dealsBannerContent}>
            <Ionicons name="flash" size={20} color="#FF6B00" />
            <Text style={[styles.dealsBannerText, { color: '#FF6B00' }]}>عروض محدودة - خصومات تصل إلى 50%</Text>
          </View>
        </View>
      )}

      {/* Sections Section */}
      {sections.length > 0 && !loading && (
        <View style={styles.categoriesContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>الأقسام</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip, 
                !selectedSection && styles.categoryChipActive,
                !selectedSection && { backgroundColor: colors.surface, borderColor: colors.border }
              ]}
              onPress={() => {
                setSelectedSection(null);
                setSelectedCategory(null);
              }}
            >
              <Text style={[
                styles.categoryChipText, 
                !selectedSection && styles.categoryChipTextActive,
                !selectedSection && { color: colors.textSecondary }
              ]}>
                الكل
              </Text>
            </TouchableOpacity>
            {sections.map((section) => (
              <TouchableOpacity
                key={section.id}
                style={[
                  styles.categoryChip, 
                  selectedSection === section.id && styles.categoryChipActive,
                  selectedSection !== section.id && { backgroundColor: colors.surface, borderColor: colors.border }
                ]}
                onPress={() => {
                  setSelectedSection(section.id);
                  setSelectedCategory(null);
                }}
              >
                {section.icon && (
                  <Ionicons 
                    name={section.icon as any} 
                    size={16} 
                    color={selectedSection === section.id ? '#fff' : colors.textSecondary} 
                    style={{ marginRight: 5 }} 
                  />
                )}
                <Text style={[
                  styles.categoryChipText, 
                  selectedSection === section.id && styles.categoryChipTextActive,
                  selectedSection !== section.id && { color: colors.textSecondary }
                ]}>
                  {section.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Categories Section (inspired by Temu) */}
      {filteredCategories.length > 0 && !loading && (
        <View style={styles.categoriesContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>الفئات</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            <TouchableOpacity
              style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[
                styles.categoryChipText, 
                !selectedCategory && styles.categoryChipTextActive,
                !selectedCategory && { color: colors.textSecondary }
              ]}>
                الكل
              </Text>
            </TouchableOpacity>
            {filteredCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip, 
                  selectedCategory === category.id && styles.categoryChipActive,
                  selectedCategory !== category.id && { backgroundColor: colors.surface, borderColor: colors.border }
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                {category.icon && (
                  <Ionicons 
                    name={category.icon as any} 
                    size={16} 
                    color={selectedCategory === category.id ? '#fff' : colors.textSecondary} 
                    style={{ marginRight: 5 }} 
                  />
                )}
                <Text style={[
                  styles.categoryChipText, 
                  selectedCategory === category.id && styles.categoryChipTextActive,
                  selectedCategory !== category.id && { color: colors.textSecondary }
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Products Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.productsGridContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.productsGrid, { maxWidth: maxContainerWidth, alignSelf: 'center', width: '100%' }]}>
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color="#EE1C47" />
            </View>
          ) : error ? (
            <View style={styles.centerContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadProducts}>
                <Text style={styles.retryButtonText}>إعادة المحاولة</Text>
              </TouchableOpacity>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={[styles.emptyText, { color: colors.text }]}>لا توجد منتجات</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>أضف منتجات من لوحة الإدارة</Text>
            </View>
          ) : (
            filteredProducts.map((product) => {
              const discount = getDiscount(product);
              const hasDiscountValue = hasDiscount(product);
              const isLimitedActive = isLimitedDiscountActive(product);
              
              // Calculate original price: use from DB if available, otherwise calculate from discount
              let originalPrice: number | null = null;
              // استخدام strikethrough_price إذا كان موجوداً، وإلا استخدم original_price
              if (product.strikethrough_price && product.strikethrough_price > product.price) {
                originalPrice = product.strikethrough_price;
              } else if (product.original_price && product.original_price > product.price) {
                originalPrice = product.original_price;
              } else if (hasDiscountValue && discount > 0) {
                // Calculate original price from discount percentage
                originalPrice = product.price / (1 - discount / 100);
              }
              
              const showBothPrices = originalPrice && originalPrice > product.price;
              
              return (
                <TouchableOpacity
                  key={product.id}
                  style={[styles.productCard, { backgroundColor: colors.card }]}
                  onPress={() => handleProductPress(product.id)}
                >
                  {/* Discount Badge */}
                  {hasDiscountValue && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>-{discount}%</Text>
                    </View>
                  )}
                  
                  {/* Stock Badge */}
                  {product.stock_quantity < 10 && product.stock_quantity > 0 && (
                    <View style={styles.stockBadge}>
                      <Text style={styles.stockBadgeText}>آخر {product.stock_quantity}</Text>
                    </View>
                  )}
                  
                  <Image
                    source={{ uri: product.primary_image_url || product.image_url }}
                    style={styles.productImage}
                    resizeMode="contain"
                  />
                  <View style={styles.productInfo}>
                    <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <View style={styles.priceContainer}>
                      {showBothPrices ? (
                        <View style={styles.priceRow}>
                          <View style={styles.priceColumn}>
                            <Text style={[styles.productPrice, { color: colors.primary }]}>
                              {product.price.toFixed(2)} ج.م
                            </Text>
                            <Text style={[styles.originalPrice, { color: colors.textSecondary }]}>
                              {originalPrice.toFixed(2)} ج.م
                            </Text>
                          </View>
                          {discount > 0 && (
                            <View style={styles.discountBadgeSmall}>
                              <Text style={styles.discountBadgeSmallText}>
                                -{discount}%
                              </Text>
                            </View>
                          )}
                        </View>
                      ) : (
                        <Text style={[styles.productPrice, { color: colors.primary }]}>
                          {product.price.toFixed(2)} ج.م
                        </Text>
                      )}
                    </View>
                    {/* Limited Time Discount Countdown */}
                    {isLimitedDiscountActive(product) && product.limited_time_discount_end_date && (
                      <CountdownTimer 
                        endDate={product.limited_time_discount_end_date}
                        compact={true}
                      />
                    )}
                    {/* Limited Time Offer Countdown (legacy) */}
                    {!isLimitedDiscountActive(product) && product.is_limited_time_offer && product.offer_end_date && new Date(product.offer_end_date) > new Date() && (
                      <CountdownTimer 
                        endDate={product.offer_end_date}
                        compact={true}
                      />
                    )}
                    {product.source_type !== 'external' && product.source_type && product.stock_quantity === 0 && (
                      <Text style={styles.outOfStock}>غير متوفر</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: isWeb ? 20 : 10,
    marginHorizontal: isWeb ? 'auto' : 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    height: isWeb ? 50 : 45,
    maxWidth: isWeb ? 600 : undefined,
    width: isWeb ? '100%' : undefined,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  productsGridContainer: {
    padding: isWeb ? 20 : 10,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: isWeb ? 'flex-start' : 'space-between',
    gap: isWeb ? 20 : 0,
    padding: isWeb ? 0 : 0,
  },
  productCard: {
    width: isWeb ? itemWidth : itemWidth,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    ...(isWeb && {
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'pointer',
    }),
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF6B00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  discountBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  stockBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  dealsBanner: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: isWeb ? 'auto' : 10,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 8,
    maxWidth: isWeb ? 1400 : undefined,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B00',
  },
  dealsBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dealsBannerText: {
    color: '#FF6B00',
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    marginVertical: 10,
    marginHorizontal: isWeb ? 'auto' : 10,
    maxWidth: isWeb ? 1400 : undefined,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    paddingHorizontal: isWeb ? 20 : 10,
  },
  categoriesScroll: {
    paddingHorizontal: isWeb ? 20 : 10,
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    ...(isWeb && {
      transition: 'all 0.2s',
      cursor: 'pointer',
    }),
  },
  categoryChipActive: {
    backgroundColor: '#EE1C47',
    borderColor: '#EE1C47',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  productImage: {
    width: '100%',
    height: itemWidth * 1.2,
    backgroundColor: '#f0f0f0',
    objectFit: 'contain', // For web compatibility - shows full image
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
    minHeight: 40,
  },
  priceContainer: {
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  priceColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EE1C47',
  },
  originalPrice: {
    fontSize: 13,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  discountBadgeSmall: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  discountBadgeSmallText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  outOfStock: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 4,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 200,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    fontSize: 14,
    color: '#999',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#f44336',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#EE1C47',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

