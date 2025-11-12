-- Add RLS policy to allow admins to delete products
-- Use the same function as other policies to avoid recursion
CREATE POLICY "Only admins can delete products" ON public.products
  FOR DELETE USING (public.is_admin_or_manager(auth.uid()));
