-- دالة لملء المستخدمين المفقودين في جدول users
-- تشغيل هذا الكود في Supabase SQL Editor

-- إنشاء دالة لملء المستخدمين المفقودين
CREATE OR REPLACE FUNCTION sync_missing_users()
RETURNS TABLE(
  user_id UUID,
  email VARCHAR,
  created BOOLEAN
) AS $$
DECLARE
  auth_user RECORD;
BEGIN
  -- البحث عن جميع المستخدمين في auth.users الذين ليسوا في public.users
  FOR auth_user IN
    SELECT 
      au.id,
      au.email::TEXT,
      au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    -- إدراج المستخدم المفقود في جدول users
    INSERT INTO public.users (
      id,
      email,
      full_name,
      role,
      created_at,
      updated_at
    )
    VALUES (
      auth_user.id,
      auth_user.email,
      COALESCE(
        auth_user.raw_user_meta_data->>'full_name',
        SPLIT_PART(auth_user.email, '@', 1),
        'مستخدم'
      ),
      'customer', -- دور افتراضي: مستخدم
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- إرجاع النتيجة
    RETURN QUERY SELECT auth_user.id, auth_user.email::VARCHAR, TRUE;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تشغيل الدالة لملء البيانات المفقودة
SELECT * FROM sync_missing_users();

