-- ============================================
-- 🔍 سكريبت تشخيص مشكلة حفظ المتغيرات
-- ============================================

-- 1. التحقق من وجود جدول product_variants
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'product_variants'
    ) THEN '✅ جدول product_variants موجود'
    ELSE '❌ جدول product_variants غير موجود!'
  END as table_check;

-- 2. عرض جميع أعمدة جدول product_variants
SELECT 
  'product_variants' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'product_variants'
ORDER BY ordinal_position;

-- 3. التحقق من وجود عمود image_url (يجب أن يكون غير موجود)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'product_variants' 
        AND column_name = 'image_url'
    ) THEN '❌ ERROR: عمود image_url لا يزال موجوداً! يجب حذفه.'
    ELSE '✅ OK: عمود image_url غير موجود (صحيح)'
  END as image_url_check;

-- 4. عرض RLS Policies على product_variants
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'product_variants'
ORDER BY policyname;

-- 5. التحقق من تفعيل RLS
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'product_variants'
      AND rowsecurity = true
    ) THEN '✅ RLS مفعل'
    ELSE '⚠️ RLS غير مفعل'
  END as rls_status;

-- 6. عرض عدد المتغيرات الموجودة
SELECT 
  COUNT(*) as total_variants,
  COUNT(DISTINCT product_id) as products_with_variants
FROM product_variants;

-- 7. عرض آخر 5 متغيرات تم إضافتها
SELECT 
  id,
  product_id,
  variant_name,
  color,
  size,
  stock_quantity,
  is_active,
  created_at
FROM product_variants
ORDER BY created_at DESC
LIMIT 5;

-- 8. التحقق من وجود جدول product_images
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'product_images'
    ) THEN '✅ جدول product_images موجود'
    ELSE '❌ جدول product_images غير موجود!'
  END as product_images_table_check;

-- 9. التحقق من وجود عمود variant_id في product_images
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'product_images' 
        AND column_name = 'variant_id'
    ) THEN '✅ OK: عمود variant_id موجود في product_images'
    ELSE '❌ ERROR: عمود variant_id غير موجود في product_images!'
  END as variant_id_check;

-- 10. عرض صور المتغيرات الموجودة
SELECT 
  pi.id,
  pi.product_id,
  pi.variant_id,
  pv.variant_name,
  pv.color,
  pv.size,
  pi.image_url,
  pi.display_order,
  pi.created_at
FROM product_images pi
LEFT JOIN product_variants pv ON pi.variant_id = pv.id
WHERE pi.variant_id IS NOT NULL
ORDER BY pi.created_at DESC
LIMIT 10;

-- 11. التحقق من Foreign Key Constraints
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'product_variants';

-- 12. اختبار إدراج متغير (يجب أن تفشل إذا كان RLS يمنع)
-- ⚠️ غير هذا UUID بمعرف منتج موجود فعلاً
/*
INSERT INTO product_variants (
  product_id, 
  variant_name, 
  color, 
  size, 
  stock_quantity
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- استبدل بمعرف منتج حقيقي
  'اختبار - أحمر - L',
  'أحمر',
  'L',
  10
) RETURNING *;
*/

-- 13. ملخص التحقق
SELECT 
  '=== ملخص التحقق ===' as summary,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'product_variants') as variant_columns_count,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'product_variants') as rls_policies_count,
  (SELECT COUNT(*) FROM product_variants) as total_variants_count,
  (SELECT COUNT(*) FROM product_images WHERE variant_id IS NOT NULL) as variant_images_count;

-- ============================================
-- 🔍 التحقق من المنتج المحدد (من السجلات)
-- ============================================

-- 14. التحقق من المتغيرات للمنتج: 2d744b03-3bc1-4a6d-a180-6ab7fceb80a5
SELECT 
  '=== متغيرات المنتج: احذيه ===' as check_title,
  pv.id,
  pv.variant_name,
  pv.color,
  pv.size,
  pv.size_unit,
  pv.stock_quantity,
  pv.is_active,
  pv.is_default,
  pv.display_order,
  pv.created_at,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM product_images 
      WHERE variant_id = pv.id
    ) THEN '✅ لديه صورة'
    ELSE '❌ لا يوجد صورة'
  END as has_image
FROM product_variants pv
WHERE pv.product_id = '2d744b03-3bc1-4a6d-a180-6ab7fceb80a5'
ORDER BY pv.display_order;

-- 15. التحقق من صور المتغيرات للمنتج
SELECT 
  '=== صور المتغيرات للمنتج ===' as check_title,
  pi.id as image_id,
  pi.product_id,
  pi.variant_id,
  pv.variant_name,
  pv.color,
  pv.size,
  pi.image_url,
  pi.display_order,
  pi.is_primary,
  pi.created_at
FROM product_images pi
LEFT JOIN product_variants pv ON pi.variant_id = pv.id
WHERE pi.product_id = '2d744b03-3bc1-4a6d-a180-6ab7fceb80a5'
ORDER BY 
  CASE WHEN pi.variant_id IS NULL THEN 0 ELSE 1 END,
  pi.variant_id,
  pi.display_order;

-- 16. التحقق من المتغير المحدد: رمادي - 39
SELECT 
  '=== التحقق من المتغير: رمادي - 39 ===' as check_title,
  pv.id,
  pv.product_id,
  pv.variant_name,
  pv.color,
  pv.size,
  pv.size_unit,
  pv.stock_quantity,
  pv.is_active,
  pv.is_default,
  pv.created_at,
  (SELECT COUNT(*) FROM product_images WHERE variant_id = pv.id) as images_count,
  (SELECT image_url FROM product_images WHERE variant_id = pv.id LIMIT 1) as variant_image_url
FROM product_variants pv
WHERE pv.product_id = '2d744b03-3bc1-4a6d-a180-6ab7fceb80a5'
  AND pv.color = 'رمادي'
  AND pv.size = '39';

-- 17. التحقق من صورة المتغير المحددة
SELECT 
  '=== التحقق من صورة المتغير: رمادي - 39 ===' as check_title,
  pi.id,
  pi.product_id,
  pi.variant_id,
  pv.variant_name,
  pv.color,
  pv.size,
  pi.image_url,
  CASE 
    WHEN pi.image_url = 'https://i.ibb.co/MyhYNVGw/b2357ee419b4.jpg' 
    THEN '✅ الصورة صحيحة'
    ELSE '⚠️ الصورة مختلفة'
  END as image_check,
  pi.display_order,
  pi.is_primary,
  pi.created_at
FROM product_images pi
JOIN product_variants pv ON pi.variant_id = pv.id
WHERE pv.product_id = '2d744b03-3bc1-4a6d-a180-6ab7fceb80a5'
  AND pv.color = 'رمادي'
  AND pv.size = '39';

-- 18. ملخص شامل للمنتج
SELECT 
  '=== ملخص شامل للمنتج ===' as summary,
  p.id as product_id,
  p.name as product_name,
  (SELECT COUNT(*) FROM product_variants WHERE product_id = p.id) as variants_count,
  (SELECT COUNT(*) FROM product_images WHERE product_id = p.id AND variant_id IS NULL) as general_images_count,
  (SELECT COUNT(*) FROM product_images WHERE product_id = p.id AND variant_id IS NOT NULL) as variant_images_count,
  (SELECT COUNT(DISTINCT variant_id) FROM product_images WHERE product_id = p.id AND variant_id IS NOT NULL) as variants_with_images_count
FROM products p
WHERE p.id = '2d744b03-3bc1-4a6d-a180-6ab7fceb80a5';

