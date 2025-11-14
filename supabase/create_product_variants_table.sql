-- ============================================
-- جدول متغيرات المنتج (Product Variants)
-- للتعامل مع الألوان والمقاسات المختلفة
-- ============================================

-- 1. إنشاء جدول متغيرات المنتج
CREATE TABLE IF NOT EXISTS public.product_variants (
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
  CONSTRAINT unique_product_variant UNIQUE(product_id, color, size) -- لا يمكن تكرار نفس المزيج (لون + مقاس) لنفس المنتج
);

-- 2. فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_color ON public.product_variants(product_id, color) WHERE color IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_size ON public.product_variants(product_id, size) WHERE size IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_is_active ON public.product_variants(product_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_product_variants_is_default ON public.product_variants(product_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_product_variants_display_order ON public.product_variants(product_id, display_order);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku) WHERE sku IS NOT NULL;

-- 3. Enable RLS
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- أي شخص يمكنه رؤية المتغيرات النشطة
CREATE POLICY "Anyone can view active product variants" ON public.product_variants
  FOR SELECT USING (is_active = true);

-- أي شخص يمكنه رؤية جميع المتغيرات (للإدارة)
CREATE POLICY "Anyone can view all product variants" ON public.product_variants
  FOR SELECT USING (true);

-- فقط الأدمن والمدير يمكنهم إضافة/تعديل/حذف المتغيرات
CREATE POLICY "Only admins can manage product variants" ON public.product_variants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- 5. Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_product_variants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_product_variants_updated_at();

-- 6. Function لضمان متغير افتراضي واحد فقط لكل منتج
CREATE OR REPLACE FUNCTION ensure_single_default_variant()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- إلغاء الافتراضي من المتغيرات الأخرى لنفس المنتج
    UPDATE public.product_variants
    SET is_default = false
    WHERE product_id = NEW.product_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_variant_trigger
  BEFORE INSERT OR UPDATE ON public.product_variants
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_variant();

-- 7. Function لحساب إجمالي المخزون لجميع متغيرات المنتج
CREATE OR REPLACE FUNCTION get_product_total_stock(product_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_stock INTEGER;
BEGIN
  SELECT COALESCE(SUM(stock_quantity), 0) INTO total_stock
  FROM public.product_variants
  WHERE product_id = product_uuid
    AND is_active = true;
  
  RETURN total_stock;
END;
$$ LANGUAGE plpgsql;

-- ملاحظات:
-- 1. إذا كان price = NULL، يستخدم سعر المنتج الأساسي
-- 2. يمكن أن يكون للمنتج متغيرات متعددة (ألوان × مقاسات)
-- 3. is_default = true يحدد المتغير الذي يظهر أولاً
-- 4. UNIQUE constraint يمنع تكرار نفس المزيج (لون + مقاس) لنفس المنتج
-- 5. عند حذف المنتج، يتم حذف جميع متغيراته تلقائياً (CASCADE)

