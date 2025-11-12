-- Simple version that works with or without is_admin_or_manager function
-- First drop if exists to avoid conflicts
DROP POLICY IF EXISTS "Only admins can delete products" ON public.products;

-- Create the policy
CREATE POLICY "Only admins can delete products" ON public.products
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

