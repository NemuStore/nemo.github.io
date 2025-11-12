# خطوات رفع المشروع على Vercel - دليل شامل

## الخطوة 1: التحضير

✅ المشروع موجود على GitHub: `NemuStore/nemo.github.io`
✅ ملف `vercel.json` موجود ومعد بشكل صحيح
✅ ملف `.env` موجود محلياً (لن يُرفع على GitHub)

## الخطوة 2: إنشاء حساب على Vercel

1. اذهب إلى: https://vercel.com
2. اضغط **"Sign Up"**
3. اختر **"Continue with GitHub"** (أسهل طريقة)
4. سجّل الدخول بحساب GitHub الخاص بك
5. امنح Vercel صلاحيات الوصول إلى repositories

## الخطوة 3: ربط المشروع

### الطريقة 1: من Vercel Dashboard (موصى به)

1. بعد تسجيل الدخول، اضغط **"Add New Project"** أو **"New Project"**
2. ستظهر قائمة بـ repositories الخاصة بك
3. ابحث عن: **`NemuStore/nemo.github.io`**
4. اضغط **"Import"** بجانب المشروع

### الطريقة 2: من رابط مباشر

1. اذهب إلى: https://vercel.com/new
2. اختر **"Import Git Repository"**
3. اختر **"GitHub"**
4. ابحث عن `NemuStore/nemo.github.io`
5. اضغط **"Import"**

## الخطوة 4: إعدادات المشروع

Vercel سيكتشف الإعدادات تلقائياً من `vercel.json`:

- **Project Name**: `nemo-github-io` (يمكنك تغييره)
- **Framework Preset**: Other (أو Expo)
- **Root Directory**: `./` (افتراضي)
- **Build Command**: `npx expo export --platform web` ✅ (يتم اكتشافه)
- **Output Directory**: `dist` ✅ (يتم اكتشافه)
- **Install Command**: `npm install` (افتراضي)

**لا تغير أي شيء** - الإعدادات صحيحة!

## الخطوة 5: إضافة Environment Variables (مهم جداً!)

**قبل الضغط على "Deploy"**، اضغط على **"Environment Variables"**:

### أضف المتغيرات التالية:

1. **EXPO_PUBLIC_SUPABASE_URL**
   - Value: `https://fdxxynnsxgiozaiiexlm.supabase.co`
   - Environment: ✅ Production, ✅ Preview, ✅ Development

2. **EXPO_PUBLIC_SUPABASE_ANON_KEY**
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkeHh5bm5zeGdpb3phaWlleGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MTUxMDcsImV4cCI6MjA3ODM5MTEwN30.1YW6uu973Zh0P3ElnCTyxdg4cqN7a1KAlyPJkup2fN8`
   - Environment: ✅ Production, ✅ Preview, ✅ Development

3. **EXPO_PUBLIC_IMGBB_API_KEY**
   - Value: `cfbb69eef89f4ad826855a221bcde9ee`
   - Environment: ✅ Production, ✅ Preview, ✅ Development

4. **EXPO_SUPABASE_TOKEN**
   - Value: `sbp_2472ff9d3a64cb005f321cba70a788c7a8e30d98`
   - Environment: ✅ Production, ✅ Preview, ✅ Development

**ملاحظة مهمة**: أضف كل متغير لجميع البيئات (Production, Preview, Development)

## الخطوة 6: النشر

1. بعد إضافة جميع Environment Variables
2. اضغط **"Deploy"**
3. انتظر حتى ينتهي البناء (2-5 دقائق)
4. ستحصل على رابط مثل: `https://nemo-github-io.vercel.app`

## الخطوة 7: إعداد CORS في Supabase

بعد النشر، يجب إضافة domain Vercel في Supabase:

1. اذهب إلى: https://supabase.com/dashboard
2. اختر مشروعك
3. اذهب إلى **Settings** → **API**
4. في قسم **CORS**, أضف:
   - `https://your-project.vercel.app`
   - `https://*.vercel.app` (لجميع subdomains)
5. اضغط **"Save"**

## الخطوة 8: اختبار الموقع

بعد النشر، اختبر:
- ✅ فتح الموقع
- ✅ تسجيل الدخول
- ✅ عرض المنتجات
- ✅ إضافة للسلة
- ✅ إنشاء طلب
- ✅ لوحة الإدارة

## تحديث الموقع

عند تحديث الكود:
1. ارفع التغييرات على GitHub:
   ```bash
   git add .
   git commit -m "Update code"
   git push origin main
   ```
2. Vercel سيبني وينشر تلقائياً! 🎉

## المميزات الإضافية:

### Preview Deployments:
- كل Pull Request يحصل على رابط preview تلقائياً
- يمكنك اختبار التغييرات قبل دمجها

### Custom Domain:
- يمكنك إضافة domain مخصص
- اذهب إلى Project Settings → Domains
- أضف domain الخاص بك

### Analytics:
- Vercel يوفر إحصائيات مفصلة
- عدد الزوار، الأداء، إلخ

## الدعم:

إذا واجهت أي مشاكل:
1. تحقق من **Deployment Logs** في Vercel Dashboard
2. تأكد من إضافة جميع Environment Variables
3. تحقق من CORS settings في Supabase

