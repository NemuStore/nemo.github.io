-- ============================================
-- تحسينات جدول المنتجات لصفحة منتج أفضل
-- مستوحاة من Temu
-- ============================================

-- 1. إضافة حقول معلومات الشحن والتوصيل
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10, 2) NULL,
ADD COLUMN IF NOT EXISTS estimated_delivery_days INTEGER NULL,
ADD COLUMN IF NOT EXISTS free_shipping_threshold NUMERIC(10, 2) NULL,
ADD COLUMN IF NOT EXISTS return_policy_days INTEGER NULL,
ADD COLUMN IF NOT EXISTS warranty_period TEXT NULL;

-- 2. إضافة حقل مصدر المنتج (مخزن داخلي أو طلب من الخارج)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'warehouse' 
  CHECK (source_type IN ('warehouse', 'external'));

-- 3. إضافة حقول معلومات المنتج الإضافية
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5, 2) NULL,
ADD COLUMN IF NOT EXISTS dimensions TEXT NULL,
ADD COLUMN IF NOT EXISTS brand TEXT NULL,
ADD COLUMN IF NOT EXISTS sku TEXT UNIQUE, -- كود فريد لا يتكرر
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 4. إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_products_source_type ON public.products(source_type);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON public.products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_is_new ON public.products(is_new) WHERE is_new = true;
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_tags ON public.products USING GIN(tags) WHERE tags IS NOT NULL;

-- 4. إنشاء جدول مواصفات المنتج
CREATE TABLE IF NOT EXISTS public.product_specifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  spec_type TEXT NOT NULL CHECK (spec_type IN ('color', 'size', 'material', 'dimensions', 'weight', 'brand', 'other')),
  spec_key TEXT NOT NULL, -- مثل: 'اللون', 'المقاس', 'الخامة'
  spec_value TEXT NOT NULL, -- القيمة الفعلية
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهارس لجدول المواصفات
CREATE INDEX IF NOT EXISTS idx_product_specifications_product_id ON public.product_specifications(product_id);
CREATE INDEX IF NOT EXISTS idx_product_specifications_type ON public.product_specifications(spec_type);
CREATE INDEX IF NOT EXISTS idx_product_specifications_display_order ON public.product_specifications(product_id, display_order);

-- 5. إنشاء جدول تقييمات المنتجات
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  images TEXT[] DEFAULT '{}', -- صور من العميل
  is_verified_purchase BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, user_id) -- عميل واحد = تقييم واحد لكل منتج
);

-- فهارس لجدول التقييمات
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON public.product_reviews(product_id, rating);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON public.product_reviews(product_id, created_at DESC);

-- 6. Enable RLS على الجداول الجديدة
ALTER TABLE public.product_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies لجدول المواصفات
-- أي شخص يمكنه رؤية المواصفات
CREATE POLICY "Anyone can view product specifications" ON public.product_specifications
  FOR SELECT USING (true);

-- فقط الأدمن والمدير يمكنهم إضافة/تعديل/حذف المواصفات
CREATE POLICY "Only admins can manage specifications" ON public.product_specifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- 8. RLS Policies لجدول التقييمات
-- أي شخص يمكنه رؤية التقييمات
CREATE POLICY "Anyone can view product reviews" ON public.product_reviews
  FOR SELECT USING (true);

-- أي مستخدم مسجل يمكنه إضافة تقييم
CREATE POLICY "Authenticated users can add reviews" ON public.product_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- المستخدم يمكنه تعديل تقييمه فقط
CREATE POLICY "Users can update their own reviews" ON public.product_reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- المستخدم يمكنه حذف تقييمه فقط
CREATE POLICY "Users can delete their own reviews" ON public.product_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- الأدمن والمدير يمكنهم حذف أي تقييم
CREATE POLICY "Admins can delete any review" ON public.product_reviews
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- 9. Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_product_specifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_specifications_updated_at
  BEFORE UPDATE ON public.product_specifications
  FOR EACH ROW
  EXECUTE FUNCTION update_product_specifications_updated_at();

CREATE OR REPLACE FUNCTION update_product_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_reviews_updated_at
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_product_reviews_updated_at();

-- 10. Function لحساب متوسط التقييمات
CREATE OR REPLACE FUNCTION get_product_rating_avg(product_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  avg_rating NUMERIC;
BEGIN
  SELECT COALESCE(AVG(rating), 0) INTO avg_rating
  FROM public.product_reviews
  WHERE product_id = product_uuid;
  
  RETURN ROUND(avg_rating, 1);
END;
$$ LANGUAGE plpgsql;

-- 11. Function لحساب عدد التقييمات
CREATE OR REPLACE FUNCTION get_product_reviews_count(product_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  reviews_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO reviews_count
  FROM public.product_reviews
  WHERE product_id = product_uuid;
  
  RETURN reviews_count;
END;
$$ LANGUAGE plpgsql;

-- 12. تحديث جدول الفئات (اختياري - للمستقبل)
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS banner_image TEXT NULL,
ADD COLUMN IF NOT EXISTS color_hex TEXT NULL,
ADD COLUMN IF NOT EXISTS default_filters JSONB NULL;

-- 13. تحديث جدول الطلبات لدعم فصل الطلبات حسب المصدر
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS source_type TEXT NULL 
  CHECK (source_type IN ('warehouse', 'external')),
ADD COLUMN IF NOT EXISTS parent_order_id UUID NULL 
  REFERENCES public.orders(id) ON DELETE SET NULL;

-- فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_orders_source_type ON public.orders(source_type);
CREATE INDEX IF NOT EXISTS idx_orders_parent_order_id ON public.orders(parent_order_id);

-- ملاحظات:
-- 1. جميع الحقول الجديدة في products هي NULL (اختيارية) لتجنب كسر البيانات الموجودة
-- 2. يمكن إضافة product_variants لاحقاً إذا لزم الأمر
-- 3. التقييمات محدودة بتقييم واحد لكل مستخدم لكل منتج (UNIQUE constraint)
-- 4. source_type في products: 'warehouse' = من المخزن، 'external' = طلب من الخارج
-- 5. SKU فريد ولا يظهر للعملاء (للإدارة فقط)
-- 6. عند إنشاء طلب، يتم فصل المنتجات حسب source_type إلى طلبين منفصلين

