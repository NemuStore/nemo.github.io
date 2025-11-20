-- ============================================
-- Migration: إزالة عمود image_url من جدول products
-- ============================================
-- 
-- تعليمات التشغيل:
-- 1. تأكد من أن جميع الصور تم نقلها إلى product_images
-- 2. افتح Supabase Dashboard → SQL Editor
-- 3. انسخ والصق هذا الكود
-- 4. اضغط Run
-- ============================================

-- Step 1: التحقق من أن جميع المنتجات لديها صور في product_images
DO $$
DECLARE
  products_without_images INTEGER;
BEGIN
  SELECT COUNT(*) INTO products_without_images
  FROM public.products p
  WHERE p.image_url IS NOT NULL 
    AND p.image_url != ''
    AND NOT EXISTS (
      SELECT 1 
      FROM public.product_images pi 
      WHERE pi.product_id = p.id 
        AND pi.variant_id IS NULL
    );
  
  IF products_without_images > 0 THEN
    RAISE WARNING '⚠️ يوجد % منتج بدون صور في product_images. يرجى تشغيل migration نقل الصور أولاً.', products_without_images;
  ELSE
    RAISE NOTICE '✅ جميع المنتجات لديها صور في product_images';
  END IF;
END $$;

-- Step 2: حذف عمود image_url من جدول products
-- تحذير: هذا الإجراء لا يمكن التراجع عنه!
ALTER TABLE public.products 
  DROP COLUMN IF EXISTS image_url;

-- Step 3: التحقق من الحذف
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'products' 
      AND column_name = 'image_url'
  ) THEN
    RAISE WARNING '⚠️ فشل حذف عمود image_url';
  ELSE
    RAISE NOTICE '✅ تم حذف عمود image_url من جدول products بنجاح';
  END IF;
END $$;

-- ============================================
-- ملاحظات:
-- 1. بعد تشغيل هذا السكريبت، لن يكون هناك عمود image_url في products
-- 2. جميع الصور يجب أن تكون في جدول product_images
-- 3. تأكد من أن الكود لا يستخدم products.image_url بعد الآن
-- ============================================

