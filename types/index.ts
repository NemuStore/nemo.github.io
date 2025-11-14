export type UserRole = 'customer' | 'admin' | 'employee' | 'manager';

// Section (المستوى الأول: أقسام)
export interface Section {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Category (المستوى الثاني: فئات مرتبطة بقسم)
export interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  section_id: string | null; // Reference to parent section
  // Optional enhancements
  banner_image: string | null; // Category banner image
  color_hex: string | null; // Category color
  default_filters: Record<string, any> | null; // Default filter settings
  created_at: string;
  updated_at: string;
  section_data?: Section; // Joined section data
  colors?: CategoryColor[]; // Available colors for this category
  sizes?: CategorySize[]; // Available sizes for this category
}

// Category Color Option
export interface CategoryColor {
  id: string;
  category_id: string;
  color_name: string;
  color_hex: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Category Size Option
export interface CategorySize {
  id: string;
  category_id: string;
  size_value: string;
  size_unit: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export type ProductSource = 'warehouse' | 'external'; // مخزن داخلي أو طلب من الخارج

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null; // Original price before discount
  discount_percentage: number | null; // Discount percentage (0-100)
  image_url: string;
  category: string | null; // Keep for backward compatibility
  category_id: string | null; // Reference to categories table
  stock_quantity: number;
  source_type: ProductSource; // 'warehouse' = من المخزن الداخلي، 'external' = طلب من الخارج
  sold_count: number; // عدد القطع المباعة (يتم تحديثه تلقائياً)
  // Limited time offer fields
  is_limited_time_offer: boolean; // هل المنتج في عرض محدود الوقت
  offer_start_date: string | null; // تاريخ بداية العرض
  offer_duration_days: number | null; // مدة العرض بالأيام
  offer_end_date: string | null; // تاريخ انتهاء العرض (يتم حسابه تلقائياً)
  // New fields for enhanced product page
  shipping_cost: number | null; // Shipping cost (null = free shipping)
  estimated_delivery_days: number | null; // Estimated delivery days
  free_shipping_threshold: number | null; // Minimum order for free shipping
  return_policy_days: number | null; // Days allowed for returns
  warranty_period: string | null; // Warranty period description
  weight_kg: number | null; // Product weight in kg
  dimensions: string | null; // Product dimensions (e.g., "30x20x10 سم")
  brand: string | null; // Brand name
  sku: string | null; // Product SKU code (unique, not shown to customers)
  is_featured: boolean; // Featured product flag
  is_new: boolean; // New product flag
  tags: string[]; // Product tags array
  created_at: string;
  updated_at: string;
  category_data?: Category; // Joined category data
  section_data?: Section; // Joined section data (via category)
  // Joined data
  specifications?: ProductSpecification[]; // Product specifications
  reviews?: ProductReview[]; // Product reviews
  average_rating?: number; // Calculated average rating
  reviews_count?: number; // Total reviews count
  variants?: ProductVariant[]; // Product variants (colors, sizes)
  images?: ProductImage[]; // Product images (multiple images)
  faqs?: ProductFAQ[]; // Product FAQs
  related_products?: ProductRelated[]; // Related products
}

// Product Specification
export interface ProductSpecification {
  id: string;
  product_id: string;
  spec_type: 'color' | 'size' | 'material' | 'dimensions' | 'weight' | 'brand' | 'other';
  spec_key: string; // Display name (e.g., 'اللون', 'المقاس')
  spec_value: string; // Actual value (e.g., 'أحمر', 'L')
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Product Review
export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number; // 1-5
  title: string | null;
  comment: string | null;
  images: string[]; // Review images
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  user_data?: User; // Joined user data
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped_from_china' | 'received_in_uae' | 'shipped_from_uae' | 'received_in_egypt' | 'in_warehouse' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  shipping_address: string;
  latitude: number | null;
  longitude: number | null;
  estimated_delivery_days: number | null;
  source_type: ProductSource | null; // 'warehouse' أو 'external' - null للطلبات القديمة
  parent_order_id: string | null; // إذا كان هذا الطلب جزء من طلب أكبر (للفصل بين الداخلي والخارجي)
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  product?: Product;
}

export type ShipmentStatus = 'pending' | 'shipped_from_china' | 'received_in_uae' | 'shipped_from_uae' | 'received_in_egypt' | 'in_warehouse' | 'completed';

export interface Shipment {
  id: string;
  shipment_number: string;
  status: ShipmentStatus;
  cost: number;
  shipped_from_china_at: string | null;
  received_in_uae_at: string | null;
  shipped_from_uae_at: string | null;
  received_in_egypt_at: string | null;
  entered_warehouse_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShipmentOrder {
  id: string;
  shipment_id: string;
  order_id: string;
  order?: Order;
}

export interface Inventory {
  id: string;
  product_id: string;
  quantity: number;
  cost_per_unit: number;
  shipment_id: string | null;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'order' | 'shipment' | 'delivery' | 'system';
  read: boolean;
  created_at: string;
}

// Product Variant (متغيرات المنتج - ألوان، مقاسات)
export interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string; // مثل: "أحمر - مقاس L"
  color: string | null; // اللون
  size: string | null; // المقاس (S, M, L, 40, 41, 100x200, إلخ)
  size_unit: string | null; // وحدة القياس (مقاس، رقم، بوصة، سم، إلخ)
  material: string | null; // الخامة
  price: number | null; // سعر مختلف للمتغير (NULL = يستخدم سعر المنتج الأساسي)
  stock_quantity: number; // المخزون الخاص بهذا المتغير
  sku: string | null; // كود المنتج الفريد لهذا المتغير
  image_url: string | null; // صورة خاصة بهذا المتغير
  is_active: boolean; // هل المتغير متاح للبيع؟
  is_default: boolean; // المتغير الافتراضي (يظهر أولاً)
  display_order: number; // ترتيب العرض
  created_at: string;
  updated_at: string;
}

// Product FAQ (الأسئلة الشائعة)
export interface ProductFAQ {
  id: string;
  product_id: string;
  question: string; // السؤال
  answer: string; // الإجابة
  display_order: number; // ترتيب العرض
  is_active: boolean; // هل السؤال نشط؟
  created_at: string;
  updated_at: string;
}

// Product Related (المنتجات المشابهة والمرتبطة)
export type ProductRelationType = 'similar' | 'complementary' | 'upsell' | 'cross_sell';

export interface ProductRelated {
  id: string;
  product_id: string;
  related_product_id: string;
  relation_type: ProductRelationType; // نوع العلاقة
  display_order: number;
  is_active: boolean;
  created_at: string;
  related_product?: Product; // Joined product data
}

// Product Wishlist (قائمة الأمنيات)
export interface ProductWishlist {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product; // Joined product data
}

// Product Image (صور المنتج - موجود بالفعل لكن نضيفه للتوثيق)
export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
  variant_id: string | null; // ربط الصورة بمتغير معين (لون) - NULL = صورة عامة للمنتج
  created_at: string;
  updated_at: string;
}

