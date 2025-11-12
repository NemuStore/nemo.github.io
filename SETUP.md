# دليل الإعداد الكامل

## 1. إعداد Supabase

### أ. إنشاء المشروع
1. اذهب إلى [Supabase](https://supabase.com) وأنشئ حساب جديد
2. أنشئ مشروع جديد
3. انتظر حتى يكتمل الإعداد

### ب. إعداد قاعدة البيانات
1. اذهب إلى SQL Editor في Supabase Dashboard
2. انسخ محتوى ملف `supabase/schema.sql`
3. الصق الكود في SQL Editor واضغط Run
4. تأكد من نجاح التنفيذ

### ج. إعداد Edge Functions
1. ثبت Supabase CLI:
```bash
npm install -g supabase
```

2. سجل الدخول:
```bash
supabase login
```

3. اربط المشروع:
```bash
supabase link --project-ref your-project-ref
```

4. انشر الـ Functions:
```bash
supabase functions deploy create-order
supabase functions deploy confirm-order
supabase functions deploy update-shipment-status
```

### د. الحصول على المفاتيح
1. اذهب إلى Settings > API
2. انسخ:
   - Project URL → `EXPO_PUBLIC_SUPABASE_URL`
   - anon/public key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## 2. إعداد ImgBB API

1. اذهب إلى [ImgBB](https://imgbb.com)
2. سجل دخول أو أنشئ حساب
3. اذهب إلى API section
4. احصل على API Key
5. ضعها في `.env` كـ `EXPO_PUBLIC_IMGBB_API_KEY`

## 3. إعداد المتغيرات البيئية

أنشئ ملف `.env` في المجلد الرئيسي:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_IMGBB_API_KEY=your-imgbb-key
```

## 4. تثبيت المتطلبات

```bash
npm install
```

## 5. تشغيل التطبيق

```bash
# تطوير
npm start

# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## 6. إنشاء حساب أدمن

بعد إعداد قاعدة البيانات، يمكنك إنشاء حساب أدمن من SQL Editor:

```sql
-- أولاً أنشئ حساب في Auth
-- ثم عدل الدور:
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'your-admin-email@example.com';
```

## 7. اختبار التطبيق

1. سجل حساب جديد كعميل
2. أضف منتجات من لوحة الإدارة (يجب أن تكون أدمن)
3. جرب إضافة منتجات للسلة
4. أنشئ طلب
5. اختبر تدفق الشحنات من لوحة الإدارة

## ملاحظات مهمة

- تأكد من تفعيل Row Level Security (RLS) في Supabase
- الصور تُرفع على ImgBB لتوفير المساحة
- الإشعارات تعمل عبر Supabase Realtime
- الموقع يُسحب تلقائياً عند تأكيد الطلب

## استكشاف الأخطاء

### مشكلة في الاتصال بـ Supabase
- تأكد من صحة المفاتيح في `.env`
- تأكد من تفعيل RLS Policies

### مشكلة في رفع الصور
- تأكد من صحة ImgBB API Key
- تأكد من تفعيل CORS في ImgBB

### مشكلة في Edge Functions
- تأكد من نشر الـ Functions بشكل صحيح
- تحقق من Logs في Supabase Dashboard

