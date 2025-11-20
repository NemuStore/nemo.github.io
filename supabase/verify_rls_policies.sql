-- ============================================
-- التحقق من RLS policies لجميع الجداول المهمة
-- ============================================

-- 1. التحقق من RLS policies لجدول product_images
SELECT 
  'product_images' as table_name,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'product_images'
ORDER BY policyname;

-- 2. التحقق من RLS policies لجدول product_variants
SELECT 
  'product_variants' as table_name,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'product_variants'
ORDER BY policyname;

-- 3. التحقق من RLS policies لجدول products
SELECT 
  'products' as table_name,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'products'
ORDER BY policyname;

-- 4. التحقق من RLS policies لجدول users
SELECT 
  'users' as table_name,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- 5. التحقق من حالة RLS لجميع الجداول
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('product_images', 'product_variants', 'products', 'users')
ORDER BY tablename;

-- 6. التحقق من وجود جدول users والتحقق من الصلاحيات
SELECT 
  COUNT(*) as user_count,
  COUNT(CASE WHEN role IN ('admin', 'manager') THEN 1 END) as admin_manager_count
FROM public.users;

-- 7. التحقق من الصلاحيات الحالية للمستخدمين
SELECT 
  id,
  email,
  role,
  full_name
FROM public.users
WHERE role IN ('admin', 'manager')
ORDER BY role, email;

-- 8. التحقق من وجود auth.uid() function
SELECT 
  proname as function_name,
  proargtypes::regtype[] as argument_types,
  prorettype::regtype as return_type
FROM pg_proc
WHERE proname = 'uid'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth');

-- 9. التحقق من عدد الصور في product_images
SELECT 
  COUNT(*) as total_images,
  COUNT(DISTINCT product_id) as products_with_images,
  COUNT(CASE WHEN variant_id IS NULL THEN 1 END) as general_images,
  COUNT(CASE WHEN variant_id IS NOT NULL THEN 1 END) as variant_images
FROM public.product_images;

-- 10. التحقق من عدد المتغيرات في product_variants
SELECT 
  COUNT(*) as total_variants,
  COUNT(DISTINCT product_id) as products_with_variants
FROM public.product_variants;

