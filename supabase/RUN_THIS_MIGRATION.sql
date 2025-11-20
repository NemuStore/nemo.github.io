-- ============================================
-- ⚠️ Migration النهائي: نقل الصور وحذف العمود
-- ============================================
-- 
-- 📋 تعليمات التشغيل:
-- 1. افتح Supabase Dashboard: https://supabase.com/dashboard
-- 2. اختر مشروعك
-- 3. اذهب إلى SQL Editor (من القائمة الجانبية)
-- 4. انسخ هذا الكود بالكامل
-- 5. الصقه في SQL Editor
-- 6. اضغط Run (أو Ctrl+Enter)
-- 
-- ⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه!
-- ============================================

BEGIN;

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
  products_without_images INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count
  FROM public.product_images
  WHERE variant_id IS NULL;
  
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
  
  RAISE NOTICE '✅ تم نقل % صورة من products.image_url إلى product_images', migrated_count;
  
  IF products_without_images > 0 THEN
    RAISE WARNING '⚠️ يوجد % منتج لم يتم نقل صوره', products_without_images;
  END IF;
END $$;

-- Step 5: حذف عمود image_url من جدول products
-- ⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه!
ALTER TABLE public.products 
  DROP COLUMN IF EXISTS image_url;

-- Step 6: التحقق من الحذف
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

COMMIT;

-- ============================================
-- ✅ Migration مكتمل!
-- ============================================
-- 
-- 📝 ما تم إنجازه:
-- 1. ✅ نقل جميع الصور من products.image_url إلى product_images
-- 2. ✅ حذف عمود image_url من products
-- 
-- 📋 الخطوات التالية:
-- 1. تحقق من أن جميع المنتجات لديها صور في product_images
-- 2. جرب إضافة منتج جديد للتأكد من أن كل شيء يعمل
-- 3. جميع الصور الجديدة ستستخدم imgbb links فقط
-- 
-- ============================================

