# مراجعة شاملة: جداول قاعدة البيانات والفرونت إند للمتغيرات والصور

## 📊 جداول قاعدة البيانات

### 1. جدول `product_variants` (متغيرات المنتج)

**الملف:** `supabase/create_product_variants_table.sql`

**الأعمدة:**

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

**⚠️ ملاحظة مهمة:**
- **لا يوجد عمود `image_url` في هذا الجدول** (تم حذفه)
- جميع صور المتغيرات تُحفظ في جدول `product_images` مع `variant_id`

**الفهارس:**
- `idx_product_variants_product_id` على `product_id`
- `idx_product_variants_color` على `(product_id, color)`
- `idx_product_variants_size` على `(product_id, size)`
- `idx_product_variants_is_active` على `(product_id, is_active)`
- `idx_product_variants_is_default` على `(product_id, is_default)`
- `idx_product_variants_display_order` على `(product_id, display_order)`
- `idx_product_variants_sku` على `sku`

**القيود:**
- `UNIQUE(product_id, color, size)` - لا يمكن تكرار نفس المزيج (لون + مقاس) لنفس المنتج

**Triggers:**
- `update_product_variants_updated_at` - تحديث `updated_at` تلقائياً
- `ensure_single_default_variant` - ضمان متغير افتراضي واحد فقط لكل منتج

---

### 2. جدول `product_images` (صور المنتج والمتغيرات)

**الملف:** `supabase/ensure_product_images_complete.sql`

**الأعمدة:**

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

**المنطق:**
- **`variant_id = NULL`** → صورة عامة للمنتج
- **`variant_id = UUID`** → صورة خاصة بمتغير معين (لون)

**الفهارس:**
- `idx_product_images_product_id` على `product_id`
- `idx_product_images_display_order` على `(product_id, display_order)`
- `idx_product_images_variant_id` على `variant_id`
- `idx_product_images_product_variant` على `(product_id, variant_id)`
- `idx_product_images_is_primary` على `(product_id, is_primary)`

**Triggers:**
- `update_product_images_updated_at` - تحديث `updated_at` تلقائياً
- `ensure_single_primary_image` - ضمان صورة أساسية واحدة فقط لكل منتج/متغير

**RLS Policies:**
- `Anyone can view product images` - الجميع يمكنه القراءة
- `Only admins can insert product images` - الأدمن فقط يمكنه الإدراج
- `Only admins can update product images` - الأدمن فقط يمكنه التحديث
- `Only admins can delete product images` - الأدمن فقط يمكنه الحذف

---

## 💻 الكود في الفرونت إند

### 1. TypeScript Interfaces

**الملف:** `types/index.ts`

```typescript
export interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string; // مثل: "أحمر - مقاس L"
  color: string | null; // اللون
  size: string | null; // المقاس
  size_unit: string | null; // وحدة القياس
  material: string | null; // الخامة
  price: number | null; // سعر مختلف للمتغير
  stock_quantity: number; // المخزون
  sku: string | null; // كود المنتج الفريد
  // image_url removed - all images are now in product_images table with variant_id
  is_active: boolean; // هل المتغير متاح؟
  is_default: boolean; // المتغير الافتراضي
  display_order: number; // ترتيب العرض
  created_at: string;
  updated_at: string;
}

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
```

**⚠️ ملاحظة:**
- `ProductVariant` **لا يحتوي على `image_url`** - تم حذفه من الـ interface
- الصور تُحفظ في `ProductImage` مع `variant_id`

---

### 2. State Management

**الملف:** `app/(tabs)/admin.tsx`

```typescript
// State للمتغيرات
const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
const [newVariant, setNewVariant] = useState({
  color: '',
  size: '',
  size_unit: '',
  price: '',
  stock_quantity: '',
  sku: '',
  image_url: '', // مؤقت - سيتم حفظه في product_images عند الحفظ
});

// State لاختيار صور المتغيرات
const [showVariantImageModal, setShowVariantImageModal] = useState(false);
const [availableProductImages, setAvailableProductImages] = useState<Array<{ id: string; image_url: string }>>([]);
```

**⚠️ ملاحظة:**
- `newVariant.image_url` مؤقت فقط - يُستخدم لتخزين رابط الصورة قبل الحفظ
- عند الحفظ، يتم نقل الصورة إلى `product_images` مع `variant_id`

---

### 3. إضافة متغير جديد (`addVariant`)

**الملف:** `app/(tabs)/admin.tsx` (السطر 1363)

