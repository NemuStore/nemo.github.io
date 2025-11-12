-- Add discount fields to products table
-- This migration adds original_price and discount_percentage fields

-- Add original_price column (nullable, for products with discounts)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2) NULL;

-- Add discount_percentage column (nullable, 0-100)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS discount_percentage INTEGER NULL 
CHECK (discount_percentage >= 0 AND discount_percentage <= 100);

-- Add index for better query performance on discounted products
CREATE INDEX IF NOT EXISTS idx_products_discount_percentage 
ON public.products(discount_percentage) 
WHERE discount_percentage IS NOT NULL AND discount_percentage > 0;

-- Function to automatically calculate discount_percentage from original_price and price
CREATE OR REPLACE FUNCTION calculate_discount_percentage()
RETURNS TRIGGER AS $$
BEGIN
  -- If original_price is set and greater than price, calculate discount
  IF NEW.original_price IS NOT NULL AND NEW.original_price > NEW.price AND NEW.original_price > 0 THEN
    NEW.discount_percentage := ROUND(((NEW.original_price - NEW.price) / NEW.original_price) * 100);
  -- If discount_percentage is set, calculate original_price from price
  ELSIF NEW.discount_percentage IS NOT NULL AND NEW.discount_percentage > 0 AND NEW.discount_percentage <= 100 THEN
    NEW.original_price := ROUND((NEW.price / (1 - NEW.discount_percentage / 100.0))::NUMERIC, 2);
  -- If both are null or discount is 0, clear original_price
  ELSIF NEW.discount_percentage IS NULL OR NEW.discount_percentage = 0 THEN
    NEW.original_price := NULL;
    NEW.discount_percentage := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate discount fields
DROP TRIGGER IF EXISTS trigger_calculate_discount ON public.products;
CREATE TRIGGER trigger_calculate_discount
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION calculate_discount_percentage();

-- Update existing products: if you want to set discounts for existing products
-- You can run this manually for specific products:
-- UPDATE public.products 
-- SET original_price = price * 1.2, discount_percentage = 20 
-- WHERE id = 'product-id-here';

COMMENT ON COLUMN public.products.original_price IS 'Original price before discount. If set, discount_percentage will be calculated automatically.';
COMMENT ON COLUMN public.products.discount_percentage IS 'Discount percentage (0-100). If set, original_price will be calculated automatically.';

