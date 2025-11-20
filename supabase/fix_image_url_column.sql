-- ============================================
-- إصلاح: جعل image_url nullable ثم حذفه
-- ============================================
-- 
-- 📋 تعليمات التشغيل:
-- 1. افتح Supabase Dashboard → SQL Editor
-- 2. انسخ والصق هذا الكود
-- 3. اضغط Run
-- ============================================

BEGIN;

-- Step 1: جعل عمود image_url nullable (إزالة قيد NOT NULL)
ALTER TABLE public.products 
  ALTER COLUMN image_url DROP NOT NULL;

-- Step 2: حذف عمود image_url تماماً
ALTER TABLE public.products 
  DROP COLUMN IF EXISTS image_url;

-- Step 3: التحقق من الحذف
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'products' 
      AND column_name = 'image_url'
  ) THEN
    RAISE WARNING '⚠️ فشل حذف عمود image_url';
  ELSE
    RAISE NOTICE '✅ تم حذف عمود image_url من جدول products بنجاح';
  END IF;
END $$;

COMMIT;

-- ============================================
-- ✅ تم الإصلاح!
-- ============================================
-- الآن يمكنك إضافة منتجات جديدة بدون مشاكل
-- ============================================