```typescript
const addVariant = () => {
  // التحقق من وجود لون أو مقاس
  if (!newVariant.color && !newVariant.size) {
    sweetAlert.showError('خطأ', 'يرجى إدخال لون أو مقاس على الأقل');
    return;
  }

  // التحقق من وجود منتج محرر
  if (!editingProduct) {
    sweetAlert.showError('خطأ', 'يرجى اختيار منتج أولاً');
    return;
  }

  // إضافة المتغير إلى state
  setProductVariants((prevVariants) => {
    const variant: ProductVariant = {
      id: `temp-${Date.now()}-${Math.random()}`, // معرف مؤقت
      product_id: editingProduct?.id || '',
      variant_name: `${newVariant.color || ''}${newVariant.color && newVariant.size ? ' - ' : ''}${newVariant.size || ''}`.trim() || 'متغير',
      color: newVariant.color || null,
      size: newVariant.size || null,
      size_unit: newVariant.size_unit || null,
      material: null,
      price: newVariant.price ? parseFloat(newVariant.price) : null,
      stock_quantity: newVariant.stock_quantity ? parseInt(newVariant.stock_quantity) : 0,
      sku: newVariant.sku || null,
      image_url: (newVariant.image_url as any) || null, // مؤقت - سيتم حفظه في product_images
      is_active: true,
      is_default: prevVariants.length === 0, // أول متغير يكون افتراضي
      display_order: prevVariants.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return [...prevVariants, variant];
  });

  // إعادة تعيين النموذج
  setNewVariant({
    color: '',
    size: '',
    size_unit: '',
    price: '',
    stock_quantity: '',
    sku: '',
    image_url: '',
  });

  sweetAlert.showSuccess('نجح', 'تم إضافة المتغير بنجاح');
};
```

**المنطق:**
1. التحقق من وجود لون أو مقاس
2. التحقق من وجود منتج محرر
3. إنشاء كائن `ProductVariant` مع معرف مؤقت
4. إضافة المتغير إلى `productVariants` state
5. إعادة تعيين النموذج

**⚠️ ملاحظة:**
- `image_url` يُحفظ مؤقتاً في state
- عند حفظ المنتج، يتم حفظ المتغيرات في `product_variants` (بدون `image_url`)
- ثم يتم حفظ صور المتغيرات في `product_images` مع `variant_id`

---

### 4. اختيار صورة من صور المنتج الموجودة (`openVariantImageSelector`)

**الملف:** `app/(tabs)/admin.tsx` (السطر 1295)

```typescript
const openVariantImageSelector = async () => {
  if (!editingProduct) {
    sweetAlert.showError('خطأ', 'يرجى اختيار منتج أولاً');
    return;
  }

  try {
    setLoading(true);
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const accessToken = await getAccessToken();

    // تحميل صور المنتج العامة فقط (variant_id = NULL)
    const imagesResponse = await fetch(
      `${supabaseUrl}/rest/v1/product_images?product_id=eq.${editingProduct.id}&variant_id=is.null&order=display_order.asc`,
      {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (imagesResponse.ok) {
      const imagesData = await imagesResponse.json();
      setAvailableProductImages(imagesData || []);
      setShowVariantImageModal(true); // فتح المودال
    } else {
      sweetAlert.showError('خطأ', 'فشل تحميل صور المنتج');
    }
  } catch (error) {
    console.error('Error loading product images:', error);
    sweetAlert.showError('خطأ', 'فشل تحميل صور المنتج');
  } finally {
    setLoading(false);
  }
};
```

**المنطق:**
1. التحقق من وجود منتج محرر
2. جلب صور المنتج العامة فقط (`variant_id = NULL`)
3. حفظ الصور في `availableProductImages` state
4. فتح المودال لاختيار الصورة

**⚠️ ملاحظة:**
- يتم جلب الصور العامة فقط (`variant_id = NULL`)
- الصور الخاصة بالمتغيرات (`variant_id != NULL`) لا تظهر في القائمة

---

### 5. اختيار صورة من المودال (`selectVariantImageFromProduct`)

**الملف:** `app/(tabs)/admin.tsx` (السطر 1357)

```typescript
const selectVariantImageFromProduct = (imageUrl: string) => {
  setNewVariant({ ...newVariant, image_url: imageUrl });
  setShowVariantImageModal(false);
  sweetAlert.showSuccess('نجح', 'تم اختيار الصورة بنجاح');
};
```

**المنطق:**
1. حفظ رابط الصورة في `newVariant.image_url`
2. إغلاق المودال
3. عرض رسالة نجاح

