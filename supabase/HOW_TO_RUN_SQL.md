# كيفية تشغيل ملفات SQL في Supabase

## الخطوة 1: فتح Supabase Dashboard

1. اذهب إلى [Supabase Dashboard](https://app.supabase.com)
2. اختر المشروع الخاص بك
3. من القائمة الجانبية، اضغط على **SQL Editor**

## الخطوة 2: تشغيل ملف التحقق من RLS Policies

1. في SQL Editor، اضغط على **New Query**
2. انسخ محتوى ملف `verify_rls_policies.sql` والصقه في المحرر
3. اضغط على **Run** (أو `Ctrl+Enter`)
4. راجع النتائج للتأكد من:
   - وجود RLS policies لجميع الجداول
   - أن RLS مفعّل لجميع الجداول
   - أن لديك مستخدمين بدور `admin` أو `manager`

## الخطوة 3: إصلاح RLS Policies (إذا لزم الأمر)

إذا كانت النتائج تظهر أن RLS policies غير صحيحة أو مفقودة:

1. في SQL Editor، اضغط على **New Query**
2. انسخ محتوى ملف `fix_rls_policies.sql` والصقه في المحرر
3. اضغط على **Run** (أو `Ctrl+Enter`)
4. تأكد من عدم وجود أخطاء

## الخطوة 4: التحقق من دور المستخدم

لتأكد من أن حسابك لديه دور `admin` أو `manager`:

```sql
-- استبدل YOUR_USER_ID بـ ID حسابك
SELECT id, email, role, full_name
FROM public.users
WHERE id = 'YOUR_USER_ID';
```

أو للتحقق من جميع المستخدمين:

```sql
SELECT id, email, role, full_name
FROM public.users
WHERE role IN ('admin', 'manager');
```

## ملاحظات مهمة

- تأكد من أنك مسجل دخول بحساب لديه صلاحيات `admin` في Supabase
- إذا لم يكن لديك دور `admin` أو `manager`، اطلب من مدير المشروع تغيير دورك
- بعد تشغيل `fix_rls_policies.sql`، جرب حفظ الصور مرة أخرى في لوحة الإدارة

