-- ============================================
-- التحقق من المنتجات والمتغيرات في قاعدة البيانات
-- ============================================

-- 1. عدد المنتجات الإجمالي
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_products,
  COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_products
FROM public.products;

-- 2. عدد المتغيرات الإجمالي
SELECT 
  COUNT(*) as total_variants,
  COUNT(DISTINCT product_id) as products_with_variants
FROM public.product_variants;

-- 3. المنتجات مع عدد متغيراتها
SELECT 
  p.id,
  p.name,
  p.sku,
  COUNT(pv.id) as variant_count,
  STRING_AGG(DISTINCT pv.color, ', ') as colors,
  STRING_AGG(DISTINCT pv.size, ', ') as sizes
FROM public.products p
LEFT JOIN public.product_variants pv ON p.id = pv.product_id
GROUP BY p.id, p.name, p.sku
ORDER BY variant_count DESC, p.name
LIMIT 20;

-- 4. المتغيرات مع تفاصيلها
SELECT 
  pv.id,
  pv.product_id,
  p.name as product_name,
  pv.variant_name,
  pv.color,
  pv.size,
  pv.size_unit,
  pv.price,
  pv.stock_quantity,
  pv.is_active,
  pv.is_default,
  pv.image_url
FROM public.product_variants pv
JOIN public.products p ON pv.product_id = p.id
ORDER BY p.name, pv.display_order
LIMIT 20;

-- 5. المنتجات التي لا تحتوي على متغيرات
SELECT 
  p.id,
  p.name,
  p.sku,
  p.price,
  p.stock_quantity
FROM public.products p
LEFT JOIN public.product_variants pv ON p.id = pv.product_id
WHERE pv.id IS NULL
ORDER BY p.name
LIMIT 20;

-- 6. التحقق من الصور المرتبطة بالمنتجات
SELECT 
  p.id as product_id,
  p.name as product_name,
  COUNT(pi.id) as image_count,
  COUNT(CASE WHEN pi.variant_id IS NULL THEN 1 END) as general_images,
  COUNT(CASE WHEN pi.variant_id IS NOT NULL THEN 1 END) as variant_images
FROM public.products p
LEFT JOIN public.product_images pi ON p.id = pi.product_id
GROUP BY p.id, p.name
ORDER BY image_count DESC, p.name
LIMIT 20;

