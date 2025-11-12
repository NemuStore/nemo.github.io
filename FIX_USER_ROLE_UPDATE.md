# إصلاح مشكلة تغيير دور المستخدم

## المشكلة:
عند تغيير دور المستخدم، يظهر تأكيد لكن لا يتم التغيير فعلياً.

## الحل:

### 1. تم إضافة Logging مفصل ✅
تم تحديث الكود لإضافة logging مفصل لتتبع المشكلة.

### 2. التحقق من RLS Policy في Supabase

يجب التأكد من وجود RLS Policy للسماح بتحديث `users` table:

1. اذهب إلى: https://supabase.com/dashboard/project/fdxxynnsxgiozaiiexlm/editor
2. ابحث عن جدول `users`
3. اذهب إلى **"Policies"** tab
4. تحقق من وجود policy اسمها: **"Admins can update user roles"**

إذا لم تكن موجودة، نفّذ SQL التالي:

```sql
-- Add policy to allow admins to update user roles
CREATE POLICY "Admins can update user roles" ON public.users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );
```

### 3. التحقق من Console Logs

بعد تحديث الكود:
1. افتح Developer Console (F12)
2. جرب تغيير دور مستخدم
3. تحقق من الـ logs:
   - `🔄 Updating user role:` - يجب أن يظهر userId و newRole
   - `📡 Response status:` - يجب أن يكون 200 أو 204
   - `✅ Updated user data:` - يجب أن يظهر البيانات المحدثة

### 4. إذا استمرت المشكلة:

#### أ. تحقق من Access Token:
- في Console، تحقق من `🔑 Using access token: Yes`
- إذا كان `No`، المشكلة في JWT refresh

#### ب. تحقق من Response:
- إذا كان `Response status: 401` → مشكلة في Authentication
- إذا كان `Response status: 403` → مشكلة في RLS Policy
- إذا كان `Response status: 200` لكن البيانات لم تتغير → مشكلة في الـ policy

#### ج. تحقق من RLS Policy:
- تأكد من أن المستخدم الحالي لديه role 'admin' أو 'manager'
- تأكد من أن الـ policy تعمل بشكل صحيح

### 5. حل بديل: استخدام Service Role Key

إذا استمرت المشكلة، يمكن استخدام Service Role Key (فقط للإدارة):

```typescript
// في performUpdateUserRole، استخدم service_role بدلاً من access_token
const serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
// لكن هذا غير آمن للاستخدام في frontend!
```

**ملاحظة**: Service Role Key يجب أن يكون في backend فقط، ليس في frontend!

## الخطوات التالية:

1. ✅ تم تحديث الكود مع logging مفصل
2. ⏳ انتظر build في Vercel
3. 🔍 افتح Console واختبر تغيير الدور
4. 📋 أرسل الـ logs إذا استمرت المشكلة

