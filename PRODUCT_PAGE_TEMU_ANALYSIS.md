# تحليل صفحة المنتج من Temu - الجداول المطلوبة

## 📋 ملخص التحليل

بناءً على تحليل صفحة المنتج من Temu، إليك الجداول التي نحتاجها في قاعدة البيانات:

---

## ✅ الجداول الموجودة بالفعل

### 1. `products` (جدول المنتجات الأساسي)
- ✅ موجود مع جميع الحقول الأساسية
- ✅ تم إضافة: `shipping_cost`, `estimated_delivery_days`, `free_shipping_threshold`, `return_policy_days`, `warranty_period`
- ✅ تم إضافة: `weight_kg`, `dimensions`, `brand`, `sku`, `is_featured`, `is_new`, `tags`
- ✅ تم إضافة: `source_type` (warehouse/external)

### 2. `product_images` (صور المنتج)
- ✅ موجود - يدعم صور متعددة لكل منتج
- ✅ يحتوي على: `display_order`, `is_primary`

### 3. `product_specifications` (مواصفات المنتج)
- ✅ موجود - يدعم الألوان، المقاسات، الخامة، إلخ

### 4. `product_reviews` (تقييمات ومراجعات)
- ✅ موجود - يدعم التقييمات، الصور، التعليقات

---

## ❌ الجداول المطلوبة (غير موجودة)

### 1. `product_variants` (متغيرات المنتج) ⭐ **مهم جداً**

**الوصف:** عندما يكون للمنتج ألوان ومقاسات مختلفة، كل مزيج (لون + مقاس) يعتبر متغير منفصل له سعر ومخزون خاص.

**الحقول:**
```sql
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- المتغيرات
  variant_name TEXT NOT NULL, -- مثل: "أحمر - مقاس L" أو "أسود - مقاس XL"
  color TEXT NULL, -- اللون (أحمر، أسود، أزرق)
  size TEXT NULL, -- المقاس (S, M, L, XL, XXL)
  material TEXT NULL, -- الخامة (اختياري)
  
  -- معلومات المتغير
  price NUMERIC(10, 2) NULL, -- سعر مختلف للمتغير (NULL = يستخدم سعر المنتج الأساسي)
  stock_quantity INTEGER NOT NULL DEFAULT 0, -- المخزون الخاص بهذا المتغير
  sku TEXT NULL, -- كود المنتج الفريد لهذا المتغير
  image_url TEXT NULL, -- صورة خاصة بهذا المتغير (مثل صورة المنتج باللون الأحمر)
  
  -- حالة المتغير
  is_active BOOLEAN DEFAULT true, -- هل المتغير متاح للبيع؟
  is_default BOOLEAN DEFAULT false, -- المتغير الافتراضي (يظهر أولاً)
  
  display_order INTEGER NOT NULL DEFAULT 0, -- ترتيب العرض
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- قيود
  UNIQUE(product_id, color, size) -- لا يمكن تكرار نفس المزيج (لون + مقاس) لنفس المنتج
);
```

**الاستخدام:**
- منتج "قميص" له ألوان: أحمر، أسود، أزرق
- كل لون له مقاسات: S, M, L, XL
- كل مزيج (أحمر + L) له مخزون وسعر منفصل

**مثال:**
```
منتج: "قميص كاجوال"
- متغير 1: أحمر - L (مخزون: 10، سعر: 150 جنيه)
- متغير 2: أحمر - XL (مخزون: 5، سعر: 160 جنيه)
- متغير 3: أسود - L (مخزون: 8، سعر: 150 جنيه)
- متغير 4: أسود - XL (مخزون: 3، سعر: 160 جنيه)
```

---

### 2. `product_faqs` (الأسئلة الشائعة) ⭐ **مهم**

**الوصف:** أسئلة شائعة وإجاباتها لكل منتج.

