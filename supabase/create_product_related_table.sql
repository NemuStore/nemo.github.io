-- ============================================
-- جدول المنتجات المشابهة والمرتبطة (Product Related)
-- ============================================

-- 1. إنشاء جدول المنتجات المرتبطة
CREATE TABLE IF NOT EXISTS public.product_related (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  related_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  relation_type TEXT NOT NULL DEFAULT 'similar' 
    CHECK (relation_type IN ('similar', 'complementary', 'upsell', 'cross_sell')),
  -- similar: منتجات مشابهة
  -- complementary: منتجات مكملة (مثل: قميص + بنطلون)
  -- upsell: منتجات أعلى سعر
  -- cross_sell: منتجات مرتبطة
  
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- قيود
  CONSTRAINT unique_product_related UNIQUE(product_id, related_product_id), -- لا يمكن ربط نفس المنتج مرتين
  CONSTRAINT check_different_products CHECK (product_id != related_product_id) -- لا يمكن ربط المنتج بنفسه
);

-- 2. فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_product_related_product_id ON public.product_related(product_id);
CREATE INDEX IF NOT EXISTS idx_product_related_related_product_id ON public.product_related(related_product_id);
CREATE INDEX IF NOT EXISTS idx_product_related_relation_type ON public.product_related(product_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_product_related_is_active ON public.product_related(product_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_product_related_display_order ON public.product_related(product_id, display_order);

-- 3. Enable RLS
ALTER TABLE public.product_related ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- أي شخص يمكنه رؤية المنتجات المرتبطة النشطة
CREATE POLICY "Anyone can view active related products" ON public.product_related
  FOR SELECT USING (is_active = true);

-- أي شخص يمكنه رؤية جميع المنتجات المرتبطة (للإدارة)
CREATE POLICY "Anyone can view all related products" ON public.product_related
  FOR SELECT USING (true);

-- فقط الأدمن والمدير يمكنهم إضافة/تعديل/حذف المنتجات المرتبطة
CREATE POLICY "Only admins can manage related products" ON public.product_related
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ملاحظات:
-- 1. يمكن ربط منتج بمنتجات متعددة
-- 2. relation_type يحدد نوع العلاقة (مشابه، مكمل، إلخ)
-- 3. display_order يحدد ترتيب عرض المنتجات المرتبطة
-- 4. لا يمكن ربط المنتج بنفسه (CHECK constraint)

