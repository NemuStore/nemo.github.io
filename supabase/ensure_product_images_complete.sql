-- ============================================
-- مراجعة وإصلاح شامل لجدول product_images
-- ============================================
-- هذا الملف يضمن أن جدول product_images جاهز لاستقبال:
-- 1. صور المنتجات العامة (variant_id = NULL)
-- 2. صور ألوان المتغيرات (variant_id = UUID)

-- 1. إنشاء الجدول إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  variant_id UUID NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. التأكد من وجود جميع الأعمدة
DO $$ 
BEGIN
  -- التأكد من وجود variant_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'product_images' 
    AND column_name = 'variant_id'
  ) THEN
    ALTER TABLE public.product_images 
    ADD COLUMN variant_id UUID NULL 
      REFERENCES public.product_variants(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added variant_id column to product_images';
  END IF;
END $$;

-- 3. إنشاء/تحديث الفهارس
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON public.product_images(product_id, display_order);
CREATE INDEX IF NOT EXISTS idx_product_images_variant_id ON public.product_images(variant_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_variant ON public.product_images(product_id, variant_id);
CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON public.product_images(product_id, is_primary) WHERE is_primary = true;

-- 4. تفعيل RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- 5. التأكد من وجود دالة is_admin_or_manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- This function runs with SECURITY DEFINER, so it bypasses RLS
  SELECT role INTO user_role
  FROM public.users
  WHERE id = user_id;
  
  RETURN user_role IN ('admin', 'manager');
END;
$$;

-- 6. حذف السياسات القديمة (إذا كانت موجودة)
DROP POLICY IF EXISTS "Anyone can view product images" ON public.product_images;
DROP POLICY IF EXISTS "Only admins can insert product images" ON public.product_images;
DROP POLICY IF EXISTS "Only admins can update product images" ON public.product_images;
DROP POLICY IF EXISTS "Only admins can delete product images" ON public.product_images;

-- 7. إنشاء RLS Policies جديدة
-- أي شخص يمكنه رؤية صور المنتجات
CREATE POLICY "Anyone can view product images" ON public.product_images
  FOR SELECT USING (true);

-- فقط الأدمن والمدير يمكنهم إضافة صور المنتجات
CREATE POLICY "Only admins can insert product images" ON public.product_images
  FOR INSERT 
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- فقط الأدمن والمدير يمكنهم تحديث صور المنتجات
CREATE POLICY "Only admins can update product images" ON public.product_images
  FOR UPDATE 
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- فقط الأدمن والمدير يمكنهم حذف صور المنتجات
CREATE POLICY "Only admins can delete product images" ON public.product_images
  FOR DELETE 
  USING (public.is_admin_or_manager(auth.uid()));

-- 8. التأكد من وجود دالة update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. إنشاء/تحديث Trigger لتحديث updated_at
DROP TRIGGER IF EXISTS update_product_images_updated_at ON public.product_images;
CREATE TRIGGER update_product_images_updated_at 
  BEFORE UPDATE ON public.product_images
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 10. إنشاء/تحديث Function لضمان صورة أساسية واحدة لكل منتج/متغير
CREATE OR REPLACE FUNCTION ensure_single_primary_image()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    -- إلغاء الافتراضي من الصور الأخرى لنفس المنتج/المتغير
    -- إذا كان variant_id = NULL، الصورة عامة للمنتج
    -- إذا كان variant_id != NULL، الصورة خاصة بهذا المتغير
    UPDATE public.product_images
    SET is_primary = false
    WHERE product_id = NEW.product_id
      AND (variant_id = NEW.variant_id OR (variant_id IS NULL AND NEW.variant_id IS NULL))
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. إنشاء/تحديث Trigger لضمان صورة أساسية واحدة
DROP TRIGGER IF EXISTS ensure_single_primary_image_trigger ON public.product_images;
CREATE TRIGGER ensure_single_primary_image_trigger
  BEFORE INSERT OR UPDATE ON public.product_images
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION ensure_single_primary_image();

-- 12. التحقق من البنية النهائية
SELECT 
  'product_images' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'product_images'
ORDER BY ordinal_position;

-- 13. التحقق من الفهارس
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'product_images'
ORDER BY indexname;

-- 14. التحقق من RLS Policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'product_images'
ORDER BY policyname;

-- 15. إحصائيات الصور
SELECT 
  COUNT(*) as total_images,
  COUNT(CASE WHEN variant_id IS NULL THEN 1 END) as general_images,
  COUNT(CASE WHEN variant_id IS NOT NULL THEN 1 END) as variant_images,
  COUNT(CASE WHEN is_primary = true AND variant_id IS NULL THEN 1 END) as primary_general_images,
  COUNT(CASE WHEN is_primary = true AND variant_id IS NOT NULL THEN 1 END) as primary_variant_images
FROM public.product_images;

-- ============================================
-- ملاحظات:
-- 1. جدول product_images يدعم:
--    - صور عامة للمنتج (variant_id = NULL)
--    - صور خاصة بالمتغيرات (variant_id = UUID)
-- 2. يمكن أن يكون للمنتج:
--    - صور عامة متعددة (variant_id = NULL)
--    - صور خاصة بكل متغير (variant_id = UUID)
-- 3. صورة أساسية واحدة فقط لكل منتج/متغير
-- 4. عند حذف المنتج أو المتغير، تُحذف صوره تلقائياً (CASCADE)
-- 5. RLS policies تسمح للجميع بالقراءة، والأدمن فقط بالكتابة
-- ============================================

