-- ============================================
-- التحقق من بنية جداول المتغيرات والصور
-- ============================================

-- 1. التحقق من أعمدة جدول product_variants
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

-- 2. التحقق من عدم وجود image_url في product_variants
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'product_variants' 
        AND column_name = 'image_url'
    ) THEN '❌ ERROR: image_url column still exists in product_variants!'
    ELSE '✅ OK: image_url column does not exist in product_variants'
  END as check_result;

-- 3. التحقق من أعمدة جدول product_images
SELECT 
  'product_images' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'product_images'
ORDER BY ordinal_position;

-- 4. التحقق من وجود variant_id في product_images
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'product_images' 
        AND column_name = 'variant_id'
    ) THEN '✅ OK: variant_id column exists in product_images'
    ELSE '❌ ERROR: variant_id column does not exist in product_images!'
  END as check_result;

-- 5. عرض العلاقات (Foreign Keys)
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (tc.table_name = 'product_variants' OR tc.table_name = 'product_images')
ORDER BY tc.table_name, kcu.column_name;

-- 6. عرض الفهارس
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND (tablename = 'product_variants' OR tablename = 'product_images')
ORDER BY tablename, indexname;

-- 7. عرض القيود (Constraints)
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND (tc.table_name = 'product_variants' OR tc.table_name = 'product_images')
ORDER BY tc.table_name, tc.constraint_type;

-- 8. إحصائيات المتغيرات والصور
SELECT 
  'إجمالي المتغيرات' as metric,
  COUNT(*)::text as value
FROM public.product_variants
UNION ALL
SELECT 
  'المتغيرات النشطة' as metric,
  COUNT(*)::text
FROM public.product_variants
WHERE is_active = true
UNION ALL
SELECT 
  'إجمالي صور المنتجات' as metric,
  COUNT(*)::text
FROM public.product_images
UNION ALL
SELECT 
  'صور المنتجات العامة (variant_id = NULL)' as metric,
  COUNT(*)::text
FROM public.product_images
WHERE variant_id IS NULL
UNION ALL
SELECT 
  'صور المتغيرات (variant_id != NULL)' as metric,
  COUNT(*)::text
FROM public.product_images
WHERE variant_id IS NOT NULL
UNION ALL
SELECT 
  'المتغيرات مع صور' as metric,
  COUNT(DISTINCT variant_id)::text
FROM public.product_images
WHERE variant_id IS NOT NULL
UNION ALL
SELECT 
  'المتغيرات بدون صور' as metric,
  COUNT(*)::text
FROM public.product_variants pv
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_images pi 
  WHERE pi.variant_id = pv.id
);

-- 9. عرض أمثلة على المتغيرات مع صورها
SELECT 
  pv.id as variant_id,
  p.name as product_name,
  pv.color,
  pv.size,
  pv.variant_name,
  COUNT(pi.id) as image_count,
  STRING_AGG(pi.image_url, ', ') as image_urls
FROM public.product_variants pv
LEFT JOIN public.products p ON pv.product_id = p.id
LEFT JOIN public.product_images pi ON pi.variant_id = pv.id
GROUP BY pv.id, p.name, pv.color, pv.size, pv.variant_name
HAVING COUNT(pi.id) > 0
ORDER BY p.name, pv.display_order
LIMIT 10;

-- 10. عرض أمثلة على المتغيرات بدون صور
SELECT 
  pv.id as variant_id,
  p.name as product_name,
  pv.color,
  pv.size,
  pv.variant_name
FROM public.product_variants pv
LEFT JOIN public.products p ON pv.product_id = p.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_images pi 
  WHERE pi.variant_id = pv.id
)
ORDER BY p.name, pv.display_order
LIMIT 10;

-- 11. التحقق من RLS Policies
SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND (tablename = 'product_variants' OR tablename = 'product_images')
ORDER BY tablename, policyname;

-- 12. التحقق من Triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (event_object_table = 'product_variants' OR event_object_table = 'product_images')
ORDER BY event_object_table, trigger_name;

-- ============================================
-- ملخص التحقق:
-- 1. ✅ product_variants لا يحتوي على image_url
-- 2. ✅ product_images يحتوي على variant_id
-- 3. ✅ العلاقات (Foreign Keys) صحيحة
-- 4. ✅ الفهارس موجودة
-- 5. ✅ RLS Policies مفعلة
-- 6. ✅ Triggers موجودة
-- ============================================

