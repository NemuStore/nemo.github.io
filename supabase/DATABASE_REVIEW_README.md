# مراجعة قاعدة البيانات - Database Review

## الملفات المتوفرة

### 1. `verify_rls_policies.sql`
هذا الملف يحتوي على استعلامات SQL للتحقق من:
- RLS policies لجميع الجداول المهمة (`product_images`, `product_variants`, `products`, `users`)
- حالة RLS (مفعّل/معطّل) لكل جدول
- عدد المستخدمين مع أدوار `admin` و `manager`
- عدد الصور والمتغيرات في قاعدة البيانات
- التحقق من وجود `auth.uid()` function

**كيفية الاستخدام:**
```bash
# في Supabase Dashboard > SQL Editor
# أو باستخدام psql
psql -h your-db-host -U postgres -d postgres -f verify_rls_policies.sql
```

### 2. `fix_rls_policies.sql`
هذا الملف يحتوي على SQL لإصلاح RLS policies لجدول `product_images`:
- حذف السياسات القديمة (إن وجدت)
- إنشاء سياسات جديدة محسّنة
- التأكد من تفعيل RLS

**كيفية الاستخدام:**
```bash
# في Supabase Dashboard > SQL Editor
# أو باستخدام psql
psql -h your-db-host -U postgres -d postgres -f fix_rls_policies.sql
```

## المشاكل الشائعة والحلول

### المشكلة 1: الصور لا تُحفظ (403 Forbidden)
**السبب:** RLS policies ترفض الإدراج لأن `auth.uid()` غير موجود أو المستخدم ليس لديه دور `admin`/`manager`.

**الحل:**
1. تأكد من أن المستخدم مسجل دخول بشكل صحيح
2. تحقق من أن المستخدم لديه دور `admin` أو `manager` في جدول `users`
3. شغّل `verify_rls_policies.sql` للتحقق من السياسات
4. إذا كانت السياسات غير صحيحة، شغّل `fix_rls_policies.sql`

### المشكلة 2: `getSession` يتعطل (timeout)
**السبب:** Supabase client لا يستطيع الحصول على الجلسة من `localStorage` أو من Supabase.

**الحل:**
1. تأكد من أن `localStorage` يعمل بشكل صحيح (في المتصفح)
2. تحقق من أن `EXPO_PUBLIC_SUPABASE_URL` و `EXPO_PUBLIC_SUPABASE_ANON_KEY` صحيحة
3. حاول تسجيل الخروج ثم تسجيل الدخول مرة أخرى

### المشكلة 3: الحقول والمتغيرات فارغة عند التعديل الكامل
**السبب:** البيانات لا تُحمّل من قاعدة البيانات بشكل صحيح.

**الحل:**
1. تحقق من أن `access_token` موجود وصالح
2. تحقق من أن RLS policies تسمح بالقراءة (`SELECT`)
3. راجع سجلات الكونسول للتحقق من أخطاء API

## التحقق من الصلاحيات

### التحقق من دور المستخدم:
```sql
SELECT id, email, role, full_name
FROM public.users
WHERE id = auth.uid();
```

### التحقق من RLS policies:
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'product_images';
```

### التحقق من عدد الصور:
```sql
SELECT 
  COUNT(*) as total_images,
  COUNT(DISTINCT product_id) as products_with_images,
  COUNT(CASE WHEN variant_id IS NULL THEN 1 END) as general_images,
  COUNT(CASE WHEN variant_id IS NOT NULL THEN 1 END) as variant_images
FROM public.product_images;
```

## ملاحظات مهمة

1. **RLS Policies**: جميع السياسات تتطلب أن يكون `auth.uid()` موجوداً وأن يكون المستخدم لديه دور `admin` أو `manager`.

2. **Access Token**: يجب أن يكون `access_token` موجوداً وصالحاً. إذا كان `access_token` غير موجود، سيتم استخدام `anon key`، مما سيؤدي إلى فشل RLS policies.

3. **Session Management**: Supabase client يحفظ الجلسة في `localStorage` تلقائياً. إذا كانت الجلسة منتهية الصلاحية، سيتم محاولة تحديثها تلقائياً.

4. **Error Handling**: جميع عمليات إدراج الصور الآن تتحقق من وجود `access_token` صالح قبل المحاولة.

## التحديثات الأخيرة

- ✅ إصلاح `getAccessToken` لاستخدام Supabase client أولاً
- ✅ إضافة تحقق من `access_token` قبل عمليات إدراج الصور
- ✅ إنشاء ملفات SQL للتحقق من RLS policies
- ✅ إضافة تحذيرات في الكونسول عند فشل المصادقة

