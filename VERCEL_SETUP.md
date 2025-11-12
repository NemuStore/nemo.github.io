# دليل النشر على Vercel

## الخطوات السريعة:

### 1. في صفحة Vercel (التي فتحتها):

1. اضغط **"Import Git Repository"**
2. اختر **"GitHub"** واختر repository: `NemuStore/nemo.github.io`
3. اضغط **"Import"**

### 2. إعدادات المشروع:

Vercel سيكتشف الإعدادات تلقائياً من `vercel.json`:
- **Build Command**: `npx expo export --platform web`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3. إضافة Environment Variables (مهم جداً):

في صفحة إعدادات المشروع، اذهب إلى **"Environment Variables"** وأضف:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_IMGBB_API_KEY=your_imgbb_api_key
EXPO_SUPABASE_TOKEN=your_supabase_access_token
```

**ملاحظة**: أضف هذه المتغيرات لجميع البيئات (Production, Preview, Development)

### 4. النشر:

1. اضغط **"Deploy"**
2. انتظر حتى ينتهي البناء (2-5 دقائق)
3. ستحصل على رابط مثل: `https://nemu-xxx.vercel.app`

## بعد النشر:

### 1. إضافة Domain في Supabase CORS:

1. اذهب إلى Supabase Dashboard → Settings → API
2. في قسم **CORS**, أضف domain Vercel:
   - `https://your-project.vercel.app`
   - `https://*.vercel.app` (لجميع subdomains)

### 2. اختبار الموقع:

- ✅ تسجيل الدخول
- ✅ عرض المنتجات
- ✅ إضافة للسلة
- ✅ إنشاء طلب
- ✅ لوحة الإدارة

## تحديث الموقع:

عند تحديث الكود:
1. ارفع التغييرات على GitHub
2. Vercel سيبني وينشر تلقائياً

## المميزات:

- ✅ Build تلقائي عند كل push
- ✅ Environment Variables محمية
- ✅ HTTPS مجاني
- ✅ CDN عالمي
- ✅ Preview deployments لكل PR

## الدعم:

إذا واجهت أي مشاكل:
- تحقق من Build Logs في Vercel Dashboard
- تأكد من إضافة جميع Environment Variables
- تحقق من CORS settings في Supabase

