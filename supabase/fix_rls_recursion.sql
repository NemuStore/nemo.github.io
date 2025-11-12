-- Fix RLS recursion issue in users table
-- This function checks user role without causing recursion

-- Drop existing problematic policy
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

-- Create a security definer function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = user_id;
  
  RETURN user_role;
END;
$$;

-- Recreate the policy using the function (but this still causes recursion)
-- Better solution: Use a different approach

-- Instead, let's use a simpler policy that doesn't cause recursion
-- We'll check if the user is viewing their own profile OR if they have admin role in auth metadata
-- But since we can't access auth metadata directly, we need a different approach

-- Solution: Create a view or use SECURITY DEFINER function
-- Actually, the best solution is to use a function that bypasses RLS

CREATE OR REPLACE FUNCTION public.is_admin_or_manager(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- This function runs with SECURITY DEFINER, so it bypasses RLS
  SELECT role INTO user_role
  FROM public.users
  WHERE id = user_id;
  
  RETURN user_role IN ('admin', 'manager');
END;
$$;

-- Now recreate the policy using the function
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    auth.uid() = id OR public.is_admin_or_manager(auth.uid())
  );

-- Also fix similar policies in other tables
-- Products policies
DROP POLICY IF EXISTS "Only admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Only admins can update products" ON public.products;

CREATE POLICY "Only admins can insert products" ON public.products
  FOR INSERT WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Only admins can update products" ON public.products
  FOR UPDATE USING (public.is_admin_or_manager(auth.uid()));

-- Orders policies
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;

CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT USING (
    auth.uid() = user_id OR public.is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE USING (
    auth.uid() = user_id OR public.is_admin_or_manager(auth.uid())
  );

-- Order items policies
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;

CREATE POLICY "Admins can view all order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
    OR public.is_admin_or_manager(auth.uid())
  );

-- Shipments policies
DROP POLICY IF EXISTS "Admins can view all shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can manage shipments" ON public.shipments;

CREATE POLICY "Admins can view all shipments" ON public.shipments
  FOR SELECT USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can manage shipments" ON public.shipments
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- Shipment orders policies
DROP POLICY IF EXISTS "Admins can view all shipment orders" ON public.shipment_orders;
DROP POLICY IF EXISTS "Admins can manage shipment orders" ON public.shipment_orders;

CREATE POLICY "Admins can view all shipment orders" ON public.shipment_orders
  FOR SELECT USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can manage shipment orders" ON public.shipment_orders
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- Inventory policies
DROP POLICY IF EXISTS "Admins can view all inventory" ON public.inventory;
DROP POLICY IF EXISTS "Admins can manage inventory" ON public.inventory;

CREATE POLICY "Admins can view all inventory" ON public.inventory
  FOR SELECT USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can manage inventory" ON public.inventory
  FOR ALL USING (public.is_admin_or_manager(auth.uid()));

