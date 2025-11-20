-- ============================================
-- التحقق من RLS policies لجدول product_images
-- ============================================

-- 1. التحقق من وجود RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'product_images'
ORDER BY policyname;

-- 2. التحقق من حالة RLS
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'product_images';

-- 3. التحقق من الصلاحيات الحالية
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'product_images';