**⚠️ ملاحظة:**
- الصورة تُحفظ مؤقتاً في state
- عند حفظ المنتج، يتم حفظ الصورة في `product_images` مع `variant_id`

---

### 6. رفع صورة جديدة (`pickVariantImage`)

**الملف:** `app/(tabs)/admin.tsx` (السطر 1334)

```typescript
const pickVariantImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled && result.assets.length > 0) {
    try {
      setLoading(true);
      const imageUrl = await uploadImageToImgBB(result.assets[0].uri);
      // حفظ رابط الصورة مؤقتاً في state (سيتم حفظه في product_images عند إضافة المتغير)
      setNewVariant({ ...newVariant, image_url: imageUrl });
      sweetAlert.showSuccess('نجح', 'تم رفع الصورة بنجاح');
    } catch (error) {
      console.error('Error uploading variant image:', error);
      sweetAlert.showError('خطأ', 'فشل رفع الصورة');
    } finally {
      setLoading(false);
    }
  }
};
```

**المنطق:**
1. فتح معرض الصور
2. اختيار صورة
3. رفع الصورة إلى imgbb
4. حفظ رابط الصورة في `newVariant.image_url`

**⚠️ ملاحظة:**
- الصورة تُرفع إلى imgbb فوراً
- رابط الصورة يُحفظ مؤقتاً في state
- عند حفظ المنتج، يتم حفظ الصورة في `product_images` مع `variant_id`

---

### 7. حفظ صور المتغيرات عند إضافة المنتج (`addProduct`)

**الملف:** `app/(tabs)/admin.tsx` (السطر 2240)

