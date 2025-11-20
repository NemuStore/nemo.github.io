-- ============================================
-- إصلاح RLS policies لجدول product_images
-- ============================================

-- 1. حذف السياسات القديمة (إذا كانت موجودة)
DROP POLICY IF EXISTS "Anyone can view product images" ON public.product_images;
DROP POLICY IF EXISTS "Only admins can insert product images" ON public.product_images;
DROP POLICY IF EXISTS "Only admins can update product images" ON public.product_images;
DROP POLICY IF EXISTS "Only admins can delete product images" ON public.product_images;

-- 2. إنشاء سياسات جديدة محسّنة
-- أي شخص يمكنه رؤية صور المنتجات
CREATE POLICY "Anyone can view product images" ON public.product_images
  FOR SELECT USING (true);

-- فقط الأدمن والمدير يمكنهم إضافة صور المنتجات
CREATE POLICY "Only admins can insert product images" ON public.product_images
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.users 
      WHERE id = auth.uid() 
        AND role IN ('admin', 'manager')
    )
  );

-- فقط الأدمن والمدير يمكنهم تحديث صور المنتجات
CREATE POLICY "Only admins can update product images" ON public.product_images
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.users 
      WHERE id = auth.uid() 
        AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.users 
      WHERE id = auth.uid() 
        AND role IN ('admin', 'manager')
    )
  );

-- فقط الأدمن والمدير يمكنهم حذف صور المنتجات
CREATE POLICY "Only admins can delete product images" ON public.product_images
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.users 
      WHERE id = auth.uid() 
        AND role IN ('admin', 'manager')
    )
  );

-- ============================================
-- التحقق من أن RLS مفعّل
-- ============================================
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ملاحظات:
-- 1. هذه السياسات تتطلب أن يكون auth.uid() موجوداً
-- 2. يجب أن يكون المستخدم لديه دور 'admin' أو 'manager' في جدول users
-- 3. إذا كان access_token غير موجود أو غير صالح، ستفشل هذه السياسات
-- ============================================

