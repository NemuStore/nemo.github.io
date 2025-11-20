# إزالة عمود image_url من product_variants

## ✅ ما تم إنجازه:

### 1. قاعدة البيانات:
- ✅ تم حذف عمود `image_url` من جدول `product_variants`
- ✅ جميع الصور الآن في جدول `product_images` فقط
- ✅ صور المتغيرات مرتبطة بـ `variant_id` في `product_images`

### 2. الكود:
- ✅ تم تحديث `types/index.ts` - إزالة `image_url` من `ProductVariant` interface
- ✅ تم تحديث `app/(tabs)/admin.tsx`:
  - إزالة `image_url` من `variantsToInsert` في `addProduct`
  - إزالة `image_url` من `variantsToInsert` في `updateProduct`
  - تحديث منطق حفظ صور المتغيرات لاستخدام `product_images` فقط
- ✅ تم تحديث `app/product/[id].tsx`:
  - إزالة fallback إلى `variant.image_url`
  - جميع الصور تُقرأ من `product_images` فقط

---

## 📋 البنية النهائية:

### جدول `product_images`:
```sql
- id (UUID)
- product_id (UUID) → products.id
- image_url (TEXT) → رابط من imgbb
- variant_id (UUID, NULL) → product_variants.id
  - NULL = صورة عامة للمنتج
  - UUID = صورة خاصة بالمتغير
- display_order (INTEGER)
- is_primary (BOOLEAN)
- created_at, updated_at
```

### جدول `product_variants`:
```sql
- id (UUID)
- product_id (UUID)
- variant_name (TEXT)
- color (TEXT)
- size (TEXT)
- price (NUMERIC)
- stock_quantity (INTEGER)
- sku (TEXT)
- ❌ image_url (تم حذفه)
- is_active (BOOLEAN)
- is_default (BOOLEAN)
- display_order (INTEGER)
- created_at, updated_at
```

---

## 🔄 كيفية العمل الآن:

### 1. إضافة منتج مع متغيرات:
1. المستخدم يضيف متغير مع صورة
2. الصورة تُرفع إلى imgbb
3. رابط الصورة يُحفظ مؤقتاً في state (`newVariant.image_url`)
4. عند حفظ المنتج:
   - يتم إدراج المتغير في `product_variants` (بدون `image_url`)
   - يتم إدراج الصورة في `product_images` مع `variant_id`

### 2. قراءة صور المتغيرات:
1. يتم جلب المتغيرات من `product_variants`
2. لكل متغير، يتم جلب الصور من `product_images` حيث `variant_id = variant.id`
3. الصورة الأولى تُستخدم للعرض

---

## ✅ الملفات المحدثة:

1. `supabase/remove_image_url_from_product_variants.sql` - حذف العمود
2. `types/index.ts` - إزالة `image_url` من interface
3. `app/(tabs)/admin.tsx` - تحديث منطق الحفظ
4. `app/product/[id].tsx` - تحديث منطق القراءة

---

## 📝 ملاحظات:

- `image_url` لا يزال موجوداً في state (`newVariant.image_url`) كتخزين مؤقت قبل الحفظ
- بعد الحفظ، جميع الصور في `product_images` فقط
- الكود يدعم المتغيرات القديمة التي قد تحتوي على `image_url` (لكن العمود غير موجود في DB)

---

## ✅ الخلاصة:

جميع الصور (عامة + متغيرات) الآن في جدول واحد فقط: `product_images`
- صور المنتجات العامة: `variant_id = NULL`
- صور المتغيرات: `variant_id = UUID`

