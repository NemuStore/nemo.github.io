# مراجعة شاملة: جدول product_images

## 📋 ملخص المراجعة

تمت مراجعة جدول `product_images` للتأكد من أنه جاهز لاستقبال:
1. ✅ صور المنتجات العامة (variant_id = NULL)
2. ✅ صور ألوان المتغيرات (variant_id = UUID)

---

## ✅ بنية جدول `product_images`

### الحقول:
- `id` (UUID, PRIMARY KEY) - معرف فريد للصورة
- `product_id` (UUID, NOT NULL, FK → products.id) - معرف المنتج
- `image_url` (TEXT, NOT NULL) - رابط الصورة من imgbb
- `display_order` (INTEGER, NOT NULL, DEFAULT 0) - ترتيب عرض الصورة
- `is_primary` (BOOLEAN, DEFAULT false) - هل الصورة أساسية؟
- `variant_id` (UUID, NULL, FK → product_variants.id) - معرف المتغير (NULL = صورة عامة)
- `created_at` (TIMESTAMP) - تاريخ الإنشاء
- `updated_at` (TIMESTAMP) - تاريخ التحديث

### الفهارس:
- `idx_product_images_product_id` - للبحث السريع حسب المنتج
- `idx_product_images_display_order` - لترتيب الصور
- `idx_product_images_variant_id` - للبحث السريع حسب المتغير
- `idx_product_images_product_variant` - للبحث السريع حسب المنتج والمتغير
- `idx_product_images_is_primary` - للبحث السريع عن الصور الأساسية

---

## 🔐 RLS Policies

### السياسات:
1. **SELECT**: أي شخص يمكنه رؤية صور المنتجات
2. **INSERT**: فقط admin/manager يمكنهم إضافة الصور
3. **UPDATE**: فقط admin/manager يمكنهم تحديث الصور
4. **DELETE**: فقط admin/manager يمكنهم حذف الصور

### الدالة المساعدة:
- `is_admin_or_manager(user_id UUID)` - للتحقق من الصلاحيات (SECURITY DEFINER)

---

## 🎯 كيفية استخدام الجدول

### 1. صور المنتجات العامة:
```sql
INSERT INTO product_images (product_id, image_url, display_order, is_primary, variant_id)
VALUES ('product-uuid', 'https://imgbb.com/...', 0, true, NULL);
```

### 2. صور المتغيرات (الألوان):
```sql
INSERT INTO product_images (product_id, image_url, display_order, is_primary, variant_id)
VALUES ('product-uuid', 'https://imgbb.com/...', 0, false, 'variant-uuid');
```

---

## 📊 بنية البيانات

```
products
  └── product_images (variant_id = NULL) ← صور عامة للمنتج
  └── product_variants
        └── product_images (variant_id = UUID) ← صور خاصة بالمتغير
```

### مثال عملي:
```
Product: "قميص قطني"
├── General Images (variant_id = NULL):
│   ├── image1.jpg (is_primary = true, display_order = 0)
│   ├── image2.jpg (is_primary = false, display_order = 1)
│   └── image3.jpg (is_primary = false, display_order = 2)
└── Variants:
    ├── Variant 1: "أحمر - L" (variant_id = uuid-1)
    │   └── variant_image1.jpg (variant_id = uuid-1, is_primary = false)
    └── Variant 2: "أزرق - M" (variant_id = uuid-2)
        └── variant_image2.jpg (variant_id = uuid-2, is_primary = false)
```

---

## ✅ Triggers

### 1. `update_product_images_updated_at`:
- يحدث `updated_at` تلقائياً عند تحديث الصورة

### 2. `ensure_single_primary_image_trigger`:
- يضمن وجود صورة أساسية واحدة فقط لكل منتج/متغير
- إذا تم تعيين `is_primary = true` لصورة جديدة، يتم إلغاء `is_primary` من الصور الأخرى لنفس المنتج/المتغير

---

## 🔍 كيفية التحقق من البيانات

### 1. عرض جميع الصور:
```sql
SELECT * FROM product_images WHERE product_id = 'product-uuid';
```

### 2. عرض الصور العامة فقط:
```sql
SELECT * FROM product_images 
WHERE product_id = 'product-uuid' 
  AND variant_id IS NULL
ORDER BY display_order;
```

### 3. عرض صور متغير معين:
```sql
SELECT * FROM product_images 
WHERE product_id = 'product-uuid' 
  AND variant_id = 'variant-uuid'
ORDER BY display_order;
```

### 4. عرض الصورة الأساسية:
```sql
SELECT * FROM product_images 
WHERE product_id = 'product-uuid' 
  AND is_primary = true
  AND variant_id IS NULL
LIMIT 1;
```

### 5. عرض صور الألوان (لون معين):
```sql
SELECT pi.* 
FROM product_images pi
JOIN product_variants pv ON pi.variant_id = pv.id
WHERE pi.product_id = 'product-uuid'
  AND pv.color = 'أحمر'
ORDER BY pi.display_order;
```

---

## 🚀 خطوات التطبيق

### 1. تشغيل ملف SQL:
```bash
# في Supabase Dashboard → SQL Editor
# أو استخدام Supabase CLI:
supabase db execute -f supabase/ensure_product_images_complete.sql
```

### 2. التحقق من النتيجة:
- يجب أن ترى:
  - ✅ جدول `product_images` موجود
  - ✅ جميع الأعمدة موجودة (بما في ذلك `variant_id`)
  - ✅ جميع الفهارس موجودة
  - ✅ RLS policies موجودة ومفعّلة
  - ✅ Triggers موجودة

---

## 📝 ملاحظات مهمة

1. **صور المنتجات العامة**:
   - `variant_id = NULL`
   - تظهر لجميع المتغيرات
   - يمكن أن يكون هناك صورة أساسية واحدة فقط

2. **صور المتغيرات**:
   - `variant_id = UUID` (معرف المتغير)
   - تظهر فقط عند اختيار هذا المتغير
   - يمكن أن يكون لكل متغير صور متعددة

3. **CASCADE DELETE**:
   - عند حذف المنتج → تُحذف جميع صوره تلقائياً
   - عند حذف المتغير → تُحذف صوره تلقائياً

4. **الصورة الأساسية**:
   - صورة واحدة فقط لكل منتج/متغير
   - يتم التحكم بذلك عبر trigger

---

## ✅ الخلاصة

جدول `product_images` جاهز بالكامل لاستقبال:
- ✅ صور المنتجات العامة
- ✅ صور ألوان المتغيرات
- ✅ RLS policies محسّنة
- ✅ Triggers للتحكم في البيانات
- ✅ فهارس للبحث السريع

**الخطوة التالية**: تشغيل ملف `supabase/ensure_product_images_complete.sql` للتأكد من أن كل شيء محدث.

