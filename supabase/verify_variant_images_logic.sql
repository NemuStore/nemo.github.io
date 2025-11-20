-- ============================================
-- التحقق من منطق حفظ صور المتغيرات
-- ============================================
-- هذا الملف يتحقق من أن صور المتغيرات محفوظة بشكل صحيح

-- 1. عرض جميع صور المتغيرات
SELECT 
  pi.id,
  pi.product_id,
  p.name as product_name,
  pi.image_url,
  pi.variant_id,
  pv.color,
  pv.size,
  pi.display_order,
  pi.is_primary,
  pi.created_at
FROM public.product_images pi
LEFT JOIN public.products p ON pi.product_id = p.id
LEFT JOIN public.product_variants pv ON pi.variant_id = pv.id
WHERE pi.variant_id IS NOT NULL
ORDER BY pi.product_id, pi.variant_id, pi.display_order;

-- 2. عرض المتغيرات بدون صور
SELECT 
  pv.id,
  pv.product_id,
  p.name as product_name,
  pv.color,
  pv.size,
  pv.variant_name,
  COUNT(pi.id) as image_count
FROM public.product_variants pv
LEFT JOIN public.products p ON pv.product_id = p.id
LEFT JOIN public.product_images pi ON pi.variant_id = pv.id
GROUP BY pv.id, pv.product_id, p.name, pv.color, pv.size, pv.variant_name
HAVING COUNT(pi.id) = 0
ORDER BY pv.product_id, pv.display_order;

-- 3. عرض المتغيرات مع صور متعددة
SELECT 
  pv.id,
  pv.product_id,
  p.name as product_name,
  pv.color,
  pv.size,
  COUNT(pi.id) as image_count
FROM public.product_variants pv
LEFT JOIN public.products p ON pv.product_id = p.id
LEFT JOIN public.product_images pi ON pi.variant_id = pv.id
GROUP BY pv.id, pv.product_id, p.name, pv.color, pv.size
HAVING COUNT(pi.id) > 1
ORDER BY pv.product_id, pv.display_order;

-- 4. إحصائيات عامة
SELECT 
  'إجمالي المتغيرات' as metric,
  COUNT(*) as count
FROM public.product_variants
UNION ALL
SELECT 
  'المتغيرات مع صور' as metric,
  COUNT(DISTINCT variant_id)
FROM public.product_images
WHERE variant_id IS NOT NULL
UNION ALL
SELECT 
  'المتغيرات بدون صور' as metric,
  COUNT(*)
FROM public.product_variants pv
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_images pi 
  WHERE pi.variant_id = pv.id
)
UNION ALL
SELECT 
  'إجمالي صور المتغيرات' as metric,
  COUNT(*)
FROM public.product_images
WHERE variant_id IS NOT NULL;

-- 5. التحقق من الصور المكررة (نفس image_url لنفس المتغير)
SELECT 
  variant_id,
  image_url,
  COUNT(*) as duplicate_count
FROM public.product_images
WHERE variant_id IS NOT NULL
GROUP BY variant_id, image_url
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 6. عرض المنتجات مع عدد المتغيرات وعدد صور المتغيرات
SELECT 
  p.id,
  p.name,
  COUNT(DISTINCT pv.id) as variants_count,
  COUNT(DISTINCT CASE WHEN pi.variant_id IS NOT NULL THEN pi.id END) as variant_images_count,
  COUNT(DISTINCT CASE WHEN pi.variant_id IS NULL THEN pi.id END) as general_images_count
FROM public.products p
LEFT JOIN public.product_variants pv ON pv.product_id = p.id
LEFT JOIN public.product_images pi ON pi.product_id = p.id
GROUP BY p.id, p.name
HAVING COUNT(DISTINCT pv.id) > 0
ORDER BY variants_count DESC;

-- ============================================
-- ملاحظات:
-- 1. كل متغير يجب أن يكون له صورة واحدة على الأقل في product_images مع variant_id
-- 2. نفس image_url يمكن أن يكون في product_images مرتين:
--    - مرة مع variant_id = NULL (صورة عامة)
--    - مرة مع variant_id = UUID (صورة متغير)
-- 3. إذا كان هناك متغير بدون صور، يجب إضافة صورة له
-- 4. إذا كان هناك متغير مع صور متعددة، هذا مقبول (لكن عادة صورة واحدة كافية)
-- ============================================

