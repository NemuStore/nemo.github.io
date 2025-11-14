-- ============================================
-- جدول قائمة الأمنيات (Product Wishlist)
-- ============================================

-- 1. إنشاء جدول قائمة الأمنيات
CREATE TABLE IF NOT EXISTS public.product_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- قيود
  CONSTRAINT unique_user_product_wishlist UNIQUE(user_id, product_id) -- لا يمكن إضافة نفس المنتج مرتين
);

-- 2. فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_product_wishlist_user_id ON public.product_wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_product_wishlist_product_id ON public.product_wishlist(product_id);
CREATE INDEX IF NOT EXISTS idx_product_wishlist_created_at ON public.product_wishlist(user_id, created_at DESC);

-- 3. Enable RLS
ALTER TABLE public.product_wishlist ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- المستخدم يمكنه رؤية قائمة أمنياته فقط
CREATE POLICY "Users can view their own wishlist" ON public.product_wishlist
  FOR SELECT USING (auth.uid() = user_id);

-- المستخدم يمكنه إضافة منتجات لقائمة أمنياته
CREATE POLICY "Users can add to their wishlist" ON public.product_wishlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- المستخدم يمكنه حذف منتجات من قائمة أمنياته
CREATE POLICY "Users can remove from their wishlist" ON public.product_wishlist
  FOR DELETE USING (auth.uid() = user_id);

-- الأدمن والمدير يمكنهم رؤية جميع قوائم الأمنيات
CREATE POLICY "Admins can view all wishlists" ON public.product_wishlist
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ملاحظات:
-- 1. كل مستخدم له قائمة أمنيات خاصة به
-- 2. لا يمكن إضافة نفس المنتج مرتين (UNIQUE constraint)
-- 3. عند حذف المستخدم أو المنتج، يتم حذف السجل تلقائياً (CASCADE)

