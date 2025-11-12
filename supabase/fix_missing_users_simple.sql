-- كود بسيط لملء المستخدمين المفقودين
-- انسخ هذا الكود والصقه في Supabase SQL Editor واضغط Run

-- إضافة جميع المستخدمين المفقودين من auth.users إلى public.users
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    SPLIT_PART(au.email, '@', 1),
    'مستخدم'
  ) AS full_name,
  'customer' AS role, -- دور افتراضي: مستخدم
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- عرض النتائج - عدد المستخدمين المضافين
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = 'customer' THEN 1 END) as customers,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN role = 'manager' THEN 1 END) as managers,
  COUNT(CASE WHEN role = 'employee' THEN 1 END) as employees
FROM public.users;

