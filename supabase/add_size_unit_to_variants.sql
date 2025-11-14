-- ============================================
-- إضافة حقل وحدة القياس للمقاسات (Size Unit)
-- ============================================

-- إضافة حقل size_unit لتحديد وحدة القياس
ALTER TABLE public.product_variants 
ADD COLUMN IF NOT EXISTS size_unit TEXT NULL;

-- تحديث التعليقات
COMMENT ON COLUMN public.product_variants.size IS 'المقاس (S, M, L, XL, 40, 41, 42, 100x200, إلخ)';
COMMENT ON COLUMN public.product_variants.size_unit IS 'وحدة القياس (مقاس، رقم، بوصة، سم، إلخ) - اختياري';

-- ملاحظات:
-- 1. size_unit يمكن أن يكون: "مقاس" (S/M/L), "رقم" (40/41/42), "بوصة" (32/40), "سم" (100x200), إلخ
-- 2. إذا كان size_unit = NULL، يتم عرض size فقط بدون وحدة
-- 3. في الواجهة، يمكن عرض: "مقاس L" أو "رقم 42" أو "32 بوصة" أو "100x200 سم"

