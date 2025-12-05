-- Add DELETE policy for orders table
-- Allow admins and managers to delete orders

CREATE POLICY "Admins can delete orders" ON public.orders
  FOR DELETE USING (public.is_admin_or_manager(auth.uid()));

-- Add DELETE policy for order_items table
-- Allow admins and managers to delete order_items

CREATE POLICY "Admins can delete order items" ON public.order_items
  FOR DELETE USING (public.is_admin_or_manager(auth.uid()));

