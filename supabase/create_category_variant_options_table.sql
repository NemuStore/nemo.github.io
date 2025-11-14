-- ============================================
-- جدول خيارات المتغيرات لكل فئة (Category Variant Options)
-- لتوفير اقتراحات للألوان والمقاسات حسب الفئة
-- ============================================

-- 1. إنشاء جدول خيارات الألوان للفئات
CREATE TABLE IF NOT EXISTS public.category_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  color_name TEXT NOT NULL, -- اسم اللون (مثل: أحمر، أسود، أزرق)
  color_hex TEXT NULL, -- كود اللون (مثل: #FF0000) - اختياري
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- قيود
  CONSTRAINT unique_category_color UNIQUE(category_id, color_name) -- لا يمكن تكرار نفس اللون في نفس الفئة
);

-- 2. إنشاء جدول خيارات المقاسات للفئات
CREATE TABLE IF NOT EXISTS public.category_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  size_value TEXT NOT NULL, -- قيمة المقاس (مثل: S, M, L, 40, 41, 100x200)
  size_unit TEXT NULL, -- وحدة القياس (مثل: مقاس، رقم، بوصة، سم)
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- قيود
  CONSTRAINT unique_category_size UNIQUE(category_id, size_value, size_unit) -- لا يمكن تكرار نفس المقاس في نفس الفئة
);

-- 3. فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_category_colors_category_id ON public.category_colors(category_id);
CREATE INDEX IF NOT EXISTS idx_category_colors_is_active ON public.category_colors(category_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_category_colors_display_order ON public.category_colors(category_id, display_order);

CREATE INDEX IF NOT EXISTS idx_category_sizes_category_id ON public.category_sizes(category_id);
CREATE INDEX IF NOT EXISTS idx_category_sizes_is_active ON public.category_sizes(category_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_category_sizes_display_order ON public.category_sizes(category_id, display_order);

-- 4. Enable RLS
ALTER TABLE public.category_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_sizes ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- أي شخص يمكنه رؤية الألوان والمقاسات النشطة
CREATE POLICY "Anyone can view active category colors" ON public.category_colors
  FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active category sizes" ON public.category_sizes
  FOR SELECT USING (is_active = true);

-- أي شخص يمكنه رؤية جميع الألوان والمقاسات (للإدارة)
CREATE POLICY "Anyone can view all category colors" ON public.category_colors
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view all category sizes" ON public.category_sizes
  FOR SELECT USING (true);

-- فقط الأدمن والمدير يمكنهم إدارة الألوان والمقاسات
CREATE POLICY "Only admins can manage category colors" ON public.category_colors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Only admins can manage category sizes" ON public.category_sizes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- 6. Triggers لتحديث updated_at
CREATE OR REPLACE FUNCTION update_category_colors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_category_sizes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_category_colors_updated_at
  BEFORE UPDATE ON public.category_colors
  FOR EACH ROW
  EXECUTE FUNCTION update_category_colors_updated_at();

CREATE TRIGGER update_category_sizes_updated_at
  BEFORE UPDATE ON public.category_sizes
  FOR EACH ROW
  EXECUTE FUNCTION update_category_sizes_updated_at();

-- 7. ملاحظات:
-- - يمكن إضافة ألوان/مقاسات عامة (category_id = NULL) لتظهر لجميع الفئات
-- - عند اختيار فئة في نموذج المنتج، تظهر الألوان والمقاسات كاقتراحات
-- - يمكن إضافة لون/مقاس جديد إذا لم يكن موجوداً (hybrid approach)
-- - يمكن ربط الألوان بأكواد ألوان (color_hex) لعرضها بشكل مرئي

COMMENT ON TABLE public.category_colors IS 'خيارات الألوان المتاحة لكل فئة';
COMMENT ON TABLE public.category_sizes IS 'خيارات المقاسات المتاحة لكل فئة';
COMMENT ON COLUMN public.category_colors.color_hex IS 'كود اللون (مثل: #FF0000) - اختياري لعرض اللون بشكل مرئي';
COMMENT ON COLUMN public.category_sizes.size_unit IS 'وحدة القياس (مثل: مقاس، رقم، بوصة، سم)';

