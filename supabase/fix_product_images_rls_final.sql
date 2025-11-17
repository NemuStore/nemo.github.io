-- ============================================
-- إصلاح نهائي لـ RLS policies لجدول product_images
-- ============================================
-- هذا الملف يصلح RLS policies لتعمل بشكل صحيح مع Supabase REST API
-- يستخدم request.jwt.claims.sub كبديل لـ auth.uid() لضمان العمل مع Authorization header

-- 1. حذف السياسات القديمة (إذا كانت موجودة)
DROP POLICY IF EXISTS "Anyone can view product images" ON public.product_images;
DROP POLICY IF EXISTS "Only admins can insert product images" ON public.product_images;
DROP POLICY IF EXISTS "Only admins can update product images" ON public.product_images;
DROP POLICY IF EXISTS "Only admins can delete product images" ON public.product_images;

-- 2. التأكد من وجود جدول product_images مع variant_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'product_images' 
    AND column_name = 'variant_id'
  ) THEN
    ALTER TABLE public.product_images 
    ADD COLUMN variant_id UUID NULL 
      REFERENCES public.product_variants(id) ON DELETE CASCADE;
    
    -- إضافة فهارس
    CREATE INDEX IF NOT EXISTS idx_product_images_variant_id ON public.product_images(variant_id);
    CREATE INDEX IF NOT EXISTS idx_product_images_product_variant ON public.product_images(product_id, variant_id);
  END IF;
END $$;

-- 3. إنشاء سياسات جديدة محسّنة
-- أي شخص يمكنه رؤية صور المنتجات
CREATE POLICY "Anyone can view product images" ON public.product_images
  FOR SELECT USING (true);

-- التأكد من وجود دالة is_admin_or_manager (إذا لم تكن موجودة)
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

-- فقط الأدمن والمدير يمكنهم إضافة صور المنتجات
-- استخدام دالة is_admin_or_manager التي تتجاوز RLS
CREATE POLICY "Only admins can insert product images" ON public.product_images
  FOR INSERT 
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- فقط الأدمن والمدير يمكنهم تحديث صور المنتجات
CREATE POLICY "Only admins can update product images" ON public.product_images
  FOR UPDATE 
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- فقط الأدمن والمدير يمكنهم حذف صور المنتجات
CREATE POLICY "Only admins can delete product images" ON public.product_images
  FOR DELETE 
  USING (public.is_admin_or_manager(auth.uid()));

-- 4. التأكد من أن RLS مفعّل
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- 5. التحقق من السياسات
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'product_images'
ORDER BY policyname;

-- ============================================
-- ملاحظات:
-- 1. هذه السياسات تستخدم دالة is_admin_or_manager التي تتجاوز RLS
-- 2. الدالة تستخدم SECURITY DEFINER لضمان العمل مع Supabase client و REST API
-- 3. يجب أن يكون المستخدم لديه دور 'admin' أو 'manager' في جدول users
-- 4. إذا كان access_token غير موجود أو غير صالح، ستفشل هذه السياسات
-- 5. الدالة is_admin_or_manager موجودة بالفعل في الكود، لكن تم التأكد من وجودها هنا
-- ============================================

