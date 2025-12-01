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
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Product, ProductVariant, ProductImage, ProductFAQ, ProductRelated } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '@/contexts/CartContext';
import CountdownTimer from '@/components/CountdownTimer';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import SweetAlert from '@/components/SweetAlert';
import { SkeletonCard } from '@/components/SkeletonCard';
import { getThumbnailUrl, getMainImageUrl, getCardImageUrl, preloadImages } from '@/utils/imageUtils';

// Thumbnail component with fade-in animation
const ThumbnailImage = ({ 
  imageUrl, 
  isActive, 
  onPress 
}: { 
  imageUrl: string; 
  isActive: boolean; 
  onPress: () => void;
}) => {
  const [loaded, setLoaded] = useState(false);
  const opacity = useState(new Animated.Value(0))[0];

  const handleLoad = () => {
    setLoaded(true);
    // Show thumbnail immediately without animation to avoid flickering
    opacity.setValue(1);
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.thumbnail,
        isActive && styles.thumbnailActive,
      ]}
    >
      {!loaded && (
        <SkeletonCard width={70} height={70} borderRadius={8} />
      )}
      <Animated.View
        style={[
          styles.thumbnailImageWrapper,
          {
            opacity,
          },
        ]}
      >
        <Image
          source={{ uri: getThumbnailUrl(imageUrl, 150, 30) }} // Lower quality (30) for faster loading
          style={styles.thumbnailImage}
          onLoad={handleLoad}
          resizeMode="cover"
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

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
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageOpacity = useState(new Animated.Value(0))[0];
  const router = useRouter();
  const { addToCart } = useCart();
  const sweetAlert = useSweetAlert();

  useEffect(() => {
    loadProduct();
  }, [id]);

  // Update images when variant changes (only if size is selected)
  useEffect(() => {
    if (!product || !selectedVariant || !selectedSize) return;
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    const loadVariantImages = async () => {
      try {
        setImagesLoading(true);
        // Load images for selected variant (specific color + size)
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
            // Separate variant images and general images
            const variantImages = imagesData.filter((img: ProductImage) => img.variant_id);
            const generalImages = imagesData.filter((img: ProductImage) => !img.variant_id);
            
            // Remove duplicates by image_url (same image might be in both variant and general)
            const seenUrls = new Set<string>();
            const uniqueVariantImages = variantImages.filter((img: ProductImage) => {
              if (seenUrls.has(img.image_url)) {
                return false;
              }
              seenUrls.add(img.image_url);
              return true;
            });
            
            const uniqueGeneralImages = generalImages.filter((img: ProductImage) => {
              if (seenUrls.has(img.image_url)) {
                return false;
              }
              seenUrls.add(img.image_url);
              return true;
            });
            
            // Combine: variant images first (prioritized), then general images
            // This shows all product images, with variant-specific images at the start
            const imagesToShow = [...uniqueVariantImages, ...uniqueGeneralImages];
            setProductImages(imagesToShow);
            setCurrentImageIndex(0);
          }
        }
      } catch (error) {
        console.warn('⚠️ Error loading variant images:', error);
      } finally {
        setImagesLoading(false);
      }
    };
    
    loadVariantImages();
  }, [selectedVariant, selectedSize, product?.id]);

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
          sweetAlert.showError('خطأ', 'استغرق التحميل وقتاً طويلاً', () => {
            router.back();
          });
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
        setImagesLoading(true);
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
              // Remove duplicate images by image_url
              const seenUrls = new Set<string>();
              const uniqueImages = imagesData.filter((img: ProductImage) => {
                if (seenUrls.has(img.image_url)) {
                  return false;
                }
                seenUrls.add(img.image_url);
                return true;
              });
              console.log('✅ Unique product images:', uniqueImages.length, 'out of', imagesData.length);
              setProductImages(uniqueImages);
              
              // Preload first image immediately for faster display (main image, quality 75)
              if (uniqueImages.length > 0 && uniqueImages[0]?.image_url) {
                Image.prefetch(getMainImageUrl(uniqueImages[0].image_url, 75)).catch(() => {});
              }
              
              // Preload thumbnail images in parallel (using smaller size and lower quality for thumbnails)
              if (uniqueImages.length > 1) {
                uniqueImages.slice(1, Math.min(10, uniqueImages.length)).forEach(img => {
                  if (img.image_url) {
                    // Preload thumbnail version (smaller, faster, quality 30)
                    Image.prefetch(getThumbnailUrl(img.image_url, 150, 30)).catch(() => {});
                  }
                });
              }
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
        } finally {
          setImagesLoading(false);
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
        sweetAlert.showError('خطأ', 'المنتج غير موجود', () => {
          router.back();
        });
      }
    } catch (error: any) {
      console.error('❌ Error loading product:', error);
      sweetAlert.showError('خطأ', error.message || 'فشل تحميل المنتج', () => {
        router.back();
      });
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

  const handleColorSelect = async (color: string) => {
    setSelectedColor(color);
    // Reset size when color changes
    setSelectedSize(null);
    setSelectedVariant(null);
    
    // Load images for the selected color
    if (!product) return;
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    try {
      // Find variant with this color (any size)
      const colorVariant = variants.find(v => v.color === color && v.is_active);
      
      if (colorVariant) {
        // Load images for this variant (color) - get all variants with this color
        const colorVariants = variants.filter(v => v.color === color && v.is_active);
        const colorVariantIds = colorVariants.map(v => v.id);
        
        // Build OR condition for all color variants
        const variantIdConditions = colorVariantIds.map(id => `variant_id.eq.${id}`).join(',');
        const orCondition = `or=(${variantIdConditions},variant_id.is.null)`;
        
        const response = await fetch(
          `${supabaseUrl}/rest/v1/product_images?product_id=eq.${product.id}&${orCondition}&order=display_order.asc,is_primary.desc`,
          {
            headers: {
              'apikey': supabaseKey || '',
              'Authorization': `Bearer ${supabaseKey || ''}`,
              'Content-Type': 'application/json',
            }
          }
        );
        
        if (response.ok) {
          const imagesData = await response.json();
          if (imagesData && imagesData.length > 0) {
            // Separate variant images and general images
            const variantImages = imagesData.filter((img: ProductImage) => img.variant_id);
            const generalImages = imagesData.filter((img: ProductImage) => !img.variant_id);
            
            // Remove duplicates by image_url (same image might be in both variant and general)
            const seenUrls = new Set<string>();
            const uniqueVariantImages = variantImages.filter((img: ProductImage) => {
              if (seenUrls.has(img.image_url)) {
                return false;
              }
              seenUrls.add(img.image_url);
              return true;
            });
            
            const uniqueGeneralImages = generalImages.filter((img: ProductImage) => {
              if (seenUrls.has(img.image_url)) {
                return false;
              }
              seenUrls.add(img.image_url);
              return true;
            });
            
            // Combine: variant images first (prioritized), then general images
            // This shows all product images, with color-specific images at the start
            const imagesToShow = [...uniqueVariantImages, ...uniqueGeneralImages];
            setProductImages(imagesToShow);
            setCurrentImageIndex(0);
          }
        }
      } else {
        // If no variant found, load general images
        const response = await fetch(
          `${supabaseUrl}/rest/v1/product_images?product_id=eq.${product.id}&variant_id=is.null&order=display_order.asc`,
          {
            headers: {
              'apikey': supabaseKey || '',
              'Authorization': `Bearer ${supabaseKey || ''}`,
              'Content-Type': 'application/json',
            }
          }
        );
        
        if (response.ok) {
          const imagesData = await response.json();
          if (imagesData && imagesData.length > 0) {
            setProductImages(imagesData);
            setCurrentImageIndex(0);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Error loading color images:', error);
    }
  };

  const handleSizeSelect = (size: string) => {
    if (!selectedColor) {
      sweetAlert.showError('تنبيه', 'يرجى اختيار اللون أولاً');
      return;
    }
    
    setSelectedSize(size);
    // Find variant with selected color and size
    const matchingVariant = variants.find(v => 
      v.color === selectedColor && 
      v.size === size &&
      v.is_active
    );
    
    if (matchingVariant) {
      setSelectedVariant(matchingVariant);
    }
  };

  const toggleWishlist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        sweetAlert.showError('تنبيه', 'يجب تسجيل الدخول أولاً');
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
          sweetAlert.showSuccess('نجح', 'تم إزالة المنتج من المفضلة');
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
          sweetAlert.showSuccess('نجح', 'تم إضافة المنتج للمفضلة');
        }
      }
    } catch (error) {
      console.error('❌ Error toggling wishlist:', error);
      sweetAlert.showError('خطأ', 'فشل تحديث قائمة المفضلة');
    }
  };

  const handleAddToCart = () => {
    if (product) {
      // Use variant price if available, otherwise use product price
      const finalPrice = selectedVariant?.price || product.price;
      const finalStock = selectedVariant?.stock_quantity ?? product.stock_quantity;
      
      // لا نتحقق من المخزون للمنتجات من الخارج
      if (product.source_type !== 'external' && product.source_type && finalStock === 0) {
        sweetAlert.showError('تنبيه', 'هذا المتغير غير متوفر حالياً');
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
      
      sweetAlert.showConfirm('نجح', 'تم إضافة المنتج للسلة. هل تريد الذهاب للسلة؟', () => {
        router.push('/(tabs)/cart');
      });
    }
  };

  const currentImage = productImages[currentImageIndex]?.image_url || product?.image_url || '';
  const hasMultipleImages = productImages.length > 1;

  const isWeb = Platform.OS === 'web';
  const { width } = Dimensions.get('window');
  const maxContentWidth = isWeb ? 1200 : width;

  // Preload next and previous images + nearby images for faster navigation
  useEffect(() => {
    if (product && productImages.length > 0) {
      const preloadImages: string[] = [];
      
      // Preload previous image (main image, quality 75)
      if (currentImageIndex > 0) {
        const prevUrl = productImages[currentImageIndex - 1]?.image_url;
        if (prevUrl) preloadImages.push(getMainImageUrl(prevUrl, 75));
      }
      
      // Preload next image (main image, quality 75)
      if (currentImageIndex < productImages.length - 1) {
        const nextUrl = productImages[currentImageIndex + 1]?.image_url;
        if (nextUrl) preloadImages.push(getMainImageUrl(nextUrl, 75));
      }
      
      // Preload images 2-3 positions ahead/behind for smoother scrolling (main images, quality 75)
      if (currentImageIndex > 1) {
        const prev2Url = productImages[currentImageIndex - 2]?.image_url;
        if (prev2Url) preloadImages.push(getMainImageUrl(prev2Url, 75));
      }
      if (currentImageIndex < productImages.length - 2) {
        const next2Url = productImages[currentImageIndex + 2]?.image_url;
        if (next2Url) preloadImages.push(getMainImageUrl(next2Url, 75));
      }
      
      // Preload all images in parallel
      preloadImages.forEach(url => {
        if (url) {
          Image.prefetch(url).catch(() => {
            // Silently fail if preload fails
          });
        }
      });
    }
  }, [currentImageIndex, productImages, product]);
  
  // Preload all thumbnail images when product images are loaded
  useEffect(() => {
    if (product && productImages.length > 0) {
      // Preload all thumbnail images in parallel (using smaller size and lower quality for thumbnails)
      productImages.forEach(img => {
        if (img.image_url) {
          // Preload thumbnail version (smaller, faster, quality 30)
          Image.prefetch(getThumbnailUrl(img.image_url, 150, 30)).catch(() => {});
        }
      });
    }
  }, [productImages, product]);

  // Reset image loaded state when image changes and preload new image
  useEffect(() => {
    if (product && currentImage) {
      setImageLoaded(false);
      imageOpacity.setValue(0);
      
      // Preload the new current image immediately (main image, quality 75)
      Image.prefetch(getMainImageUrl(currentImage, 75)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentImageIndex, currentImage, product]);

  if (loading) {
    const isWeb = Platform.OS === 'web';
    const { width } = Dimensions.get('window');
    const maxContentWidth = isWeb ? 1200 : width;
    const imageHeight = isWeb ? 500 : width * 0.8;
    
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.contentWrapper, { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
            <View style={styles.imageSection}>
              <SkeletonCard width="100%" height={imageHeight} borderRadius={8} />
            </View>
            <View style={styles.content}>
              <SkeletonCard width="90%" height={24} borderRadius={4} />
              <View style={{ marginTop: 16, gap: 8 }}>
                <SkeletonCard width="60%" height={28} borderRadius={4} />
                <SkeletonCard width="40%" height={20} borderRadius={4} />
              </View>
            </View>
          </View>
        </ScrollView>
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

  // Handle image load
  const handleImageLoad = () => {
    setImageLoaded(true);
    // Show image immediately without animation to avoid flickering
    imageOpacity.setValue(1);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.contentWrapper, { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
          {/* Product Images - Full width on top */}
          <View style={styles.imageSection}>
            <View style={styles.imageContainer}>
              {imagesLoading ? (
                <SkeletonCard width="100%" height={isWeb ? 500 : width * 0.8} borderRadius={8} />
              ) : (
                <>
                  {!imageLoaded && (
                    <View style={styles.skeletonOverlay}>
                      <SkeletonCard width="100%" height={isWeb ? 500 : width * 0.8} borderRadius={8} />
                    </View>
                  )}
                  <Animated.View
                    style={[
                      styles.imageWrapper,
                      {
                        opacity: imageOpacity, // Use animated value for smooth transition
                      },
                    ]}
                  >
                    <Image
                      key={`${currentImage}-${currentImageIndex}`} // Force re-render when image changes
                      source={{ uri: getMainImageUrl(currentImage, 75) }} // Higher quality (75) for main image
                      style={styles.image}
                      onLoad={handleImageLoad}
                      resizeMode="contain"
                    />
                  </Animated.View>
                  
                  {/* Image Navigation */}
                  {hasMultipleImages && (
                    <>
                      {currentImageIndex > 0 && (
                        <TouchableOpacity
                          style={[styles.imageNavButton, styles.imageNavButtonLeft]}
                          onPress={() => setCurrentImageIndex(currentImageIndex - 1)}
                        >
                          <Ionicons name="chevron-back" size={20} color="#fff" />
                        </TouchableOpacity>
                      )}
                      
                      {currentImageIndex < productImages.length - 1 && (
                        <TouchableOpacity
                          style={[styles.imageNavButton, styles.imageNavButtonRight]}
                          onPress={() => setCurrentImageIndex(currentImageIndex + 1)}
                        >
                          <Ionicons name="chevron-forward" size={20} color="#fff" />
                        </TouchableOpacity>
                      )}
                      
                      {/* Image Counter */}
                      <View style={styles.imageCounter}>
                        <Text style={styles.imageCounterText}>
                          {currentImageIndex + 1} / {productImages.length}
                        </Text>
                      </View>
                    </>
                  )}
                </>
              )}
            </View>
            
            {/* Thumbnail Images (if multiple) - Below main image */}
            {imagesLoading ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.thumbnailsContainer}
                contentContainerStyle={styles.thumbnailsContent}
              >
                {Array.from({ length: 4 }).map((_, index) => (
                  <View key={index} style={{ marginRight: 8 }}>
                    <SkeletonCard width={70} height={70} borderRadius={8} />
                  </View>
                ))}
              </ScrollView>
            ) : hasMultipleImages && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.thumbnailsContainer}
                contentContainerStyle={styles.thumbnailsContent}
              >
                {productImages.map((img, index) => (
                  <ThumbnailImage
                    key={img.id}
                    imageUrl={img.image_url}
                    isActive={index === currentImageIndex}
                    onPress={() => setCurrentImageIndex(index)}
                  />
                ))}
              </ScrollView>
            )}
          </View>
          
          {/* Product Info - Card style */}
          <View style={styles.content}>
            {/* Product Name Card - Temu Style */}
            <View style={styles.nameCard}>
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
            </View>
            
            {/* Price Card - Temu Style */}
            <View style={styles.priceCard}>
              <View style={styles.priceRow}>
                {(() => {
                  // Check if limited time discount is active
                  const isLimitedActive = product.limited_time_discount_percentage && 
                    product.limited_time_discount_end_date &&
                    new Date(product.limited_time_discount_end_date) > new Date();
                  
                  const activeDiscount = isLimitedActive 
                    ? product.limited_time_discount_percentage 
                    : product.discount_percentage;
                  
                  const hasDiscount = (product.strikethrough_price && product.strikethrough_price > product.price) || 
                                      (product.original_price && product.original_price > product.price) || 
                                      activeDiscount;
                  
                  // استخدام strikethrough_price إذا كان موجوداً، وإلا استخدم original_price
                  let displayOriginalPrice = product.strikethrough_price || product.original_price;
                  if (!displayOriginalPrice && activeDiscount && activeDiscount > 0) {
                    displayOriginalPrice = product.price / (1 - activeDiscount / 100);
                  }
                  
                  if (hasDiscount) {
                    return (
                      <>
                        <View style={styles.priceLeft}>
                          <Text style={styles.currentPrice}>
                            {(selectedVariant?.price || product.price).toFixed(2)} ج.م
                          </Text>
                          {displayOriginalPrice && displayOriginalPrice > product.price && (
                            <Text style={styles.originalPrice}>
                              {displayOriginalPrice.toFixed(2)} ج.م
                            </Text>
                          )}
                        </View>
                        {activeDiscount && (
                          <View style={[styles.discountBadge, isLimitedActive && { backgroundColor: '#DC2626' }]}>
                            <Text style={styles.discountText}>-{activeDiscount}%</Text>
                            {isLimitedActive && (
                              <Text style={[styles.discountText, { fontSize: 10, marginTop: 2 }]}>محدود</Text>
                            )}
                          </View>
                        )}
                      </>
                    );
                  } else {
                    return (
                      <Text style={styles.currentPrice}>
                        {(selectedVariant?.price || product.price).toFixed(2)} ج.م
                      </Text>
                    );
                  }
                })()}
              </View>
              {product.sold_count > 0 && (
                <Text style={styles.soldCount}>
                  {product.sold_count}+ تم البيع
                </Text>
              )}
            </View>
            
            {/* Limited Time Discount Countdown */}
            {product.limited_time_discount_percentage && 
             product.limited_time_discount_end_date &&
             new Date(product.limited_time_discount_end_date) > new Date() && (
              <CountdownTimer 
                endDate={product.limited_time_discount_end_date}
                onExpire={() => {
                  // الخصم المحدود انتهى، سيتم تطبيق الخصم العادي تلقائياً
                  console.log('Limited discount expired');
                }}
              />
            )}
            {/* Limited Time Offer Countdown (legacy) */}
            {!product.limited_time_discount_percentage && 
             product.is_limited_time_offer && 
             product.offer_end_date && (
              <CountdownTimer 
                endDate={product.offer_end_date}
                onExpire={() => {
                  console.log('Offer expired');
                }}
              />
            )}

            {/* Color Selection - Temu Style */}
            {variants.length > 0 && variants.some(v => v.color) && (
              <View style={styles.variantCard}>
                <Text style={styles.variantLabel}>
                  {!selectedColor ? 'اختر اللون' : 'اللون المختار'}
                </Text>
                <View style={styles.colorGrid}>
                  {Array.from(new Set(
                    variants
                      .filter(v => v.color && v.is_active)
                      .map(v => v.color)
                      .filter(Boolean)
                  ))
                    .filter((color): color is string => Boolean(color))
                    .map((color) => {
                    const colorVariants = variants.filter(v => v.color === color && v.is_active);
                    const isAvailable = colorVariants.length > 0;
                    const isSelected = selectedColor === color;
                    
                    // Try to get color hex from category colors if available
                    const colorHex = color.toLowerCase();
                    
                    return (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorCircleButton,
                          !isAvailable && styles.colorCircleDisabled,
                          isSelected && styles.colorCircleSelected,
                        ]}
                        onPress={() => isAvailable && handleColorSelect(color)}
                        disabled={!isAvailable}
                      >
                        <View style={[
                          styles.colorCircleLarge,
                          isSelected && styles.colorCircleLargeSelected,
                          { backgroundColor: colorHex === 'رمادي' ? '#808080' : 
                                       colorHex === 'أسود' ? '#000000' :
                                       colorHex === 'أبيض' ? '#FFFFFF' :
                                       colorHex === 'كاكي' ? '#C3B091' :
                                       colorHex === 'قرمزي' ? '#DC143C' :
                                       colorHex || '#ccc' }
                        ]} />
                        <Text style={[
                          styles.colorLabel,
                          isSelected && styles.colorLabelSelected
                        ]}>{color}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Size Selection - Temu Style Grid */}
            {selectedColor && variants.length > 0 && variants.some(v => v.size && v.color === selectedColor) && (
              <View style={styles.variantCard}>
                <Text style={styles.variantLabel}>اختر المقاس</Text>
                <View style={styles.sizeGrid}>
                  {Array.from(new Set(
                    variants
                      .filter(v => v.size && v.color === selectedColor && v.is_active)
                      .map(v => v.size)
                      .filter(Boolean)
                  ))
                    .filter((size): size is string => Boolean(size))
                    .map((size) => {
                    const sizeVariant = variants.find(v => 
                      v.size === size && 
                      v.color === selectedColor &&
                      v.is_active
                    );
                    const isAvailable = sizeVariant ? (product.source_type === 'external' || sizeVariant.stock_quantity > 0) : false;
                    const isSelected = selectedSize === size;
                    
                    return (
                      <TouchableOpacity
                        key={size}
                        style={[
                          styles.sizeGridItem,
                          isSelected && styles.sizeGridItemSelected,
                          !isAvailable && styles.sizeGridItemDisabled,
                        ]}
                        onPress={() => isAvailable && handleSizeSelect(size)}
                        disabled={!isAvailable}
                      >
                        <Text style={[
                          styles.sizeGridText,
                          isSelected && styles.sizeGridTextSelected
                        ]}>
                          {size}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Quantity - Temu Style */}
            <View style={styles.quantityCard}>
              <Text style={styles.quantityLabel}>الكمية</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Ionicons name="remove" size={20} color="#333" />
                </TouchableOpacity>
                <Text style={styles.quantity}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantity(quantity + 1)}
                >
                  <Ionicons name="add" size={20} color="#333" />
                </TouchableOpacity>
              </View>
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

      {/* Sticky Add to Cart Button - Temu Style */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            ((variants.length > 0 && (!selectedColor || !selectedSize)) || 
             (product.source_type !== 'external' && product.source_type) && (selectedVariant?.stock_quantity ?? product.stock_quantity) === 0) && 
            styles.addToCartButtonDisabled,
          ]}
          onPress={handleAddToCart}
          disabled={
            (variants.length > 0 && (!selectedColor || !selectedSize)) ||
            ((product.source_type !== 'external' && product.source_type) && (selectedVariant?.stock_quantity ?? product.stock_quantity) === 0)
          }
        >
          <Text style={styles.addToCartButtonText}>
            {variants.length > 0 && (!selectedColor || !selectedSize)
              ? 'يرجى اختيار اللون والمقاس'
              : (product.source_type === 'external' || !product.source_type)
                ? 'أضف للسلة' 
                : (selectedVariant?.stock_quantity ?? product.stock_quantity) === 0 
                  ? 'غير متوفر' 
                  : 'أضف للسلة'}
          </Text>
        </TouchableOpacity>
      </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for sticky button
  },
  contentWrapper: {
    width: '100%',
  },
  imageSection: {
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 400,
    backgroundColor: '#fff',
  },
  skeletonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  imageWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  image: {
    width: '100%',
    height: 400,
    backgroundColor: '#f0f0f0',
    resizeMode: 'contain',
    // Optimize main image rendering
    ...(Platform.OS === 'web' && {
      imageRendering: 'auto', // Better quality for main images on web
    }),
  },
  imageNavButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  imageNavButtonLeft: {
    left: 12,
  },
  imageNavButtonRight: {
    right: 12,
  },
  imageCounter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  thumbnailsContainer: {
    maxHeight: 90,
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  thumbnailsContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  thumbnailActive: {
    borderColor: '#EE1C47',
  },
  thumbnailImageWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    // Optimize thumbnail rendering
    ...(Platform.OS === 'web' && {
      imageRendering: 'crisp-edges', // Better quality for small images on web
    }),
  },
  content: {
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  nameCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    lineHeight: 28,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginTop: 8,
  },
  priceCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  originalPrice: {
    fontSize: 16,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#EE1C47',
  },
  discountBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  soldCount: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  quantityCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  quantity: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    minWidth: 30,
    textAlign: 'center',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  addToCartButton: {
    backgroundColor: '#EE1C47',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
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
  variantCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  variantLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorCircleButton: {
    alignItems: 'center',
    gap: 6,
    width: 70,
  },
  colorCircleLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  colorCircleLargeSelected: {
    borderColor: '#EE1C47',
    borderWidth: 3,
    shadowColor: '#EE1C47',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  colorCircleSelected: {
    // Additional styling for selected color button if needed
  },
  colorCircleDisabled: {
    opacity: 0.4,
  },
  colorLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  colorLabelSelected: {
    color: '#EE1C47',
    fontWeight: '600',
  },
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sizeGridItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeGridItemSelected: {
    borderColor: '#EE1C47',
    backgroundColor: '#FFF5F5',
  },
  sizeGridItemDisabled: {
    opacity: 0.4,
    backgroundColor: '#F5F5F5',
  },
  sizeGridText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  sizeGridTextSelected: {
    color: '#EE1C47',
    fontWeight: '600',
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF5F5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EE1C47',
  },
  changeButtonText: {
    color: '#EE1C47',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
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

