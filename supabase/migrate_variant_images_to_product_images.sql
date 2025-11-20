-- ============================================
-- نقل صور المتغيرات من product_variants.image_url إلى product_images
-- ثم حذف عمود image_url من product_variants
-- ============================================
-- هذا الملف ينقل جميع صور المتغيرات الموجودة في product_variants.image_url
-- إلى جدول product_images مع variant_id صحيح

-- 1. نقل صور المتغيرات الموجودة إلى product_images
-- (فقط المتغيرات التي لديها image_url وليس لديها صور في product_images)
INSERT INTO public.product_images (
  product_id,
  image_url,
  variant_id,
  display_order,
  is_primary,
  created_at,
  updated_at
)
SELECT 
  pv.product_id,
  pv.image_url,
  pv.id as variant_id,
  0 as display_order,
  false as is_primary,
  pv.created_at,
  pv.updated_at
FROM public.product_variants pv
WHERE pv.image_url IS NOT NULL
  AND pv.image_url != ''
  -- التأكد من عدم وجود صورة لهذا المتغير في product_images بالفعل
  AND NOT EXISTS (
    SELECT 1 
    FROM public.product_images pi 
    WHERE pi.variant_id = pv.id 
      AND pi.image_url = pv.image_url
  )
ON CONFLICT DO NOTHING;

-- 2. عرض إحصائيات النقل
SELECT 
  'Migration Summary' as summary,
  COUNT(*) as variants_with_image_url,
  (SELECT COUNT(*) FROM public.product_images WHERE variant_id IS NOT NULL) as variant_images_in_product_images
FROM public.product_variants
WHERE image_url IS NOT NULL AND image_url != '';

-- 3. التحقق من النقل
SELECT 
  pv.id as variant_id,
  pv.color,
  pv.size,
  pv.image_url as old_image_url,
  pi.image_url as new_image_url,
  CASE 
    WHEN pi.id IS NOT NULL THEN '✅ Migrated'
    WHEN pv.image_url IS NOT NULL AND pv.image_url != '' THEN '⚠️ Not migrated'
    ELSE 'ℹ️ No image'
  END as status
FROM public.product_variants pv
LEFT JOIN public.product_images pi ON pi.variant_id = pv.id
WHERE pv.image_url IS NOT NULL AND pv.image_url != ''
ORDER BY pv.product_id, pv.color, pv.size
LIMIT 50;

-- ============================================
-- ملاحظة: بعد التأكد من نقل جميع البيانات بنجاح،
-- يمكن حذف عمود image_url من product_variants
-- ============================================

