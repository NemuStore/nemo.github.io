-- ============================================
-- Migration: نقل الصور من products.image_url إلى product_images
-- ============================================
-- 
-- تعليمات التشغيل:
-- 1. افتح Supabase Dashboard
-- 2. اذهب إلى SQL Editor
-- 3. انسخ والصق هذا الكود
-- 4. اضغط Run
-- ============================================

-- Step 1: تعطيل RLS مؤقتاً للسماح بالإدراج
ALTER TABLE public.product_images DISABLE ROW LEVEL SECURITY;

-- Step 2: نقل جميع الصور من products.image_url إلى product_images
INSERT INTO public.product_images (product_id, image_url, display_order, is_primary, variant_id, created_at, updated_at)
SELECT 
  p.id AS product_id,
  p.image_url,
  0 AS display_order,
  true AS is_primary,  -- الصورة الأولى من products.image_url تكون primary
  NULL AS variant_id,  -- صور عامة للمنتج، ليست مرتبطة بمتغير
  COALESCE(p.created_at, NOW()) AS created_at,
  COALESCE(p.updated_at, NOW()) AS updated_at
FROM public.products p
WHERE p.image_url IS NOT NULL 
  AND p.image_url != ''
  AND p.image_url != 'null'
  AND NOT EXISTS (
    -- تجنب إضافة صور مكررة للمنتجات التي لديها صور بالفعل في product_images
    SELECT 1 
    FROM public.product_images pi 
    WHERE pi.product_id = p.id 
      AND pi.variant_id IS NULL
      AND pi.image_url = p.image_url
  );

-- Step 3: إعادة تفعيل RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Step 4: عرض عدد الصور المنقولة
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count
  FROM public.product_images
  WHERE variant_id IS NULL;
  
  RAISE NOTICE '✅ تم نقل % صورة من products.image_url إلى product_images', migrated_count;
END $$;

-- Step 5: جعل عمود image_url في products nullable (اختياري)
ALTER TABLE public.products 
  ALTER COLUMN image_url DROP NOT NULL;

-- Step 6: (اختياري) يمكن حذف العمود تماماً بعد التأكد من أن كل شيء يعمل
-- قم بإلغاء التعليق عن السطر التالي بعد التأكد من أن كل شيء يعمل بشكل صحيح:
-- ALTER TABLE public.products DROP COLUMN image_url;

-- ============================================
-- ملاحظات:
-- 1. بعد تشغيل هذا السكريبت، جميع الصور ستكون في جدول product_images
-- 2. عمود image_url في products أصبح nullable (يمكن أن يكون null)
-- 3. يمكنك حذف العمود image_url لاحقاً بعد التأكد من أن كل شيء يعمل
-- ============================================

