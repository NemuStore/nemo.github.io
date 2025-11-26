-- ============================================
-- إضافة عمود strikethrough_price لجدول products
-- ============================================

-- إضافة عمود الرقم المشطوب عليه
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS strikethrough_price NUMERIC(10, 2) NULL; -- الرقم المشطوب عليه (يدوي بالجنيه المصري)

-- ملاحظات:
-- 1. strikethrough_price: الرقم المشطوب عليه (يدوي بالجنيه المصري)
-- 2. يتم حساب نسبة الخصم تلقائياً من strikethrough_price و selling_price_egp
-- 3. strikethrough_price يجب أن يكون أعلى من selling_price_egp

