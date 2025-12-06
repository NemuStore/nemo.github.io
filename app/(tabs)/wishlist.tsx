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
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Product, ProductWishlist } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import SweetAlert from '@/components/SweetAlert';
import { SkeletonCard } from '@/components/SkeletonCard';
import { getCardImageUrl } from '@/utils/imageUtils';

export default function WishlistScreen() {
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const router = useRouter();
  const { addToCart } = useCart();
  const sweetAlert = useSweetAlert();

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      // Get session from localStorage directly (faster, no timeout on web)
      let userId: string | null = null;
      let accessToken: string | null = null;
      
      if (typeof window !== 'undefined') {
        try {
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
        console.log('⚠️ Wishlist: No user found - user not logged in');
        setWishlistItems([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      console.log('✅ Wishlist: Got session from localStorage, user:', userId);

      // Fetch wishlist items first
      const wishlistResponse = await fetch(
        `${supabaseUrl}/rest/v1/product_wishlist?user_id=eq.${userId}&select=product_id&order=created_at.desc`,
        {
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      );

      console.log('📡 Wishlist response status:', wishlistResponse.status);

      if (wishlistResponse.ok) {
        const wishlistData: any[] = await wishlistResponse.json();
        console.log('✅ Wishlist items loaded:', wishlistData.length, 'items');
        
        if (wishlistData.length === 0) {
          setWishlistItems([]);
          setLoading(false);
          setRefreshing(false);
          return;
        }

        // Extract product IDs
        const productIds = wishlistData.map(item => item.product_id);
        console.log('📦 Product IDs:', productIds);

        if (productIds.length === 0) {
          setWishlistItems([]);
          setLoading(false);
          setRefreshing(false);
          return;
        }

        // Fetch products using product IDs - use 'in' filter for better performance
        const productsResponse = await fetch(
          `${supabaseUrl}/rest/v1/products?id=in.(${productIds.map((id: string) => `"${id}"`).join(',')})&select=*`,
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
          const products: Product[] = await productsResponse.json();
          console.log('✅ Products loaded:', products.length);
          
          if (products.length === 0) {
            setWishlistItems([]);
            setLoading(false);
            setRefreshing(false);
            return;
          }
          
          // Maintain the order from wishlist (most recent first)
          const productsMap = new Map(products.map(p => [p.id, p]));
          const orderedProducts = productIds
            .map(id => productsMap.get(id))
            .filter((p): p is Product => p !== undefined);
          
          console.log('✅ Ordered products:', orderedProducts.length);
          setWishlistItems(orderedProducts);
          
          // Load product images
          if (orderedProducts.length > 0) {
            await loadProductImages(orderedProducts);
          }
        } else {
          const errorText = await productsResponse.text();
          console.error('❌ Error loading products:', productsResponse.status, errorText);
          sweetAlert.showError('خطأ', `فشل تحميل المنتجات: ${productsResponse.status}`);
        }
      } else {
        const errorText = await wishlistResponse.text();
        console.error('❌ Error loading wishlist:', wishlistResponse.status, errorText);
        sweetAlert.showError('خطأ', 'فشل تحميل قائمة المفضلة');
      }
    } catch (error) {
      console.error('❌ Error loading wishlist:', error);
      sweetAlert.showError('خطأ', 'فشل تحميل قائمة المفضلة');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadProductImages = async (products: Product[]) => {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const productIds = products.map(p => p.id);
      const productIdsQuery = productIds.map((id: string) => `product_id.eq.${id}`).join(',');

      const imagesResponse = await fetch(
        `${supabaseUrl}/rest/v1/product_images?or=(${productIdsQuery})&is_primary=eq.true&variant_id=is.null&select=product_id,image_url&order=display_order.asc&limit=100`,
        {
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${supabaseKey || ''}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (imagesResponse.ok) {
        const imagesData = await imagesResponse.json();
        const imagesMap: Record<string, string> = {};
        
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

  const removeFromWishlist = async (productId: string) => {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      // Get session from localStorage directly (faster, no timeout on web)
      let userId: string | null = null;
      let accessToken: string | null = null;
      
      if (typeof window !== 'undefined') {
        try {
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
        sweetAlert.showError('تنبيه', 'يجب تسجيل الدخول أولاً');
        return;
      }

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

      if (response.ok) {
        setWishlistItems(prev => prev.filter(p => p.id !== productId));
        sweetAlert.showSuccess('نجح', 'تم إزالة المنتج من المفضلة');
      } else {
        throw new Error('فشل إزالة المنتج من المفضلة');
      }
    } catch (error) {
      console.error('❌ Error removing from wishlist:', error);
      sweetAlert.showError('خطأ', 'فشل إزالة المنتج من المفضلة');
    }
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    sweetAlert.showSuccess('نجح', 'تم إضافة المنتج للسلة بنجاح');
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWishlist();
  };

  const isWeb = Platform.OS === 'web';
  const { width } = Dimensions.get('window');
  const maxContentWidth = isWeb ? 1200 : width;
  const cardWidth = isWeb ? 180 : (width - 48) / 2; // 2 columns with padding

  if (loading) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.contentWrapper, { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
            <View style={styles.header}>
              <SkeletonCard width="60%" height={28} borderRadius={4} />
            </View>
            <View style={styles.productsGrid}>
              {Array.from({ length: 6 }).map((_, index) => (
                <View key={index} style={[styles.productCard, { width: cardWidth }]}>
                  <SkeletonCard width="100%" height={cardWidth} borderRadius={12} />
                  <View style={{ padding: 12 }}>
                    <SkeletonCard width="90%" height={16} borderRadius={4} />
                    <View style={{ marginTop: 8 }}>
                      <SkeletonCard width="60%" height={14} borderRadius={4} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.contentWrapper, { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>قائمة المفضلة</Text>
            {wishlistItems.length > 0 && (
              <Text style={styles.subtitle}>{wishlistItems.length} منتج</Text>
            )}
          </View>

          {/* Empty State */}
          {wishlistItems.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={80} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>قائمة المفضلة فارغة</Text>
              <Text style={styles.emptyText}>
                ابدأ بإضافة المنتجات التي تعجبك إلى قائمة المفضلة
              </Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => router.push('/(tabs)')}
              >
                <Text style={styles.browseButtonText}>تصفح المنتجات</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Products Grid */}
          {wishlistItems.length > 0 && (
            <View style={styles.productsGrid}>
              {wishlistItems.map((product) => {
                const productImage = productImages[product.id] || product.image_url || 'https://via.placeholder.com/150';
                const hasDiscount = (product.strikethrough_price && product.strikethrough_price > product.price) ||
                                  (product.original_price && product.original_price > product.price) ||
                                  product.discount_percentage;

                return (
                  <View key={product.id} style={[styles.productCard, { width: cardWidth }]}>
                    <TouchableOpacity
                      onPress={() => router.push(`/product/${product.id}`)}
                      activeOpacity={0.8}
                    >
                      {/* Product Image */}
                      <View style={styles.imageContainer}>
                        {productImage && productImage !== 'https://via.placeholder.com/150' ? (
                          <Image
                            source={{ uri: getCardImageUrl(productImage, 300, 75) }}
                            style={styles.productImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.productImage, styles.placeholderImage]}>
                            <Ionicons name="image-outline" size={40} color="#ccc" />
                          </View>
                        )}
                        
                        {/* Remove from wishlist button */}
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => removeFromWishlist(product.id)}
                        >
                          <Ionicons name="heart" size={20} color="#EE1C47" />
                        </TouchableOpacity>

                        {/* Discount badge */}
                        {hasDiscount && (
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>
                              -{product.discount_percentage || 
                                Math.round(((product.original_price || product.strikethrough_price || product.price) - product.price) / 
                                (product.original_price || product.strikethrough_price || product.price) * 100)}%
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Product Info */}
                      <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={2}>
                          {product.name}
                        </Text>
                        
                        {/* Price */}
                        <View style={styles.priceContainer}>
                          <Text style={styles.productPrice}>
                            {product.price.toFixed(2)} ج.م
                          </Text>
                          {(product.strikethrough_price || product.original_price) && 
                           (product.strikethrough_price || product.original_price)! > product.price && (
                            <Text style={styles.originalPrice}>
                              {(product.strikethrough_price || product.original_price)!.toFixed(2)} ج.م
                            </Text>
                          )}
                        </View>

                        {/* Add to cart button */}
                        <TouchableOpacity
                          style={styles.addToCartButton}
                          onPress={() => handleAddToCart(product)}
                        >
                          <Ionicons name="cart-outline" size={18} color="#fff" />
                          <Text style={styles.addToCartText}>أضف للسلة</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  contentWrapper: {
    width: '100%',
    padding: 16,
  },
  header: {
    marginBottom: 20,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  browseButton: {
    backgroundColor: '#EE1C47',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F5F5F5',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#EE1C47',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    minHeight: 40,
    lineHeight: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EE1C47',
  },
  originalPrice: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EE1C47',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