**الحقول:**
```sql
CREATE TABLE public.product_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  question TEXT NOT NULL, -- السؤال
  answer TEXT NOT NULL, -- الإجابة
  
  display_order INTEGER NOT NULL DEFAULT 0, -- ترتيب العرض
  is_active BOOLEAN DEFAULT true, -- هل السؤال نشط؟
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**الاستخدام:**
- "هل يمكن غسله في الغسالة؟"
- "ما هي المقاسات المتاحة؟"
- "هل المنتج أصلي؟"

---

### 3. `product_related` (المنتجات المشابهة) ⭐ **مهم**

**الوصف:** ربط المنتجات ببعضها البعض (منتجات مشابهة، منتجات مكملة).

**الحقول:**
```sql
CREATE TABLE public.product_related (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  related_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  relation_type TEXT NOT NULL DEFAULT 'similar' 
    CHECK (relation_type IN ('similar', 'complementary', 'upsell', 'cross_sell')),
  -- similar: منتجات مشابهة
  -- complementary: منتجات مكملة (مثل: قميص + بنطلون)
  -- upsell: منتجات أعلى سعر
  -- cross_sell: منتجات مرتبطة
  
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- قيود
  UNIQUE(product_id, related_product_id), -- لا يمكن ربط نفس المنتج مرتين
  CHECK (product_id != related_product_id) -- لا يمكن ربط المنتج بنفسه
);
```

**الاستخدام:**
- عرض "منتجات مشابهة" في أسفل صفحة المنتج
- عرض "منتجات قد تعجبك أيضاً"
- عرض "منتجات مكملة" (مثل: قميص + بنطلون)

---

### 4. `product_wishlist` (قائمة الأمنيات) ⭐ **مفيد**

**الوصف:** حفظ المنتجات المفضلة للمستخدمين.

**الحقول:**
```sql
CREATE TABLE public.product_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- قيود
  UNIQUE(user_id, product_id) -- لا يمكن إضافة نفس المنتج مرتين
);
```

**الاستخدام:**
- زر "إضافة للمفضلة" في صفحة المنتج
- صفحة "قائمة الأمنيات" للمستخدم

---

### 5. `product_view_history` (سجل المشاهدات) ⭐ **اختياري**

**الوصف:** تتبع المنتجات التي شاهدها المستخدم (للتوصيات).

**الحقول:**
```sql
CREATE TABLE public.product_view_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- فهرس للبحث السريع
  INDEX idx_product_view_history_user_id (user_id),
  INDEX idx_product_view_history_product_id (product_id),
  INDEX idx_product_view_history_viewed_at (viewed_at DESC)
);
```

**الاستخدام:**
- "منتجات شاهدتها مؤخراً"
- تحسين التوصيات
- إحصائيات المشاهدات

---

### 6. `product_comparison` (مقارنة المنتجات) ⭐ **اختياري**

**الوصف:** حفظ قوائم مقارنة المنتجات للمستخدمين.

**الحقول:**
```sql
CREATE TABLE public.product_comparison (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- قيود
  UNIQUE(user_id, product_id), -- لا يمكن إضافة نفس المنتج مرتين
  -- يمكن إضافة حد أقصى (مثل: 4 منتجات) في التطبيق
);
```

**الاستخدام:**
- صفحة "مقارنة المنتجات"
- مقارنة المواصفات والأسعار

---

## 📊 ملخص الجداول المطلوبة

| الجدول | الأهمية | الوصف |
|--------|---------|-------|
| `product_variants` | ⭐⭐⭐ **عالي جداً** | متغيرات المنتج (ألوان، مقاسات) |
| `product_faqs` | ⭐⭐ **متوسط** | الأسئلة الشائعة |
| `product_related` | ⭐⭐ **متوسط** | المنتجات المشابهة |
| `product_wishlist` | ⭐⭐ **متوسط** | قائمة الأمنيات |
| `product_view_history` | ⭐ **منخفض** | سجل المشاهدات (اختياري) |
| `product_comparison` | ⭐ **منخفض** | مقارنة المنتجات (اختياري) |

---

## 🎯 الأولويات

### المرحلة الأولى (ضروري):
1. ✅ `product_variants` - **أهم جدول** - بدونها لا يمكن عرض الألوان والمقاسات بشكل صحيح

### المرحلة الثانية (مهم):
2. ✅ `product_faqs` - لتحسين تجربة المستخدم
3. ✅ `product_related` - لعرض منتجات مشابهة

### المرحلة الثالثة (اختياري):
4. ✅ `product_wishlist` - ميزة إضافية
5. ✅ `product_view_history` - للتوصيات
6. ✅ `product_comparison` - ميزة متقدمة

---

## 📝 ملاحظات مهمة

1. **`product_variants` هو الأهم** - بدونها لا يمكن تنفيذ صفحة منتج كاملة مثل Temu
2. يمكن البدء بـ `product_variants` و `product_faqs` فقط
3. باقي الجداول يمكن إضافتها لاحقاً حسب الحاجة
4. جميع الجداول تحتاج RLS Policies (Row Level Security)
5. جميع الجداول تحتاج فهارس (Indexes) للبحث السريع

---

## 🔗 العلاقات بين الجداول

```
products (1) ──→ (N) product_variants
products (1) ──→ (N) product_images
products (1) ──→ (N) product_specifications
products (1) ──→ (N) product_reviews
products (1) ──→ (N) product_faqs
products (1) ──→ (N) product_related (related_product_id)
products (1) ──→ (N) product_wishlist
products (1) ──→ (N) product_view_history
products (1) ──→ (N) product_comparison
```

---

## ✅ الخطوات التالية

1. إنشاء ملف SQL لجدول `product_variants`
2. إنشاء ملف SQL لجدول `product_faqs`
3. إنشاء ملف SQL لجدول `product_related`
4. تحديث ملف `types/index.ts` لإضافة الـ interfaces الجديدة
5. تحديث صفحة المنتج لعرض المتغيرات والـ FAQs

