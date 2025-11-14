-- ============================================
-- تحديث جدول product_images لربط الصور بالمتغيرات (الألوان)
-- ============================================

-- 1. التحقق من وجود الجدول أولاً، إذا لم يكن موجوداً، إنشاؤه
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

-- 2. إضافة حقل variant_id إذا لم يكن موجوداً (للجداول القديمة)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'product_images' 
    AND column_name = 'variant_id'
  ) THEN
    ALTER TABLE public.product_images 
    ADD COLUMN variant_id UUID NULL 
      REFERENCES public.product_variants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. إضافة فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON public.product_images(product_id, display_order);
CREATE INDEX IF NOT EXISTS idx_product_images_variant_id ON public.product_images(variant_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_variant ON public.product_images(product_id, variant_id);

-- 4. Enable RLS (إذا لم يكن مفعلاً)
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (إذا لم تكن موجودة)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'product_images' 
    AND policyname = 'Anyone can view product images'
  ) THEN
    CREATE POLICY "Anyone can view product images" ON public.product_images
      FOR SELECT USING (true);
  END IF;
END $$;

-- 6. تحديث Function لضمان صورة أساسية واحدة لكل منتج أو متغير
CREATE OR REPLACE FUNCTION ensure_single_primary_image()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    -- إلغاء الافتراضي من الصور الأخرى لنفس المنتج/المتغير
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

-- 7. إنشاء Trigger (إذا لم يكن موجوداً)
DROP TRIGGER IF EXISTS ensure_single_primary_image_trigger ON public.product_images;
CREATE TRIGGER ensure_single_primary_image_trigger
  BEFORE INSERT OR UPDATE ON public.product_images
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION ensure_single_primary_image();

-- ملاحظات:
-- 1. إذا كان variant_id = NULL، الصورة عامة للمنتج (تظهر لجميع المتغيرات)
-- 2. إذا كان variant_id != NULL، الصورة خاصة بهذا المتغير (تظهر فقط عند اختيار هذا اللون/المتغير)
-- 3. يمكن أن يكون للمنتج صور عامة + صور خاصة بكل متغير
-- 4. عند حذف المتغير، يتم حذف صوره تلقائياً (CASCADE)

