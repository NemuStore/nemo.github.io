# إصلاح مشكلة Environment Variables في Vercel

## المشكلة:
الموقع يعرض خطأ: "Missing Supabase environment variables"

## الحل:

### الخطوة 1: إضافة Environment Variables في Vercel

1. اذهب إلى: https://vercel.com/dashboard
2. اختر مشروعك: **`nemo-github-io`**
3. اضغط على **"Settings"** (في الأعلى)
4. اضغط على **"Environment Variables"** (في القائمة الجانبية)

### الخطوة 2: أضف المتغيرات التالية:

#### 1. EXPO_PUBLIC_SUPABASE_URL
- **Key**: `EXPO_PUBLIC_SUPABASE_URL`
- **Value**: `https://fdxxynnsxgiozaiiexlm.supabase.co`
- **Environment**: ✅ Production, ✅ Preview, ✅ Development
- اضغط **"Save"**

#### 2. EXPO_PUBLIC_SUPABASE_ANON_KEY
- **Key**: `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkeHh5bm5zeGdpb3phaWlleGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MTUxMDcsImV4cCI6MjA3ODM5MTEwN30.1YW6uu973Zh0P3ElnCTyxdg4cqN7a1KAlyPJkup2fN8`
- **Environment**: ✅ Production, ✅ Preview, ✅ Development
- اضغط **"Save"**

#### 3. EXPO_PUBLIC_IMGBB_API_KEY
- **Key**: `EXPO_PUBLIC_IMGBB_API_KEY`
- **Value**: `cfbb69eef89f4ad826855a221bcde9ee`
- **Environment**: ✅ Production, ✅ Preview, ✅ Development
- اضغط **"Save"**

#### 4. EXPO_SUPABASE_TOKEN
- **Key**: `EXPO_SUPABASE_TOKEN`
- **Value**: `sbp_2472ff9d3a64cb005f321cba70a788c7a8e30d98`
- **Environment**: ✅ Production, ✅ Preview, ✅ Development
- اضغط **"Save"**

### الخطوة 3: إعادة البناء (Redeploy)

بعد إضافة جميع المتغيرات:

1. اذهب إلى **"Deployments"** (في القائمة الجانبية)
2. اضغط على **"..."** بجانب آخر deployment
3. اختر **"Redeploy"**
4. تأكد من اختيار **"Use existing Build Cache"** = ❌ (غير مفعّل)
5. اضغط **"Redeploy"**

أو يمكنك:
- ارفع أي تغيير بسيط على GitHub
- Vercel سيبني تلقائياً مع المتغيرات الجديدة

### الخطوة 4: التحقق

بعد إعادة البناء:
1. انتظر حتى ينتهي البناء (2-5 دقائق)
2. افتح الموقع: https://nemo-github-io.vercel.app
3. يجب أن يعمل الآن بدون أخطاء

## ملاحظات مهمة:

1. **EXPO_PUBLIC_***: هذه المتغيرات يجب أن تبدأ بـ `EXPO_PUBLIC_` لتكون متاحة في المتصفح
2. **جميع البيئات**: أضف المتغيرات لـ Production, Preview, و Development
3. **إعادة البناء**: بعد إضافة المتغيرات، يجب إعادة البناء

## إذا استمرت المشكلة:

1. تحقق من **Deployment Logs**:
   - اذهب إلى Deployments → آخر deployment → Logs
   - تأكد من أن المتغيرات موجودة في Build

2. تحقق من أن المتغيرات مضافة بشكل صحيح:
   - Settings → Environment Variables
   - تأكد من أن جميع المتغيرات موجودة

3. جرب إعادة البناء مرة أخرى:
   - Deployments → ... → Redeploy

