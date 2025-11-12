# إعدادات Supabase URL Configuration

## ✅ Redirect URLs (صحيحة)

```
nemu://auth/callback
http://localhost:8081/auth/callback
exp://localhost:8081
```

## ⚠️ Site URL (يحتاج تعديل)

### الحالي:
```
http://localhost:3000
```

### يجب أن يكون:
```
http://localhost:8081
```

**السبب**: التطبيق يعمل على المنفذ 8081 وليس 3000.

---

## 📝 خطوات التعديل

1. اذهب إلى: https://supabase.com/dashboard/project/fdxxynnsxgiozaiiexlm/auth/url-configuration
2. غير **Site URL** من `http://localhost:3000` إلى `http://localhost:8081`
3. اضغط **Save changes**

---

## ✅ بعد التعديل

- Site URL: `http://localhost:8081` ✅
- Redirect URLs: 3 URLs ✅
- جاهز للاختبار! ✅

