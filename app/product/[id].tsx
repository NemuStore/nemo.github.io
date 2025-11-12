import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '@/contexts/CartContext';

interface ProductImage {
  id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { addToCart } = useCart();

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      console.log('📦 Loading product:', id);
      setLoading(true);
      
      // Add timeout
      timeoutId = setTimeout(() => {
        console.warn('⚠️ Product load timeout');
        setLoading(false);
        Alert.alert('خطأ', 'استغرق التحميل وقتاً طويلاً');
        router.back();
      }, 10000);
      
      // Use fetch for web compatibility
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      console.log('📡 Fetching product data...');
      const response = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${id}&select=*`, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${supabaseKey || ''}`,
          'Content-Type': 'application/json',
        }
      });
      
      console.log('📡 Product response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Product fetch error:', errorText);
        throw new Error('فشل تحميل المنتج');
      }
      
      const data = await response.json();
      console.log('✅ Product loaded:', data.length > 0 ? data[0].name : 'No product');
      
      if (data && data.length > 0) {
        const productData = data[0];
        setProduct(productData);
        
        // Load product images (if table exists)
        console.log('📸 Fetching product images...');
        try {
          const imagesResponse = await fetch(`${supabaseUrl}/rest/v1/product_images?product_id=eq.${id}&select=*&order=display_order.asc,is_primary.desc`, {
            headers: {
              'apikey': supabaseKey || '',
              'Authorization': `Bearer ${supabaseKey || ''}`,
              'Content-Type': 'application/json',
            }
          });
          
          if (imagesResponse.ok) {
            const imagesData = await imagesResponse.json();
            console.log('✅ Product images loaded:', imagesData.length);
            
            if (imagesData && imagesData.length > 0) {
              setProductImages(imagesData);
            } else {
              // Fallback to product.image_url if no images in product_images table
              if (productData.image_url) {
                setProductImages([{
                  id: 'fallback',
                  image_url: productData.image_url,
                  display_order: 0,
                  is_primary: true,
                }]);
              }
            }
          } else if (imagesResponse.status === 404) {
            // Table doesn't exist yet, use fallback
            console.log('⚠️ product_images table not found, using fallback');
            if (productData.image_url) {
              setProductImages([{
                id: 'fallback',
                image_url: productData.image_url,
                display_order: 0,
                is_primary: true,
              }]);
            }
          } else {
            // Other error, use fallback
            console.warn('⚠️ Error loading product images, using fallback');
            if (productData.image_url) {
              setProductImages([{
                id: 'fallback',
                image_url: productData.image_url,
                display_order: 0,
                is_primary: true,
              }]);
            }
          }
        } catch (imagesError) {
          console.warn('⚠️ Error fetching product images:', imagesError);
          // Fallback to product.image_url
          if (productData.image_url) {
            setProductImages([{
              id: 'fallback',
              image_url: productData.image_url,
              display_order: 0,
              is_primary: true,
            }]);
          }
        }
      } else {
        console.warn('⚠️ Product not found');
        Alert.alert('خطأ', 'المنتج غير موجود');
        router.back();
      }
    } catch (error: any) {
      console.error('❌ Error loading product:', error);
      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        window.alert(error.message || 'فشل تحميل المنتج');
      } else {
        Alert.alert('خطأ', error.message || 'فشل تحميل المنتج');
      }
      router.back();
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoading(false);
      console.log('✅ Loading finished');
    }
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity);
      
      // On web, use window.confirm for better compatibility
      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        if (window.confirm('تم إضافة المنتج للسلة. هل تريد الذهاب للسلة؟')) {
          router.push('/(tabs)/cart');
        }
      } else {
        Alert.alert('نجح', 'تم إضافة المنتج للسلة', [
          {
            text: 'متابعة التسوق',
            style: 'cancel',
          },
          {
            text: 'الذهاب للسلة',
            onPress: () => router.push('/(tabs)/cart'),
          },
        ]);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>جاري التحميل...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.loadingContainer}>
        <Text>المنتج غير موجود</Text>
      </View>
    );
  }

  const currentImage = productImages[currentImageIndex]?.image_url || product?.image_url || '';
  const hasMultipleImages = productImages.length > 1;

  const isWeb = Platform.OS === 'web';
  const { width } = Dimensions.get('window');
  const maxContentWidth = isWeb ? 1200 : width;

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.contentWrapper, { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
        {/* Product Images and Info - Side by side on web, stacked on mobile */}
        <View style={isWeb ? styles.webLayout : styles.mobileLayout}>
          {/* Product Images */}
          <View style={isWeb ? styles.webImageContainer : styles.imageContainer}>
            <Image source={{ uri: currentImage }} style={isWeb ? styles.webImage : styles.image} />
            
            {/* Image Navigation */}
            {hasMultipleImages && (
              <>
                {currentImageIndex > 0 && (
                  <TouchableOpacity
                    style={[styles.imageNavButton, styles.imageNavButtonLeft]}
                    onPress={() => setCurrentImageIndex(currentImageIndex - 1)}
                  >
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                  </TouchableOpacity>
                )}
                
                {currentImageIndex < productImages.length - 1 && (
                  <TouchableOpacity
                    style={[styles.imageNavButton, styles.imageNavButtonRight]}
                    onPress={() => setCurrentImageIndex(currentImageIndex + 1)}
                  >
                    <Ionicons name="chevron-forward" size={24} color="#fff" />
                  </TouchableOpacity>
                )}
                
                {/* Image Indicators */}
                <View style={styles.imageIndicators}>
                  {productImages.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.imageIndicator,
                        index === currentImageIndex && styles.imageIndicatorActive,
                      ]}
                    />
                  ))}
                </View>
              </>
            )}
          </View>
          
          {/* Thumbnail Images (if multiple) */}
          {hasMultipleImages && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.thumbnailsContainer}
              contentContainerStyle={styles.thumbnailsContent}
            >
              {productImages.map((img, index) => (
                <TouchableOpacity
                  key={img.id}
                  onPress={() => setCurrentImageIndex(index)}
                  style={[
                    styles.thumbnail,
                    index === currentImageIndex && styles.thumbnailActive,
                  ]}
                >
                  <Image source={{ uri: img.image_url }} style={styles.thumbnailImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          
          <View style={isWeb ? styles.webContent : styles.content}>
        <Text style={styles.name}>{product.name}</Text>
        
        {product.description && (
          <Text style={styles.description}>{product.description}</Text>
        )}

        <View style={styles.priceContainer}>
          <Text style={styles.price}>{product.price.toFixed(2)} ج.م</Text>
          {product.stock_quantity > 0 ? (
            <Text style={styles.stock}>متوفر ({product.stock_quantity} قطعة)</Text>
          ) : (
            <Text style={styles.outOfStock}>غير متوفر</Text>
          )}
        </View>

        <View style={styles.quantityContainer}>
          <Text style={styles.quantityLabel}>الكمية:</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Ionicons name="remove" size={20} color="#EE1C47" />
            </TouchableOpacity>
            <Text style={styles.quantity}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(quantity + 1)}
            >
              <Ionicons name="add" size={20} color="#EE1C47" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.addToCartButton,
            product.stock_quantity === 0 && styles.addToCartButtonDisabled,
          ]}
          onPress={handleAddToCart}
          disabled={product.stock_quantity === 0}
        >
          <Text style={styles.addToCartButtonText}>
            {product.stock_quantity === 0 ? 'غير متوفر' : 'أضف للسلة'}
          </Text>
        </TouchableOpacity>
        </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  contentWrapper: {
    padding: Platform.OS === 'web' ? 20 : 0,
  },
  webLayout: {
    flexDirection: 'row',
    gap: 30,
    padding: 20,
  },
  mobileLayout: {
    flexDirection: 'column',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 400,
  },
  webImageContainer: {
    position: 'relative',
    width: '50%',
    minWidth: 400,
    height: 500,
  },
  image: {
    width: '100%',
    height: 400,
    backgroundColor: '#f0f0f0',
  },
  webImage: {
    width: '100%',
    height: 500,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
  },
  imageNavButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  imageNavButtonLeft: {
    left: 10,
  },
  imageNavButtonRight: {
    right: 10,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  imageIndicatorActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  thumbnailsContainer: {
    maxHeight: 100,
    backgroundColor: '#f9f9f9',
    paddingVertical: 10,
  },
  thumbnailsContent: {
    paddingHorizontal: 10,
    gap: 10,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbnailActive: {
    borderColor: '#EE1C47',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  content: {
    padding: 20,
  },
  webContent: {
    flex: 1,
    padding: 0,
    paddingTop: 0,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#EE1C47',
  },
  stock: {
    fontSize: 14,
    color: '#4CAF50',
  },
  outOfStock: {
    fontSize: 14,
    color: '#f44336',
  },
  quantityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  quantityLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EE1C47',
    borderRadius: 20,
  },
  quantity: {
    marginHorizontal: 20,
    fontSize: 18,
    fontWeight: '600',
  },
  addToCartButton: {
    backgroundColor: '#EE1C47',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  addToCartButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

