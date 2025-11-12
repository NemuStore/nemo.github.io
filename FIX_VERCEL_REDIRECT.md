# إصلاح مشكلة Redirect إلى localhost في Vercel

## المشكلة:
بعد تسجيل الدخول، الموقع يحول المستخدم إلى `http://localhost:8081/profile` بدلاً من domain Vercel.

## الحل:

### 1. تم إصلاح الكود ✅
تم تحديث `app/auth.tsx` لاستخدام `window.location.origin` على الويب بدلاً من `Linking.createURL` الذي يعطي localhost.

### 2. إضافة Redirect URLs في Supabase (مهم!)

يجب إضافة domain Vercel في Supabase:

1. اذهب إلى: https://supabase.com/dashboard/project/fdxxynnsxgiozaiiexlm/auth/url-configuration

2. في قسم **Redirect URLs**، أضف:
   ```
   https://nemo-github-io.vercel.app/auth/callback
   https://nemo-github-io-*.vercel.app/auth/callback
   https://*.vercel.app/auth/callback
   ```

3. في قسم **Site URL**، غيّر إلى:
   ```
   https://nemo-github-io.vercel.app
   ```

4. اضغط **"Save changes"**

### 3. إعادة البناء في Vercel

بعد تحديث Supabase:

1. ارفع التغييرات على GitHub:
   ```bash
   git add .
   git commit -m "Fix redirect URL for Vercel"
   git push origin main
   ```

2. Vercel سيبني تلقائياً

3. أو يمكنك إعادة البناء يدوياً:
   - Vercel Dashboard → Deployments → ... → Redeploy

### 4. اختبار

بعد إعادة البناء:
1. افتح الموقع: https://nemo-github-io.vercel.app
2. سجّل الدخول
3. يجب أن يبقى على domain Vercel وليس localhost

## ملاحظات:

- **Site URL**: يجب أن يكون domain Vercel الرئيسي
- **Redirect URLs**: يجب أن تشمل جميع subdomains المحتملة
- **الكود**: الآن يستخدم `window.location.origin` تلقائياً على الويب

