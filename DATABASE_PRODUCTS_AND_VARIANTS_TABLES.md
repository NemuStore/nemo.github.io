# 📊 جداول وأعمدة قاعدة البيانات: المنتجات والمتغيرات

## 📋 ملخص الجداول

### 1. جدول `products` (المنتجات الأساسية)
### 2. جدول `product_variants` (متغيرات المنتج)
### 3. جدول `product_images` (صور المنتج والمتغيرات)
### 4. جدول `product_specifications` (مواصفات المنتج)

---

## 1️⃣ جدول `products` (المنتجات الأساسية)

**الملف:** `supabase/enhance_products_table.sql`

### الأعمدة الأساسية:

| العمود | النوع | الوصف | ملاحظات |
|--------|------|-------|---------|
| `id` | UUID | المعرف الفريد | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `name` | TEXT | اسم المنتج | NOT NULL |
| `description` | TEXT | وصف المنتج | NULL |
| `price` | NUMERIC(10,2) | السعر الأساسي | NOT NULL |
| `original_price` | NUMERIC(10,2) | السعر الأصلي قبل الخصم | NULL |
| `discount_percentage` | INTEGER | نسبة الخصم (0-100) | NULL |
| `image_url` | TEXT | الصورة الأساسية | NULL (يُستخدم كـ fallback) |
| `category_id` | UUID | معرف الفئة | NULL, REFERENCES categories(id) |
| `stock_quantity` | INTEGER | المخزون الأساسي | NOT NULL, DEFAULT 0 |
| `source_type` | TEXT | نوع المصدر | NOT NULL, DEFAULT 'warehouse', CHECK IN ('warehouse', 'external') |
| `sold_count` | INTEGER | عدد القطع المباعة | DEFAULT 0 |
| `is_limited_time_offer` | BOOLEAN | عرض محدود الوقت | DEFAULT false |
| `offer_start_date` | TIMESTAMP | تاريخ بداية العرض | NULL |
| `offer_duration_days` | INTEGER | مدة العرض بالأيام | NULL |
| `offer_end_date` | TIMESTAMP | تاريخ انتهاء العرض | NULL |

### الأعمدة الإضافية (الشحن والتسليم):

| العمود | النوع | الوصف |
|--------|------|-------|
| `shipping_cost` | NUMERIC(10,2) | تكلفة الشحن (NULL = شحن مجاني) |
| `estimated_delivery_days` | INTEGER | عدد أيام التوصيل المتوقع |
| `free_shipping_threshold` | NUMERIC(10,2) | الحد الأدنى للطلب للشحن المجاني |
| `return_policy_days` | INTEGER | عدد أيام الإرجاع المسموح بها |
| `warranty_period` | TEXT | فترة الضمان |

### الأعمدة الإضافية (معلومات المنتج):

| العمود | النوع | الوصف |
|--------|------|-------|
| `weight_kg` | NUMERIC(5,2) | الوزن بالكيلوجرام |
| `dimensions` | TEXT | الأبعاد (مثل: "30x20x10 سم") |
| `brand` | TEXT | اسم العلامة التجارية |
| `sku` | TEXT | كود المنتج الفريد | UNIQUE |
| `is_featured` | BOOLEAN | منتج مميز | DEFAULT false |
| `is_new` | BOOLEAN | منتج جديد | DEFAULT false |
| `tags` | TEXT[] | مصفوفة العلامات | NULL |

### الأعمدة الإضافية (التواريخ):

| العمود | النوع | الوصف |
|--------|------|-------|
| `created_at` | TIMESTAMP | تاريخ الإنشاء | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | تاريخ التحديث | DEFAULT NOW() |

### الفهارس:

- `idx_products_category_id` على `category_id`
- `idx_products_source_type` على `source_type`
- `idx_products_is_featured` على `is_featured`
- `idx_products_is_new` على `is_new`
- `idx_products_sku` على `sku` (UNIQUE)

---

## 2️⃣ جدول `product_variants` (متغيرات المنتج)

**الملف:** `supabase/create_product_variants_table.sql`

### الأعمدة:

| العمود | النوع | الوصف | ملاحظات |
|--------|------|-------|---------|
| `id` | UUID | المعرف الفريد | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `product_id` | UUID | معرف المنتج | NOT NULL, REFERENCES products(id) ON DELETE CASCADE |
| `variant_name` | TEXT | اسم المتغير | NOT NULL, مثل: "أحمر - مقاس L" |
| `color` | TEXT | اللون | NULL, مثل: "أحمر", "أسود", "أزرق" |
| `size` | TEXT | المقاس | NULL, مثل: "S", "M", "L", "XL", "42", "100x200" |
| `size_unit` | TEXT | وحدة القياس | NULL, مثل: "مقاس", "رقم", "سم", "بوصة" |
| `material` | TEXT | الخامة | NULL, اختياري |
| `price` | NUMERIC(10,2) | سعر المتغير | NULL, إذا كان NULL يستخدم سعر المنتج الأساسي |
| `stock_quantity` | INTEGER | المخزون | NOT NULL, DEFAULT 0 |
| `sku` | TEXT | كود المنتج الفريد | NULL |
| `is_active` | BOOLEAN | هل المتغير متاح؟ | DEFAULT true |
| `is_default` | BOOLEAN | المتغير الافتراضي | DEFAULT false, يظهر أولاً |
| `display_order` | INTEGER | ترتيب العرض | NOT NULL, DEFAULT 0 |
| `created_at` | TIMESTAMP | تاريخ الإنشاء | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | تاريخ التحديث | DEFAULT NOW() |

