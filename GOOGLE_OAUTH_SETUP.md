# إعداد تسجيل الدخول بجوجل - دليل كامل

## ✅ الخطوة 1: Google Cloud Console (تم ✅)

### Authorised JavaScript origins:
```
https://fdxxynnsxgiozaiiexlm.supabase.co
http://localhost:8081 (اختياري للويب)
```

### Authorised redirect URIs:
```
https://fdxxynnsxgiozaiiexlm.supabase.co/auth/v1/callback
```

**ملاحظة**: قد يستغرق من 5 دقائق إلى ساعات قليلة حتى تصبح الإعدادات فعالة.

---

## ✅ الخطوة 2: Supabase Dashboard

### أ. تفعيل Google Provider

1. اذهب إلى: https://supabase.com/dashboard/project/fdxxynnsxgiozaiiexlm/auth/providers
2. اضغط على **Google**
3. فعّل **Enable Google provider**
4. أضف:
   - **Client ID (for OAuth)**: من Google Cloud Console
   - **Client Secret (for OAuth)**: من Google Cloud Console
5. اضغط **Save**

### ب. إضافة Redirect URLs

1. اذهب إلى: https://supabase.com/dashboard/project/fdxxynnsxgiozaiiexlm/auth/url-configuration
2. في قسم **Redirect URLs**، أضف:
   ```
   nemu://auth/callback
   http://localhost:8081/auth/callback
   exp://localhost:8081
   ```
3. اضغط **Save**

---

## ✅ الخطوة 3: اختبار

1. افتح التطبيق: http://localhost:8081
2. اضغط على "تسجيل الدخول بجوجل"
3. يجب أن يفتح نافذة جوجل للموافقة
4. بعد الموافقة، سيتم تسجيل الدخول تلقائياً

---

## 🔧 استكشاف الأخطاء

### خطأ: redirect_uri_mismatch
- تأكد من أن Redirect URI في Google Cloud Console يطابق تماماً: `https://fdxxynnsxgiozaiiexlm.supabase.co/auth/v1/callback`
- انتظر 5-10 دقائق بعد التعديل

### خطأ: invalid_client
- تأكد من صحة Client ID و Client Secret في Supabase
- تأكد من تفعيل Google Provider

### لا يفتح نافذة جوجل
- تأكد من إضافة Redirect URLs في Supabase
- تحقق من Console للأخطاء

---

## 📝 ملاحظات

- **Client ID** و **Client Secret** موجودان في Google Cloud Console > APIs & Services > Credentials
- **Redirect URLs** في Supabase يجب أن تطابق ما في Google Cloud Console
- قد يستغرق بعض الوقت حتى تصبح التغييرات فعالة

