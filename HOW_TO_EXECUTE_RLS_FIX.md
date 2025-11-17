# كيفية تنفيذ إصلاح RLS Policies لجدول product_images

## الطريقة 1: استخدام Supabase Dashboard (الأسهل) ✅

1. افتح Supabase Dashboard:
   - اذهب إلى: https://supabase.com/dashboard/project/fdxxynnsxgiozaiiexlm/sql/new

2. انسخ محتوى ملف `supabase/fix_product_images_rls_final.sql`

3. الصق الكود في SQL Editor

4. اضغط على "Run" أو "Execute"

5. تحقق من النتيجة - يجب أن ترى:
   - ✅ DROP POLICY (4 مرات)
   - ✅ CREATE FUNCTION
   - ✅ CREATE POLICY (4 مرات)
   - ✅ ALTER TABLE
   - ✅ SELECT (عرض السياسات)

---

## الطريقة 2: استخدام Supabase CLI

إذا كان لديك Supabase CLI مثبت:

```bash
supabase db execute -f supabase/fix_product_images_rls_final.sql
```

---

## ما الذي سيتم إصلاحه؟

1. ✅ حذف السياسات القديمة
2. ✅ التأكد من وجود `variant_id` column
3. ✅ إنشاء/تحديث دالة `is_admin_or_manager()`
4. ✅ إنشاء سياسات جديدة تستخدم الدالة
5. ✅ تفعيل RLS

---

## بعد التنفيذ

1. جرّب إضافة منتج جديد مع صور
2. جرّب إضافة متغيرات مع صور
3. تحقق من أن جميع الصور تُحفظ في `product_images` بدون أخطاء 403

---

## ملاحظات

- الدالة `is_admin_or_manager()` تستخدم `SECURITY DEFINER` لتجاوز RLS
- هذا يضمن العمل مع Supabase client و REST API
- يجب أن يكون المستخدم لديه دور 'admin' أو 'manager' في جدول `users`