### ⚠️ ملاحظة مهمة:

- **لا يوجد عمود `image_url` في هذا الجدول** (تم حذفه)
- جميع صور المتغيرات تُحفظ في جدول `product_images` مع `variant_id`

### القيود:

- `UNIQUE(product_id, color, size)` - لا يمكن تكرار نفس المزيج (لون + مقاس) لنفس المنتج

### الفهارس:

- `idx_product_variants_product_id` على `product_id`
- `idx_product_variants_color` على `(product_id, color)` WHERE color IS NOT NULL
- `idx_product_variants_size` على `(product_id, size)` WHERE size IS NOT NULL
- `idx_product_variants_is_active` على `(product_id, is_active)` WHERE is_active = true
- `idx_product_variants_is_default` على `(product_id, is_default)` WHERE is_default = true
- `idx_product_variants_display_order` على `(product_id, display_order)`
- `idx_product_variants_sku` على `sku` WHERE sku IS NOT NULL

### Triggers:

- `update_product_variants_updated_at` - تحديث `updated_at` تلقائياً
- `ensure_single_default_variant` - ضمان متغير افتراضي واحد فقط لكل منتج

---

## 3️⃣ جدول `product_images` (صور المنتج والمتغيرات)

**الملف:** `supabase/create_product_images_table.sql`

### الأعمدة:

| العمود | النوع | الوصف | ملاحظات |
|--------|------|-------|---------|
| `id` | UUID | المعرف الفريد | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `product_id` | UUID | معرف المنتج | NOT NULL, REFERENCES products(id) ON DELETE CASCADE |
| `image_url` | TEXT | رابط الصورة | NOT NULL, رابط من imgbb |
| `display_order` | INTEGER | ترتيب العرض | NOT NULL, DEFAULT 0 |
| `is_primary` | BOOLEAN | صورة أساسية | DEFAULT false |
| `variant_id` | UUID | معرف المتغير | NULL, REFERENCES product_variants(id) ON DELETE CASCADE |
| `created_at` | TIMESTAMP | تاريخ الإنشاء | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | تاريخ التحديث | DEFAULT NOW() |

### المنطق:

- **`variant_id = NULL`** → صورة عامة للمنتج
- **`variant_id = UUID`** → صورة خاصة بمتغير معين (لون)

### الفهارس:

- `idx_product_images_product_id` على `product_id`
- `idx_product_images_display_order` على `(product_id, display_order)`
- `idx_product_images_variant_id` على `variant_id`
- `idx_product_images_product_variant` على `(product_id, variant_id)`
- `idx_product_images_is_primary` على `(product_id, is_primary)`

### Triggers:

- `update_product_images_updated_at` - تحديث `updated_at` تلقائياً
- `ensure_single_primary_image` - ضمان صورة أساسية واحدة فقط لكل منتج/متغير

### RLS Policies:

- `Anyone can view product images` - الجميع يمكنه القراءة
- `Only admins can insert product images` - الأدمن فقط يمكنه الإدراج
- `Only admins can update product images` - الأدمن فقط يمكنه التحديث
- `Only admins can delete product images` - الأدمن فقط يمكنه الحذف

---

## 4️⃣ جدول `product_specifications` (مواصفات المنتج)

**الملف:** `supabase/enhance_products_table.sql`

### الأعمدة:

| العمود | النوع | الوصف | ملاحظات |
|--------|------|-------|---------|
| `id` | UUID | المعرف الفريد | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `product_id` | UUID | معرف المنتج | NOT NULL, REFERENCES products(id) ON DELETE CASCADE |
| `spec_type` | TEXT | نوع المواصفة | NOT NULL, CHECK IN ('color', 'size', 'material', 'dimensions', 'weight', 'brand', 'other') |
| `spec_key` | TEXT | اسم المواصفة | NOT NULL, مثل: 'اللون', 'المقاس', 'الخامة' |
| `spec_value` | TEXT | قيمة المواصفة | NOT NULL, القيمة الفعلية |
| `display_order` | INTEGER | ترتيب العرض | NOT NULL, DEFAULT 0 |
| `created_at` | TIMESTAMP | تاريخ الإنشاء | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | تاريخ التحديث | DEFAULT NOW() |

### الفهارس:

- `idx_product_specifications_product_id` على `product_id`
- `idx_product_specifications_type` على `spec_type`
- `idx_product_specifications_display_order` على `(product_id, display_order)`

