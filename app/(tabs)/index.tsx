import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Product, Category, Section } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCart } from '@/contexts/CartContext';
import CountdownTimer from '@/components/CountdownTimer';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { ProductCardSkeleton } from '@/components/ProductCardSkeleton';
import { getCardImageUrl } from '@/utils/imageUtils';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/utils/env';
import { useResponsive, useItemWidth } from '@/hooks/useResponsive';

export default function HomeScreen() {
  const { colors, isDarkMode } = useDarkMode();
  const responsive = useResponsive();
  const { isWeb, columns, maxContentWidth, padding } = responsive;
  
  // Calculate item width based on responsive columns
  const itemWidth = useItemWidth(columns, 12, padding * 2);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [wishlistItems, setWishlistItems] = useState<Set<string>>(new Set()); // Set of product IDs in wishlist
  const wishlistAnimations = useRef<Record<string, Animated.Value>>({}); // Animation values for scale
  const wishlistOpacityAnimations = useRef<Record<string, Animated.Value>>({}); // Animation values for opacity
  const scrollY = useRef(0);
  const lastScrollY = useRef(0);
  
  // Combined search bar and filters animation (like Temu - one unit)
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const headerHeight = useRef(new Animated.Value(1)).current;
  const headerContainerRef = useRef<View>(null);
  const [headerContainerHeight, setHeaderContainerHeight] = useState(0);
  const isAnimating = useRef(false); // Prevent multiple animations
  
  const router = useRouter();

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadSections();
    loadWishlistStatus();
  }, []);

  // Handle scroll to show/hide search bar and filters together (like Temu - one unit)
  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDifference = currentScrollY - lastScrollY.current;
    
    // Update last scroll position
    lastScrollY.current = currentScrollY;
    scrollY.current = currentScrollY;
    
    // Threshold for hiding/showing (like Temu - hides quickly)
    const hideThreshold = 20; // Hide after scrolling 20px down
    const scrollSpeedThreshold = 2; // Minimum scroll speed to trigger hide
    
    // Get current opacity value
    const currentOpacity = headerOpacity._value;
    
    // Determine if we should hide (scrolling down)
    const shouldHide = currentScrollY > hideThreshold && scrollDifference > scrollSpeedThreshold;
    // Determine if we should show (scrolling up or near top)
    const shouldShow = scrollDifference < -scrollSpeedThreshold || currentScrollY <= hideThreshold;
    
    // Animate search bar and filters together as one unit
    if (!isAnimating.current) {
      if (shouldHide && currentOpacity > 0.1) {
      isAnimating.current = true;
      Animated.parallel([
          Animated.timing(headerOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
          Animated.timing(headerTranslateY, {
            toValue: -100,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
          Animated.timing(headerHeight, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
          easing: Easing.out(Easing.ease),
        }),
      ]).start(() => {
        isAnimating.current = false;
      });
      } else if (shouldShow && currentOpacity < 0.9) {
      isAnimating.current = true;
      Animated.parallel([
          Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
          Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
          Animated.timing(headerHeight, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
          easing: Easing.out(Easing.ease),
        }),
      ]).start(() => {
        isAnimating.current = false;
      });
      }
    }
  };

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
      
      const supabaseUrl = getSupabaseUrl();
      const supabaseKey = getSupabaseAnonKey();
      
      console.log('🛍️ Loading products...');
      console.log('🔗 Supabase URL:', supabaseUrl?.substring(0, 30) + '...');
      console.log('🔑 Supabase Key exists:', !!supabaseKey);
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase environment variables');
      }
      
      // Add timeout to prevent infinite loading (reduced to 5 seconds)
      timeoutId = setTimeout(() => {
        timeoutTriggered = true;
        console.warn('⚠️ Query timeout - taking too long');
        setError('استغرق التحميل وقتاً طويلاً. يرجى المحاولة مرة أخرى.');
        setLoading(false);
      }, 5000);

      const startTime = Date.now();
      console.log('📡 Sending query...');
      
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
      const supabaseUrl = getSupabaseUrl();
      const supabaseKey = getSupabaseAnonKey();
      
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
      const supabaseUrl = getSupabaseUrl();
      const supabaseKey = getSupabaseAnonKey();
      
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


  const loadWishlistStatus = async () => {
    try {
      // Get session from localStorage directly (faster, no timeout on web)
      let userId: string | null = null;
      let accessToken: string | null = null;
      
      if (typeof window !== 'undefined') {
        try {
          const supabaseUrl = getSupabaseUrl();
          const projectRef = supabaseUrl?.split('//')[1]?.split('.')[0] || 'default';
          const storageKey = `sb-${projectRef}-auth-token`;
          const tokenData = localStorage.getItem(storageKey);
          
          if (tokenData) {
            try {
              const parsed = JSON.parse(tokenData);
              userId = parsed?.user?.id || parsed?.currentSession?.user?.id || parsed?.session?.user?.id;
              accessToken = parsed?.access_token || parsed?.currentSession?.access_token || parsed?.session?.access_token;
            } catch (e) {
              // Silently fail
            }
          }
        } catch (e) {
          // Silently fail
        }
      }
      
      if (!userId || !accessToken) {
        return; // User not logged in, skip silently
      }

      const supabaseUrl = getSupabaseUrl();
      const supabaseKey = getSupabaseAnonKey();

      // Fetch wishlist items
      const response = await fetch(
        `${supabaseUrl}/rest/v1/product_wishlist?user_id=eq.${userId}&select=product_id`,
        {
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.ok) {
        const wishlistData: any[] = await response.json();
        const productIds = new Set(wishlistData.map(item => item.product_id));
        setWishlistItems(productIds);
      }
    } catch (error) {
      // Silently fail - user might not be logged in
    }
  };

  const toggleWishlist = async (productId: string, event?: any) => {
    // Prevent navigation when clicking heart
    if (event) {
      event.stopPropagation();
    }

    const isInWishlist = wishlistItems.has(productId);

    // Initialize animation if not exists
    if (!wishlistAnimations.current[productId]) {
      wishlistAnimations.current[productId] = new Animated.Value(1);
    }
    if (!wishlistOpacityAnimations.current[productId]) {
      wishlistOpacityAnimations.current[productId] = new Animated.Value(1);
    }

    // Start animation immediately (before checking session)
    // Lottie-like animation: heart beat effect (same as product page)
    // Reset animation values
    wishlistAnimations.current[productId].setValue(1);
    wishlistOpacityAnimations.current[productId].setValue(1);
    
    // Create a heart beat animation sequence (same as product page)
    // Use useNativeDriver: false on web for compatibility
    const useNative = Platform.OS !== 'web';
    
    Animated.sequence([
        // First beat - quick scale up
        Animated.parallel([
          Animated.spring(wishlistAnimations.current[productId], {
            toValue: 1.4,
            useNativeDriver: useNative,
            tension: 300,
            friction: 3,
          }),
          Animated.timing(wishlistOpacityAnimations.current[productId], {
            toValue: 0.8,
            duration: 100,
            useNativeDriver: useNative,
          }),
        ]),
        // Quick scale down
        Animated.parallel([
          Animated.spring(wishlistAnimations.current[productId], {
            toValue: 0.9,
            useNativeDriver: useNative,
            tension: 300,
            friction: 3,
          }),
          Animated.timing(wishlistOpacityAnimations.current[productId], {
            toValue: 1,
            duration: 100,
            useNativeDriver: useNative,
          }),
        ]),
        // Second beat - smaller
        Animated.parallel([
          Animated.spring(wishlistAnimations.current[productId], {
            toValue: 1.2,
            useNativeDriver: useNative,
            tension: 300,
            friction: 4,
          }),
        ]),
        // Final settle
        Animated.spring(wishlistAnimations.current[productId], {
          toValue: 1,
          useNativeDriver: useNative,
          tension: 200,
          friction: 5,
        }),
      ]).start((finished) => {
        if (finished) {
          console.log('✅ Animation completed');
        }
      });

    // Get session from localStorage directly (faster, no timeout on web)
    let userId: string | null = null;
    let accessToken: string | null = null;
    
    if (typeof window !== 'undefined') {
      try {
        const supabaseUrl = getSupabaseUrl();
        const projectRef = supabaseUrl?.split('//')[1]?.split('.')[0] || 'default';
        const storageKey = `sb-${projectRef}-auth-token`;
        const tokenData = localStorage.getItem(storageKey);
        
        if (tokenData) {
          try {
            const parsed = JSON.parse(tokenData);
            userId = parsed?.user?.id || parsed?.currentSession?.user?.id || parsed?.session?.user?.id;
            accessToken = parsed?.access_token || parsed?.currentSession?.access_token || parsed?.session?.access_token;
            
            if (userId && accessToken) {
              console.log('✅ Got session from localStorage, user:', userId);
            }
          } catch (e) {
            console.log('⚠️ Error parsing localStorage token');
          }
        }
      } catch (e) {
        console.log('⚠️ Error reading localStorage');
      }
    }
    
    if (!userId || !accessToken) {
      console.log('⚠️ No session found - user not logged in');
      // User not logged in - redirect to auth
      router.push('/auth');
      return;
    }

    try {
      const supabaseUrl = getSupabaseUrl();
      const supabaseKey = getSupabaseAnonKey();
      
      console.log('✅ User ID:', userId);
      console.log('🔑 Access token:', accessToken ? 'Found' : 'Not found');

      if (isInWishlist) {
        // Remove from wishlist
        const response = await fetch(
          `${supabaseUrl}/rest/v1/product_wishlist?user_id=eq.${userId}&product_id=eq.${productId}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': supabaseKey || '',
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            }
          }
        );
        
        console.log('🗑️ Delete response status:', response.status);

        if (response.ok) {
          setWishlistItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(productId);
            return newSet;
          });
        }
      } else {
        // Add to wishlist
        const response = await fetch(
          `${supabaseUrl}/rest/v1/product_wishlist`,
          {
            method: 'POST',
            headers: {
              'apikey': supabaseKey || '',
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              user_id: userId,
              product_id: productId,
            })
          }
        );

        console.log('➕ Add response status:', response.status);
        
        if (response.ok || response.status === 409) {
          // 409 means already exists, which is fine
          setWishlistItems(prev => {
            const newSet = new Set(prev);
            newSet.add(productId);
            return newSet;
          });
          console.log('✅ Added to wishlist');
        } else {
          const errorText = await response.text();
          console.error('❌ Add to wishlist error:', response.status, errorText);
        }
      }
    } catch (error) {
      console.warn('⚠️ Error toggling wishlist:', error);
    }
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
      {/* Search Bar and Filters - Combined Animated Container (like Temu - one unit) */}
      <Animated.View
        ref={headerContainerRef}
        onLayout={(event) => {
          const { height } = event.nativeEvent.layout;
          if (height > 0 && headerContainerHeight === 0) {
            setHeaderContainerHeight(height);
          }
        }}
        style={{
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslateY }],
          height: headerContainerHeight > 0 
            ? headerHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, headerContainerHeight],
              })
            : undefined,
          overflow: 'hidden',
          position: 'relative',
          zIndex: 200,
        }}
      >
        {/* Search Bar */}
        <View style={[
          styles.searchContainer, 
          { 
            backgroundColor: colors.surface,
            maxWidth: isWeb ? Math.min(maxContentWidth, 800) : undefined,
            marginHorizontal: isWeb ? 'auto' : padding,
            paddingHorizontal: isWeb ? 20 : padding,
          }
        ]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="ابحث عن منتج..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filters Container */}
        {/* Lightning Deals Banner (inspired by Temu) */}
        {filteredProducts.length > 0 && !loading && (
          <View style={[styles.dealsBanner, { backgroundColor: isDarkMode ? '#2D1B0E' : '#FFF3E0' }]}>
            <View style={styles.dealsBannerContent}>
              <Ionicons name="flash" size={18} color="#FF6B00" />
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
                      size={14} 
                      color={selectedSection === section.id ? '#fff' : colors.textSecondary} 
                      style={{ marginRight: 4 }} 
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
        {categories.length > 0 && !loading && (
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
                      size={14} 
                      color={selectedCategory === category.id ? '#fff' : colors.textSecondary} 
                      style={{ marginRight: 4 }} 
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
      </Animated.View>

      {/* Products Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.productsGridContainer,
          { padding: padding }
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={[
          styles.productsGrid, 
          { 
            maxWidth: maxContentWidth, 
            alignSelf: 'center', 
            width: '100%',
            gap: isWeb ? 12 : 0,
            justifyContent: isWeb ? 'flex-start' : 'space-between',
          }
        ]}>
          {loading ? (
            <ProductCardSkeleton count={8} />
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
              
              const isInWishlist = wishlistItems.has(product.id);
              const heartScale = wishlistAnimations.current[product.id] || new Animated.Value(1);
              const heartOpacity = wishlistOpacityAnimations.current[product.id] || new Animated.Value(1);
              if (!wishlistAnimations.current[product.id]) {
                wishlistAnimations.current[product.id] = heartScale;
              }
              if (!wishlistOpacityAnimations.current[product.id]) {
                wishlistOpacityAnimations.current[product.id] = heartOpacity;
              }

              return (
                <TouchableOpacity
                  key={product.id}
                  style={[
                    styles.productCard, 
                    { 
                      backgroundColor: colors.card,
                      width: itemWidth,
                      marginHorizontal: isWeb ? 0 : 4,
                    }
                  ]}
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

                  {/* Wishlist Heart Button */}
                  <TouchableOpacity
                    style={styles.wishlistButton}
                    onPress={(e) => toggleWishlist(product.id, e)}
                    activeOpacity={0.8}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Animated.View
                      style={{
                        transform: [{ scale: heartScale }],
                        opacity: heartOpacity,
                      }}
                    >
                      <Ionicons
                        name={isInWishlist ? "heart" : "heart-outline"}
                        size={22}
                        color={isInWishlist ? "#EE1C47" : "#666"}
                      />
                    </Animated.View>
                  </TouchableOpacity>
                  
                  <Image
                    source={{ uri: getCardImageUrl(product.primary_image_url || product.image_url, 250, 50) }} // Optimized for cards: 250px, quality 50
                    style={[styles.productImage, { height: itemWidth * (isWeb ? 1.15 : 1.2) }]}
                    resizeMode="contain"
                  />
                  <View style={styles.productInfo}>
                    <Text 
                      style={[styles.productName, { color: colors.text }]} 
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
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

const isWebPlatform = Platform.OS === 'web';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Clean white background like Temu
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginTop: isWebPlatform ? 16 : 6,
    marginBottom: isWebPlatform ? 8 : 2,
    marginHorizontal: isWebPlatform ? 'auto' : 8,
    paddingHorizontal: isWebPlatform ? 20 : 12,
    borderRadius: isWebPlatform ? 30 : 24,
    height: isWebPlatform ? 48 : 44,
    maxWidth: isWebPlatform ? 800 : undefined,
    width: isWebPlatform ? '100%' : undefined,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    padding: isWebPlatform ? 16 : 8,
    paddingTop: isWebPlatform ? 16 : 4,
    paddingBottom: isWebPlatform ? 40 : 20,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: isWebPlatform ? 'flex-start' : 'space-between',
    gap: isWebPlatform ? 12 : 0,
    padding: 0,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: isWebPlatform ? 8 : 12,
    marginBottom: isWebPlatform ? 20 : 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    ...(isWebPlatform && {
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    }),
  },
  discountBadge: {
    position: 'absolute',
    top: isWebPlatform ? 6 : 6,
    right: isWebPlatform ? 6 : 6,
    backgroundColor: '#EE1C47', // Temu red
    paddingHorizontal: isWebPlatform ? 10 : 8,
    paddingVertical: isWebPlatform ? 5 : 4,
    borderRadius: isWebPlatform ? 4 : 6,
    zIndex: 10,
    shadowColor: '#EE1C47',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  wishlistButton: {
    position: 'absolute',
    top: isWebPlatform ? 6 : 6,
    left: isWebPlatform ? 6 : 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
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
    backgroundColor: '#FEF2F2', // Light red background like Temu
    paddingVertical: isWebPlatform ? 14 : 8,
    paddingHorizontal: isWebPlatform ? 24 : 12,
    marginHorizontal: isWebPlatform ? 'auto' : 8,
    marginTop: isWebPlatform ? 4 : 0,
    marginBottom: isWebPlatform ? 8 : 2,
    borderRadius: isWebPlatform ? 6 : 8,
    maxWidth: isWebPlatform ? 1600 : undefined,
    borderLeftWidth: 3,
    borderLeftColor: '#EE1C47', // Temu red
  },
  dealsBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dealsBannerText: {
    color: '#EE1C47', // Temu red
    fontSize: isWebPlatform ? 15 : 13,
    fontWeight: '600',
  },
  categoriesContainer: {
    marginTop: isWebPlatform ? 0 : 0,
    marginBottom: isWebPlatform ? 2 : 0,
    marginHorizontal: isWebPlatform ? 'auto' : 8,
    maxWidth: isWebPlatform ? 1400 : undefined,
  },
  sectionTitle: {
    fontSize: isWebPlatform ? 18 : 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: isWebPlatform ? 4 : 1,
    paddingHorizontal: isWebPlatform ? 16 : 8,
  },
  categoriesScroll: {
    paddingHorizontal: isWebPlatform ? 20 : 8,
    gap: isWebPlatform ? 10 : 5,
    paddingBottom: isWebPlatform ? 0 : 2,
  },
  categoryChip: {
    paddingHorizontal: isWebPlatform ? 18 : 10,
    paddingVertical: isWebPlatform ? 9 : 5,
    borderRadius: isWebPlatform ? 20 : 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: isWebPlatform ? 10 : 5,
    ...(isWebPlatform && {
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    }),
  },
  categoryChipActive: {
    backgroundColor: '#EE1C47', // Temu red
    borderColor: '#EE1C47',
  },
  categoryChipText: {
    fontSize: isWebPlatform ? 14 : 12,
    color: '#666',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  productImage: {
    width: '100%',
    backgroundColor: '#FAFAFA',
    objectFit: 'contain', // For web compatibility - shows full image
  },
  productInfo: {
    padding: isWebPlatform ? 12 : 10,
    paddingTop: isWebPlatform ? 10 : 8,
    paddingBottom: isWebPlatform ? 12 : 10,
  },
  productName: {
    fontSize: isWebPlatform ? 13 : 12,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: isWebPlatform ? 8 : 6,
    minHeight: isWebPlatform ? 36 : 32,
    maxHeight: isWebPlatform ? 36 : 32,
    lineHeight: isWebPlatform ? 18 : 16,
    textAlign: 'right',
  },
  priceContainer: {
    marginBottom: 4,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    flexWrap: 'wrap',
  },
  priceColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  productPrice: {
    fontSize: isWebPlatform ? 16 : 15,
    fontWeight: '700',
    color: '#EE1C47', // Temu red
    textAlign: 'right',
  },
  originalPrice: {
    fontSize: isWebPlatform ? 12 : 11,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginLeft: 4,
    textAlign: 'right',
  },
  discountBadgeSmall: {
    backgroundColor: '#EE1C47', // Temu red
    paddingHorizontal: isWebPlatform ? 7 : 5,
    paddingVertical: isWebPlatform ? 4 : 2,
    borderRadius: isWebPlatform ? 3 : 4,
    minWidth: isWebPlatform ? 32 : 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadgeSmallText: {
    color: '#fff',
    fontSize: isWebPlatform ? 10 : 9,
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

