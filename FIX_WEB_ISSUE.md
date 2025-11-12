# إصلاح مشكلة Web Bundle

## المشكلة
```
Failed to load resource: the server responded with a status of 500
MIME type ('application/json') is not executable
```

## الحلول المطبقة

1. ✅ تحديث `tsconfig.json` لإضافة أنواع Expo
2. ✅ تحديث `metro.config.js` لدعم ملفات web
3. ✅ إنشاء `expo-env.d.ts`
4. ✅ تحديث `app.json` لإعدادات web

## كيفية التشغيل

### الطريقة 1: مع مسح الكاش
```bash
npx expo start --clear --web
```

### الطريقة 2: تشغيل عادي
```bash
npm start
# ثم اضغط 'w' للويب
```

### الطريقة 3: تشغيل مباشر للويب
```bash
npm run web
```

## إذا استمرت المشكلة

1. امسح الكاش بالكامل:
```bash
rm -rf .expo node_modules/.cache
npm start -- --clear
```

2. أعد تثبيت node_modules:
```bash
rm -rf node_modules
npm install --legacy-peer-deps
npm start
```

3. تأكد من أن المنفذ 8081 غير مستخدم:
```bash
lsof -ti:8081 | xargs kill -9
npm start
```

