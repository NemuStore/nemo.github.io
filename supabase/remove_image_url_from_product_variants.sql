-- ============================================
-- حذف عمود image_url من جدول product_variants
-- ============================================
-- ⚠️ تحذير: تأكد من نقل جميع البيانات إلى product_images أولاً
-- استخدم migrate_variant_images_to_product_images.sql قبل هذا الملف

-- 1. التحقق من وجود صور متبقية في product_variants.image_url
SELECT 
  COUNT(*) as remaining_images,
  '⚠️ If this count > 0, migrate data first!' as warning
FROM public.product_variants
WHERE image_url IS NOT NULL AND image_url != '';

-- 2. حذف عمود image_url من product_variants
-- (فقط إذا لم تكن هناك صور متبقية)
DO $$ 
BEGIN
  -- التحقق أولاً
  IF EXISTS (
    SELECT 1 
    FROM public.product_variants 
    WHERE image_url IS NOT NULL AND image_url != ''
  ) THEN
    RAISE EXCEPTION 'Cannot remove image_url column: There are still images in product_variants.image_url. Please migrate them first using migrate_variant_images_to_product_images.sql';
  END IF;
  
  -- حذف العمود
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'product_variants' 
    AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.product_variants DROP COLUMN image_url;
    RAISE NOTICE '✅ Successfully removed image_url column from product_variants';
  ELSE
    RAISE NOTICE 'ℹ️ image_url column does not exist in product_variants';
  END IF;
END $$;

-- 3. التحقق من النتيجة
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'product_variants'
ORDER BY ordinal_position;

-- ============================================
-- ملاحظات:
-- 1. بعد حذف العمود، جميع الصور ستكون في product_images فقط
-- 2. الكود يجب أن يتوقف عن استخدام variant.image_url
-- 3. يجب استخدام product_images مع variant_id بدلاً من ذلك
-- ============================================

