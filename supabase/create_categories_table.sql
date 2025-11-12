-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NULL,
  icon TEXT NULL, -- Icon name for the category (optional)
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON public.categories(display_order);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view active categories
CREATE POLICY "Anyone can view active categories" ON public.categories
  FOR SELECT USING (is_active = TRUE);

-- Admins can view all categories (including inactive)
CREATE POLICY "Admins can view all categories" ON public.categories
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Admins can manage categories
CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION update_categories_updated_at();

-- Update products table to use category_id instead of category text
-- First, add category_id column
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS category_id UUID NULL REFERENCES public.categories(id) ON DELETE SET NULL;

-- Create index for category_id
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);

-- Migrate existing category text to categories table and link products
-- This will create categories from existing product.category values
DO $$
DECLARE
  cat_name TEXT;
  cat_id UUID;
BEGIN
  -- Loop through unique category names from products
  FOR cat_name IN 
    SELECT DISTINCT category 
    FROM public.products 
    WHERE category IS NOT NULL AND category != ''
  LOOP
    -- Check if category already exists
    SELECT id INTO cat_id FROM public.categories WHERE name = cat_name;
    
    -- If category doesn't exist, create it
    IF cat_id IS NULL THEN
      INSERT INTO public.categories (name, description, is_active)
      VALUES (cat_name, 'Migrated from products', TRUE)
      RETURNING id INTO cat_id;
    END IF;
    
    -- Update products to use the category_id
    UPDATE public.products
    SET category_id = cat_id
    WHERE category = cat_name AND category_id IS NULL;
  END LOOP;
END $$;

-- Keep category column for backward compatibility (can be removed later)
-- ALTER TABLE public.products DROP COLUMN category;

COMMENT ON TABLE public.categories IS 'Product categories table';
COMMENT ON COLUMN public.categories.name IS 'Category name (unique)';
COMMENT ON COLUMN public.categories.display_order IS 'Order for displaying categories';
COMMENT ON COLUMN public.categories.is_active IS 'Whether the category is active and visible';

