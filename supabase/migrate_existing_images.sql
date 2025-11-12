-- Migrate existing product images to product_images table
-- This script moves image_url from products table to product_images table

INSERT INTO public.product_images (product_id, image_url, display_order, is_primary, created_at, updated_at)
SELECT 
  id as product_id,
  image_url,
  0 as display_order,
  true as is_primary,
  created_at,
  updated_at
FROM public.products
WHERE image_url IS NOT NULL AND image_url != '';

-- Note: After migration, you can optionally remove image_url column from products table
-- But we'll keep it for backward compatibility for now