---

## 🔗 العلاقات بين الجداول

```
products (1) ──→ (N) product_variants
products (1) ──→ (N) product_images
products (1) ──→ (N) product_specifications
product_variants (1) ──→ (N) product_images (عندما variant_id != NULL)
```

### العلاقات:

1. **`products` → `product_variants`**: 
   - علاقة واحد إلى كثير (One-to-Many)
   - عند حذف المنتج، يتم حذف جميع متغيراته تلقائياً (CASCADE)

2. **`products` → `product_images`**: 
   - علاقة واحد إلى كثير (One-to-Many)
   - عند حذف المنتج، يتم حذف جميع صوره تلقائياً (CASCADE)

3. **`product_variants` → `product_images`**: 
   - علاقة واحد إلى كثير (One-to-Many) - اختياري
   - عند حذف المتغير، يتم حذف صوره تلقائياً (CASCADE)
   - `variant_id = NULL` يعني أن الصورة عامة للمنتج

4. **`products` → `product_specifications`**: 
   - علاقة واحد إلى كثير (One-to-Many)
   - عند حذف المنتج، يتم حذف جميع مواصفاته تلقائياً (CASCADE)

---

## 📝 ملاحظات مهمة

### 1. صور المنتج والمتغيرات:

- **صور المنتج العامة**: `product_images` حيث `variant_id = NULL`
- **صور المتغيرات**: `product_images` حيث `variant_id = UUID`
- **نفس `image_url` يمكن استخدامه مرتين**:
  - مرة للمنتج العام (`variant_id = NULL`)
  - مرة لمتغير معين (`variant_id = UUID`)

### 2. السعر:

- **سعر المنتج**: من `products.price`
- **سعر المتغير**: من `product_variants.price`
- **إذا كان `product_variants.price = NULL`**: يستخدم سعر المنتج الأساسي

### 3. المخزون:

- **مخزون المنتج**: من `products.stock_quantity` (مخزون عام)
- **مخزون المتغير**: من `product_variants.stock_quantity` (مخزون خاص بالمتغير)

### 4. المتغير الافتراضي:

- **`is_default = true`**: المتغير الذي يظهر أولاً
- **يجب أن يكون متغير افتراضي واحد فقط** لكل منتج (يتم ضمانه بـ Trigger)

---

## 🔍 أمثلة الاستعلامات

### 1. جلب منتج مع جميع متغيراته:

```sql
SELECT 
  p.*,
  json_agg(
    json_build_object(
      'id', v.id,
      'variant_name', v.variant_name,
      'color', v.color,
      'size', v.size,
      'price', v.price,
      'stock_quantity', v.stock_quantity
    )
  ) as variants
FROM products p
LEFT JOIN product_variants v ON p.id = v.product_id
WHERE p.id = '...'
GROUP BY p.id;
```

### 2. جلب صور منتج (عامة + متغيرات):

```sql
-- صور المنتج العامة
SELECT * FROM product_images 
WHERE product_id = '...' AND variant_id IS NULL
ORDER BY display_order;

-- صور المتغيرات
SELECT * FROM product_images 
WHERE product_id = '...' AND variant_id IS NOT NULL
ORDER BY variant_id, display_order;
```

### 3. جلب متغير مع صوره:

```sql
SELECT 
  v.*,
  json_agg(
    json_build_object(
      'id', img.id,
      'image_url', img.image_url,
      'is_primary', img.is_primary
    )
  ) as images
FROM product_variants v
LEFT JOIN product_images img ON v.id = img.variant_id
WHERE v.id = '...'
GROUP BY v.id;
```

### 4. التحقق من عدم وجود `image_url` في `product_variants`:

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'product_variants' 
  AND column_name = 'image_url';
-- يجب أن يكون النتيجة: 0 rows
```

### 5. التحقق من وجود `variant_id` في `product_images`:

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'product_images' 
  AND column_name = 'variant_id';
-- يجب أن يكون النتيجة: 1 row
```

---

## ✅ الخلاصة

### الجداول المستخدمة:

1. **`products`**: المنتجات الأساسية
2. **`product_variants`**: متغيرات المنتج (ألوان، مقاسات)
3. **`product_images`**: صور المنتج والمتغيرات
4. **`product_specifications`**: مواصفات المنتج

### الأعمدة المهمة:

- **`product_variants.color`**: اللون
- **`product_variants.size`**: المقاس
- **`product_variants.size_unit`**: وحدة القياس
- **`product_variants.price`**: سعر المتغير (NULL = يستخدم سعر المنتج)
- **`product_variants.stock_quantity`**: مخزون المتغير
- **`product_images.variant_id`**: ربط الصورة بالمتغير (NULL = صورة عامة)

### المنطق:

- **لا يوجد `image_url` في `product_variants`**
- **جميع الصور في `product_images`**
- **`variant_id = NULL`** → صورة عامة للمنتج
- **`variant_id = UUID`** → صورة خاصة بمتغير معين

