-- ============================================
-- جدول الأسئلة الشائعة للمنتجات (Product FAQs)
-- ============================================

-- 1. إنشاء جدول الأسئلة الشائعة
CREATE TABLE IF NOT EXISTS public.product_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  question TEXT NOT NULL, -- السؤال
  answer TEXT NOT NULL, -- الإجابة
  
  display_order INTEGER NOT NULL DEFAULT 0, -- ترتيب العرض
  is_active BOOLEAN DEFAULT true, -- هل السؤال نشط؟
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_product_faqs_product_id ON public.product_faqs(product_id);
CREATE INDEX IF NOT EXISTS idx_product_faqs_is_active ON public.product_faqs(product_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_product_faqs_display_order ON public.product_faqs(product_id, display_order);

-- 3. Enable RLS
ALTER TABLE public.product_faqs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- أي شخص يمكنه رؤية الأسئلة النشطة
CREATE POLICY "Anyone can view active product FAQs" ON public.product_faqs
  FOR SELECT USING (is_active = true);

-- أي شخص يمكنه رؤية جميع الأسئلة (للإدارة)
CREATE POLICY "Anyone can view all product FAQs" ON public.product_faqs
  FOR SELECT USING (true);

-- فقط الأدمن والمدير يمكنهم إضافة/تعديل/حذف الأسئلة
CREATE POLICY "Only admins can manage product FAQs" ON public.product_faqs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- 5. Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_product_faqs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_faqs_updated_at
  BEFORE UPDATE ON public.product_faqs
  FOR EACH ROW
  EXECUTE FUNCTION update_product_faqs_updated_at();

-- ملاحظات:
-- 1. يمكن إضافة أسئلة متعددة لكل منتج
-- 2. display_order يحدد ترتيب عرض الأسئلة
-- 3. is_active يخفي الأسئلة غير النشطة