```typescript
// بعد حفظ المتغيرات في product_variants
if (variantsResponse.ok) {
  const variantsData = await variantsResponse.json();
  
  // جلب المتغيرات التي لديها صور من state
  const variantsWithImages = productVariants.filter(v => (v as any).image_url);
  
  // حفظ صور المتغيرات في product_images
  for (const stateVariant of variantsWithImages) {
    const variantImageUrl = (stateVariant as any).image_url;
    if (!variantImageUrl) continue;
    
    // البحث عن المتغير المطابق (باستخدام display_order أولاً، ثم color/size)
    let matchingVariant = variantsData.find((v, index) => 
      index === productVariants.indexOf(stateVariant)
    );
    
    if (!matchingVariant) {
      matchingVariant = variantsData.find(v => 
        v.color === stateVariant.color && 
        v.size === stateVariant.size
      );
    }
    
    if (!matchingVariant) continue;
    
    // حفظ الصورة في product_images مع variant_id
    await fetch(`${supabaseUrl}/rest/v1/product_images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${accessToken}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        product_id: productId,
        image_url: variantImageUrl, // من state أو من imgbb
        variant_id: matchingVariant.id, // معرف المتغير المحفوظ
        display_order: 0,
        is_primary: false,
      }),
    });
  }
}
```

**المنطق:**
1. بعد حفظ المتغيرات في `product_variants`
2. جلب المتغيرات التي لديها صور من state
3. لكل متغير مع صورة:
   - البحث عن المتغير المطابق في البيانات المحفوظة
   - حفظ الصورة في `product_images` مع `variant_id`

**⚠️ ملاحظة:**
- Matching يتم باستخدام `display_order` أولاً، ثم `color/size`
- نفس `image_url` يمكن أن يكون في `product_images` مرتين:
  - مرة مع `variant_id = NULL` (صورة عامة)
  - مرة مع `variant_id = UUID` (صورة متغير)

---

## 🎨 واجهة المستخدم

### 1. نموذج إضافة متغير

**الملف:** `app/(tabs)/admin.tsx` (السطر 4484)

```tsx
<View style={styles.addVariantForm}>
  {/* اختيار اللون */}
  <View style={styles.selectContainer}>
    <Text style={styles.selectLabel}>اللون:</Text>
    {/* عرض الألوان من الفئة */}
    <ScrollView horizontal>
      {categoryColors.map((color) => (
        <TouchableOpacity
          onPress={() => setNewVariant({ ...newVariant, color: color.color_name })}
        >
          <Text>{color.color_name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>

  {/* اختيار المقاس */}
  <View style={styles.selectContainer}>
    <Text style={styles.selectLabel}>المقاس:</Text>
    {/* عرض المقاسات من الفئة */}
    <ScrollView horizontal>
      {categorySizes.map((size) => (
        <TouchableOpacity
          onPress={() => setNewVariant({ 
            ...newVariant, 
            size: size.size_value,
            size_unit: size.size_unit || ''
          })}
        >
          <Text>{size.size_value}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>

  {/* أزرار اختيار الصورة */}
  <View style={styles.variantImageButtonsContainer}>
    <TouchableOpacity onPress={() => openVariantImageSelector()}>
      <Text>اختر من صور المنتج</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => pickVariantImage()}>
      <Text>رفع صورة جديدة</Text>
    </TouchableOpacity>
  </View>

  {/* معاينة الصورة المختارة */}
  {newVariant.image_url && (
    <Image source={{ uri: newVariant.image_url }} />
  )}

  {/* زر إضافة المتغير */}
  <TouchableOpacity onPress={addVariant}>
    <Text>إضافة متغير</Text>
  </TouchableOpacity>
</View>
```

---

### 2. مودال اختيار الصورة

**الملف:** `app/(tabs)/admin.tsx` (السطر 5936)

```tsx
{showVariantImageModal && (
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>اختر صورة من صور المنتج</Text>
        <TouchableOpacity onPress={() => setShowVariantImageModal(false)}>
          <Ionicons name="close" size={24} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.modalBody}>
        {availableProductImages.map((img) => (
          <TouchableOpacity
            onPress={() => selectVariantImageFromProduct(img.image_url)}
          >
            <Image source={{ uri: img.image_url }} />
            {newVariant.image_url === img.image_url && (
              <Ionicons name="checkmark-circle" size={32} color="#10B981" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  </View>
)}
```

---

## 📋 ملخص المنطق الكامل

### عند إضافة متغير جديد:

1. **المستخدم يملأ النموذج:**
   - يختار لون (من الفئة أو يدوياً)
   - يختار مقاس (من الفئة أو يدوياً)
   - يختار صورة (من صور المنتج الموجودة أو رفع صورة جديدة)

2. **الصورة تُحفظ مؤقتاً:**
   - إذا اختار من صور المنتج: `newVariant.image_url = imageUrl`
   - إذا رفع صورة جديدة: `newVariant.image_url = imgbbUrl`

3. **إضافة المتغير إلى state:**
   - `addVariant()` يُنشئ كائن `ProductVariant` مع `image_url` مؤقت
   - يُضاف إلى `productVariants` state

4. **عند حفظ المنتج:**
   - حفظ المتغيرات في `product_variants` (بدون `image_url`)
   - حفظ صور المتغيرات في `product_images` مع `variant_id`

---

### عند تحديث متغير:

1. **حذف المتغيرات القديمة:**
   - `DELETE FROM product_variants WHERE product_id = ?`

2. **إدراج المتغيرات الجديدة:**
   - `INSERT INTO product_variants ...`

3. **حذف صور المتغيرات القديمة:**
   - `DELETE FROM product_images WHERE product_id = ? AND variant_id = ?`

4. **إدراج صور المتغيرات الجديدة:**
   - `INSERT INTO product_images ... WITH variant_id = ?`

---

## ✅ التحقق من البنية

### SQL للتحقق:

```sql
-- 1. عرض جميع المتغيرات
SELECT * FROM product_variants WHERE product_id = '...';

-- 2. عرض صور المتغيرات
SELECT * FROM product_images WHERE variant_id IS NOT NULL;

-- 3. التحقق من عدم وجود image_url في product_variants
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'product_variants' 
  AND column_name = 'image_url';
-- يجب أن يكون النتيجة: 0 rows

-- 4. التحقق من وجود variant_id في product_images
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'product_images' 
  AND column_name = 'variant_id';
-- يجب أن يكون النتيجة: 1 row
```

---

## 🎯 الخلاصة

1. **جداول قاعدة البيانات:**
   - `product_variants`: لا يحتوي على `image_url`
   - `product_images`: يحتوي على `variant_id` لربط الصور بالمتغيرات

2. **الكود في الفرونت إند:**
   - `newVariant.image_url`: مؤقت فقط - يُستخدم قبل الحفظ
   - عند الحفظ: الصور تُحفظ في `product_images` مع `variant_id`

3. **المنطق:**
   - اختيار صورة من صور المنتج: نفس `image_url` يمكن استخدامه للمنتج والمتغير
   - رفع صورة جديدة: تُرفع إلى imgbb ثم تُحفظ في `product_images`

4. **النتيجة:**
   - جميع الصور في جدول واحد (`product_images`)
   - صور المنتج: `variant_id = NULL`
   - صور المتغيرات: `variant_id = UUID`

