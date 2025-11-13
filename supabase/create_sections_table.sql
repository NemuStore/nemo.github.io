-- Create sections table (المستوى الأول: أقسام)
CREATE TABLE IF NOT EXISTS public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NULL,
  icon TEXT NULL, -- Icon name for the section (optional)
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_sections_name ON public.sections(name);
CREATE INDEX IF NOT EXISTS idx_sections_active ON public.sections(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_sections_display_order ON public.sections(display_order);

-- Enable RLS
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view active sections
CREATE POLICY "Anyone can view active sections" ON public.sections
  FOR SELECT USING (is_active = TRUE);

-- Admins can view all sections (including inactive)
CREATE POLICY "Admins can view all sections" ON public.sections
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Admins can manage sections
CREATE POLICY "Admins can manage sections" ON public.sections
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_sections_updated_at
BEFORE UPDATE ON public.sections
FOR EACH ROW
EXECUTE FUNCTION update_sections_updated_at();

-- Update categories table to add section_id (المستوى الثاني: فئات مرتبطة بقسم)
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS section_id UUID NULL REFERENCES public.sections(id) ON DELETE SET NULL;

-- Create index for section_id in categories
CREATE INDEX IF NOT EXISTS idx_categories_section_id ON public.categories(section_id);

-- Update the unique constraint on categories.name to allow same name in different sections
-- First, drop the existing unique constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'categories_name_key' 
    AND conrelid = 'public.categories'::regclass
  ) THEN
    ALTER TABLE public.categories DROP CONSTRAINT categories_name_key;
  END IF;
END $$;

-- Add new unique constraint: name must be unique within a section (but can repeat across sections)
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_section_name_unique 
ON public.categories(section_id, name) 
WHERE section_id IS NOT NULL;

-- For categories without section_id, name must still be unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_unique_no_section 
ON public.categories(name) 
WHERE section_id IS NULL;

COMMENT ON TABLE public.sections IS 'Product sections table (المستوى الأول: أقسام)';
COMMENT ON COLUMN public.sections.name IS 'Section name (unique)';
COMMENT ON COLUMN public.sections.display_order IS 'Order for displaying sections';
COMMENT ON COLUMN public.sections.is_active IS 'Whether the section is active and visible';
COMMENT ON COLUMN public.categories.section_id IS 'Reference to parent section (المستوى الثاني: فئات مرتبطة بقسم)';

