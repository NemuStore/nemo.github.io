# دليل النشر - Nemu E-commerce

## رفع المشروع على GitHub

### 1. إنشاء Repository على GitHub

1. اذهب إلى [GitHub](https://github.com)
2. اضغط على **"+"** في الأعلى → **"New repository"**
3. اختر اسمًا للمشروع (مثل: `nemu-ecommerce`)
4. اختر **Public** أو **Private**
5. **لا** تضع علامة على "Initialize with README"
6. اضغط **"Create repository"**

### 2. ربط المشروع المحلي بـ GitHub

بعد إنشاء الـ repository، ستظهر لك تعليمات. نفّذ الأوامر التالية في Terminal:

```bash
cd /home/zero/Desktop/nemu

# أضف remote repository (استبدل YOUR_USERNAME و YOUR_REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# غير اسم الفرع إلى main (إذا كان master)
git branch -M main

# ارفع المشروع
git push -u origin main
```

## نشر الموقع على Vercel (موصى به)

### الطريقة 1: عبر Vercel Dashboard (أسهل)

1. اذهب إلى [Vercel](https://vercel.com)
2. سجّل حساب (يمكنك استخدام GitHub)
3. اضغط **"Add New Project"**
4. اختر الـ repository من GitHub
5. في **Environment Variables**، أضف:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_IMGBB_API_KEY`
   - `EXPO_SUPABASE_TOKEN`
6. اضغط **"Deploy"**

### الطريقة 2: عبر Vercel CLI

```bash
# ثبت Vercel CLI
npm i -g vercel

# سجّل الدخول
vercel login

# انشر المشروع
cd /home/zero/Desktop/nemu
vercel

# اتبع التعليمات وأضف Environment Variables
```

## نشر الموقع على Netlify

### الطريقة 1: عبر Netlify Dashboard

1. اذهب إلى [Netlify](https://netlify.com)
2. سجّل حساب (يمكنك استخدام GitHub)
3. اضغط **"Add new site"** → **"Import an existing project"**
4. اختر الـ repository من GitHub
5. في **Build settings**:
   - Build command: `npx expo export:web`
   - Publish directory: `web-build`
6. في **Environment variables**، أضف المتغيرات
7. اضغط **"Deploy site"**

### الطريقة 2: عبر Netlify CLI

```bash
# ثبت Netlify CLI
npm i -g netlify-cli

# سجّل الدخول
netlify login

# انشر المشروع
cd /home/zero/Desktop/nemu
netlify deploy --prod

# أضف Environment Variables في Netlify Dashboard
```

## ملاحظات مهمة

### 1. Environment Variables

تأكد من إضافة جميع المتغيرات في منصة النشر:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_IMGBB_API_KEY`
- `EXPO_SUPABASE_TOKEN` (للمهام الإدارية فقط)

### 2. Build Settings

- **Build Command**: `npx expo export:web`
- **Output Directory**: `web-build`
- **Node Version**: 18 أو أحدث

### 3. CORS Settings

تأكد من إضافة domain الموقع في Supabase Dashboard:
- Settings → API → CORS
- أضف domain الموقع (مثل: `https://your-site.vercel.app`)

### 4. بعد النشر

بعد نشر الموقع:
1. اختبر جميع الوظائف
2. تأكد من عمل Authentication
3. تأكد من عمل رفع الصور
4. اختبر إدارة المنتجات والفئات

## التطوير المستقبلي

### لنشر تطبيق Android (Google Play):

1. سجّل حساب مطور على [Google Play Console](https://play.google.com/console)
2. استخدم Expo EAS Build:
   ```bash
   npm install -g eas-cli
   eas login
   eas build:android
   ```
3. ارفع الـ APK على Google Play Console

### لنشر تطبيق iOS (App Store):

1. سجّل حساب مطور على [Apple Developer](https://developer.apple.com)
2. استخدم Expo EAS Build:
   ```bash
   eas build:ios
   ```
3. ارفع الـ IPA على App Store Connect

## الدعم

إذا واجهت أي مشاكل، تحقق من:
- [Expo Documentation](https://docs.expo.dev)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)

