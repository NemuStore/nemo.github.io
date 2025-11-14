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
import { Product, ProductVariant, ProductImage, ProductFAQ, ProductRelated } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '@/contexts/CartContext';
import CountdownTimer from '@/components/CountdownTimer';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [faqs, setFaqs] = useState<ProductFAQ[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { addToCart } = useCart();

  useEffect(() => {
    loadProduct();
  }, [id]);

  // Update images when variant changes
  useEffect(() => {
    if (!product || !selectedVariant) return;
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    const loadVariantImages = async () => {
      try {
        // Load images for selected variant
        const response = await fetch(`${supabaseUrl}/rest/v1/product_images?product_id=eq.${product.id}&or=(variant_id.eq.${selectedVariant.id},variant_id.is.null)&order=display_order.asc,is_primary.desc`, {
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${supabaseKey || ''}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const imagesData = await response.json();
          if (imagesData && imagesData.length > 0) {
            setProductImages(imagesData);
            setCurrentImageIndex(0);
          }
        }
      } catch (error) {
        console.warn('⚠️ Error loading variant images:', error);
      }
    };
    
    loadVariantImages();
  }, [selectedVariant, product?.id]);

  const loadProduct = async () => {
    let timeoutId: NodeJS.Timeout | null = null;
    let productLoaded = false;
    
    try {
      console.log('📦 Loading product:', id);
      setLoading(true);
      
      // Add timeout (increased to 30 seconds for slow connections)
      timeoutId = setTimeout(() => {
        if (!productLoaded) {
          console.warn('⚠️ Product load timeout');
          setLoading(false);
          Alert.alert('خطأ', 'استغرق التحميل وقتاً طويلاً');
          router.back();
        }
      }, 30000);
      
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
        console.log('📦 Product data:', JSON.stringify(productData, null, 2));
        productLoaded = true; // Mark as loaded BEFORE setting product
        setProduct(productData);
        setLoading(false); // Stop loading immediately after setting product
        
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
        
        // Load variants (non-blocking)
        loadVariants(id, supabaseUrl, supabaseKey).catch(err => console.warn('Variants load error:', err));
        
        // Load FAQs (non-blocking)
        loadFAQs(id, supabaseUrl, supabaseKey).catch(err => console.warn('FAQs load error:', err));
        
        // Load related products (non-blocking)
        loadRelatedProducts(id, supabaseUrl, supabaseKey).catch(err => console.warn('Related products load error:', err));
        
        // Check wishlist status (non-blocking)
        checkWishlistStatus(id, supabaseUrl, supabaseKey).catch(err => console.warn('Wishlist check error:', err));
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
      // setLoading(false) is called after product is loaded, so we don't need it here
      // Only set loading to false if product wasn't loaded
      if (!productLoaded) {
        setLoading(false);
      }
      console.log('✅ Loading finished');
    }
  };

  const loadVariants = async (productId: string, supabaseUrl: string, supabaseKey: string) => {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/product_variants?product_id=eq.${productId}&is_active=eq.true&order=display_order.asc`, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${supabaseKey || ''}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const variantsData = await response.json();
        setVariants(variantsData || []);
        
        // Set default variant if exists
        const defaultVariant = variantsData.find((v: ProductVariant) => v.is_default);
        if (defaultVariant) {
          setSelectedVariant(defaultVariant);
          setSelectedColor(defaultVariant.color);
          setSelectedSize(defaultVariant.size);
        } else if (variantsData.length > 0) {
          setSelectedVariant(variantsData[0]);
          setSelectedColor(variantsData[0].color);
          setSelectedSize(variantsData[0].size);
        }
      }
    } catch (error) {
      console.warn('⚠️ Error loading variants:', error);
    }
  };

  const loadFAQs = async (productId: string, supabaseUrl: string, supabaseKey: string) => {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/product_faqs?product_id=eq.${productId}&is_active=eq.true&order=display_order.asc`, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${supabaseKey || ''}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const faqsData = await response.json();
        setFaqs(faqsData || []);
      }
    } catch (error) {
      console.warn('⚠️ Error loading FAQs:', error);
    }
  };

  const loadRelatedProducts = async (productId: string, supabaseUrl: string, supabaseKey: string) => {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/product_related?product_id=eq.${productId}&is_active=eq.true&select=*,related_product:products!product_related_related_product_id_fkey(*)&order=display_order.asc&limit=8`, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${supabaseKey || ''}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const relatedData = await response.json();
        const products = relatedData.map((item: any) => item.related_product).filter((p: Product) => p);
        setRelatedProducts(products);
      }
    } catch (error) {
      console.warn('⚠️ Error loading related products:', error);
    }
  };

  const checkWishlistStatus = async (productId: string, supabaseUrl: string, supabaseKey: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const response = await fetch(`${supabaseUrl}/rest/v1/product_wishlist?user_id=eq.${user.id}&product_id=eq.${productId}`, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${supabaseKey || ''}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const wishlistData = await response.json();
        setIsInWishlist(wishlistData && wishlistData.length > 0);
      }
    } catch (error) {
      console.warn('⚠️ Error checking wishlist:', error);
    }
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    // Find variant with selected color and current size (or first available size)
    const matchingVariant = variants.find(v => 
      v.color === color && 
      (v.size === selectedSize || !selectedSize) &&
      v.is_active
    ) || variants.find(v => v.color === color && v.is_active);
    
    if (matchingVariant) {
      setSelectedVariant(matchingVariant);
      if (matchingVariant.size) setSelectedSize(matchingVariant.size);
    }
  };

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    // Find variant with selected size and current color (or first available color)
    const matchingVariant = variants.find(v => 
      v.size === size && 
      (v.color === selectedColor || !selectedColor) &&
      v.is_active
    ) || variants.find(v => v.size === size && v.is_active);
    
    if (matchingVariant) {
      setSelectedVariant(matchingVariant);
      if (matchingVariant.color) setSelectedColor(matchingVariant.color);
    }
  };

  const toggleWishlist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('تنبيه', 'يجب تسجيل الدخول أولاً');
        return;
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const accessToken = (await supabase.auth.getSession()).data.session?.access_token;

      if (isInWishlist) {
        // Remove from wishlist
        const response = await fetch(`${supabaseUrl}/rest/v1/product_wishlist?user_id=eq.${user.id}&product_id=eq.${id}`, {
          method: 'DELETE',
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken || supabaseKey || ''}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          setIsInWishlist(false);
          Alert.alert('نجح', 'تم إزالة المنتج من المفضلة');
        }
      } else {
        // Add to wishlist
        const response = await fetch(`${supabaseUrl}/rest/v1/product_wishlist`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey || '',
            'Authorization': `Bearer ${accessToken || supabaseKey || ''}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            user_id: user.id,
            product_id: id,
          })
        });
        
        if (response.ok) {
          setIsInWishlist(true);
          Alert.alert('نجح', 'تم إضافة المنتج للمفضلة');
        }
      }
    } catch (error) {
      console.error('❌ Error toggling wishlist:', error);
      Alert.alert('خطأ', 'فشل تحديث قائمة المفضلة');
    }
  };

  const handleAddToCart = () => {
    if (product) {
      // Use variant price if available, otherwise use product price
      const finalPrice = selectedVariant?.price || product.price;
      const finalStock = selectedVariant?.stock_quantity ?? product.stock_quantity;
      
      // لا نتحقق من المخزون للمنتجات من الخارج
      if (product.source_type !== 'external' && product.source_type && finalStock === 0) {
        Alert.alert('تنبيه', 'هذا المتغير غير متوفر حالياً');
        return;
      }
      
      // Create a product object with variant info
      const productToAdd = {
        ...product,
        price: finalPrice,
        stock_quantity: finalStock,
        variant_id: selectedVariant?.id,
        variant_name: selectedVariant?.variant_name,
      };
      
      addToCart(productToAdd, quantity);
      
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
        <View style={styles.nameRow}>
          <Text style={styles.name}>{product.name}</Text>
          <TouchableOpacity onPress={toggleWishlist} style={styles.wishlistButton}>
            <Ionicons 
              name={isInWishlist ? "heart" : "heart-outline"} 
              size={24} 
              color={isInWishlist ? "#EE1C47" : "#666"} 
            />
          </TouchableOpacity>
        </View>
        
        {product.description && (
          <Text style={styles.description}>{product.description}</Text>
        )}

        {/* Price Display with Discount */}
        <View style={styles.priceContainer}>
          <View style={styles.priceInfo}>
            {product.original_price && product.original_price > product.price ? (
              <View>
                <View style={styles.priceRow}>
                  <Text style={styles.originalPrice}>
                    {product.original_price.toFixed(2)} ج.م
                  </Text>
                  {product.discount_percentage && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>-{product.discount_percentage}%</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.currentPrice}>
                  {(selectedVariant?.price || product.price).toFixed(2)} ج.م
                </Text>
              </View>
            ) : (
              <Text style={styles.currentPrice}>
                {(selectedVariant?.price || product.price).toFixed(2)} ج.م
              </Text>
            )}
          </View>
          <View style={styles.stockInfo}>
            {product.source_type === 'external' || !product.source_type ? (
              // المنتجات من الخارج لا تعرض حالة التوفر
              null
            ) : (selectedVariant?.stock_quantity ?? product.stock_quantity) > 0 ? (
              <Text style={styles.stock}>
                متوفر ({(selectedVariant?.stock_quantity ?? product.stock_quantity)} قطعة)
              </Text>
            ) : (
              <Text style={styles.outOfStock}>غير متوفر</Text>
            )}
            {product.sold_count > 0 && (
              <Text style={styles.soldCount}>
                تم بيع {product.sold_count} قطعة
              </Text>
            )}
          </View>
        </View>

        {/* Limited Time Offer Countdown */}
        {product.is_limited_time_offer && product.offer_end_date && (
          <CountdownTimer 
            endDate={product.offer_end_date}
            onExpire={() => {
              // يمكن إضافة منطق لإزالة الخصم عند انتهاء العرض
              console.log('Offer expired');
            }}
          />
        )}

        {/* Color Selection */}
        {variants.length > 0 && variants.some(v => v.color) && (
          <View style={styles.variantSection}>
            <Text style={styles.variantLabel}>اللون:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.variantOptions}>
              {Array.from(new Set(variants.filter(v => v.color).map(v => v.color).filter(Boolean)))
                .filter((color): color is string => Boolean(color))
                .map((color) => {
                const colorVariants = variants.filter(v => v.color === color && v.is_active);
                const isAvailable = colorVariants.some(v => v.stock_quantity > 0);
                const isSelected = selectedColor === color;
                
                return (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      isSelected && styles.colorOptionSelected,
                      !isAvailable && styles.colorOptionDisabled,
                    ]}
                    onPress={() => isAvailable && handleColorSelect(color)}
                    disabled={!isAvailable}
                  >
                    <View style={[styles.colorCircle, { backgroundColor: color.toLowerCase() || '#ccc' }]} />
                    <Text style={[styles.colorText, isSelected && styles.colorTextSelected]}>
                      {color}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Size Selection */}
        {variants.length > 0 && variants.some(v => v.size) && (
          <View style={styles.variantSection}>
            <Text style={styles.variantLabel}>المقاس:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.variantOptions}>
              {Array.from(new Set(variants.filter(v => v.size).map(v => v.size).filter(Boolean)))
                .filter((size): size is string => Boolean(size))
                .map((size) => {
                const sizeVariants = variants.filter(v => 
                  v.size === size && 
                  (selectedColor ? v.color === selectedColor : true) &&
                  v.is_active
                );
                const isAvailable = sizeVariants.some(v => v.stock_quantity > 0);
                const isSelected = selectedSize === size;
                
                return (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.sizeOption,
                      isSelected && styles.sizeOptionSelected,
                      !isAvailable && styles.sizeOptionDisabled,
                    ]}
                    onPress={() => isAvailable && handleSizeSelect(size)}
                    disabled={!isAvailable}
                  >
                    <Text style={[styles.sizeText, isSelected && styles.sizeTextSelected]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

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
            (product.source_type !== 'external' && product.source_type) && (selectedVariant?.stock_quantity ?? product.stock_quantity) === 0 && styles.addToCartButtonDisabled,
          ]}
          onPress={handleAddToCart}
          disabled={(product.source_type !== 'external' && product.source_type) && (selectedVariant?.stock_quantity ?? product.stock_quantity) === 0}
        >
          <Text style={styles.addToCartButtonText}>
            {(product.source_type === 'external' || !product.source_type)
              ? 'أضف للسلة' 
              : (selectedVariant?.stock_quantity ?? product.stock_quantity) === 0 
                ? 'غير متوفر' 
                : 'أضف للسلة'}
          </Text>
        </TouchableOpacity>
        </View>
        </View>

        {/* FAQs Section */}
        {faqs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الأسئلة الشائعة</Text>
            {faqs.map((faq) => (
              <View key={faq.id} style={styles.faqItem}>
                <Text style={styles.faqQuestion}>❓ {faq.question}</Text>
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>منتجات مشابهة</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.relatedProductsContainer}>
              {relatedProducts.map((relatedProduct) => (
                <TouchableOpacity
                  key={relatedProduct.id}
                  style={styles.relatedProductCard}
                  onPress={() => router.push(`/product/${relatedProduct.id}`)}
                >
                  <Image 
                    source={{ uri: relatedProduct.image_url }} 
                    style={styles.relatedProductImage} 
                  />
                  <Text style={styles.relatedProductName} numberOfLines={2}>
                    {relatedProduct.name}
                  </Text>
                  <Text style={styles.relatedProductPrice}>
                    {relatedProduct.price.toFixed(2)} ج.م
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
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
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  priceInfo: {
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 5,
  },
  originalPrice: {
    fontSize: 20,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#EE1C47',
  },
  discountBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stockInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  stock: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  outOfStock: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: '600',
  },
  soldCount: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
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
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  wishlistButton: {
    padding: 8,
  },
  variantSection: {
    marginBottom: 20,
  },
  variantLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  variantOptions: {
    flexDirection: 'row',
  },
  colorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  colorOptionSelected: {
    borderColor: '#EE1C47',
    backgroundColor: '#FFF5F5',
  },
  colorOptionDisabled: {
    opacity: 0.5,
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  colorText: {
    fontSize: 14,
    color: '#666',
  },
  colorTextSelected: {
    color: '#EE1C47',
    fontWeight: '600',
  },
  sizeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    minWidth: 50,
    alignItems: 'center',
  },
  sizeOptionSelected: {
    borderColor: '#EE1C47',
    backgroundColor: '#FFF5F5',
  },
  sizeOptionDisabled: {
    opacity: 0.5,
  },
  sizeText: {
    fontSize: 14,
    color: '#666',
  },
  sizeTextSelected: {
    color: '#EE1C47',
    fontWeight: '600',
  },
  section: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  faqItem: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  relatedProductsContainer: {
    flexDirection: 'row',
  },
  relatedProductCard: {
    width: 150,
    marginRight: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  relatedProductImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
  },
  relatedProductName: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    marginHorizontal: 8,
    marginBottom: 4,
  },
  relatedProductPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EE1C47',
    marginHorizontal: 8,
    marginBottom: 8,
  },
});

