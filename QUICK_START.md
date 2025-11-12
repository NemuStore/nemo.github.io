# 🚀 دليل البدء السريع

## ✅ الخطوة 1: إعداد قاعدة البيانات

### أ. افتح Supabase Dashboard
1. اذهب إلى: https://supabase.com/dashboard/project/fdxxynnsxgiozaiiexlm
2. اضغط على **SQL Editor** من القائمة الجانبية
3. اضغط على **New query**

### ب. نفذ مخطط قاعدة البيانات
1. افتح ملف `supabase/schema.sql` في المشروع
2. انسخ **كل** المحتوى (Ctrl+A ثم Ctrl+C)
3. الصق في SQL Editor
4. اضغط **Run** أو (Ctrl+Enter)

✅ **يجب أن ترى**: "Success. No rows returned"

### ج. (اختياري) أضف بيانات تجريبية
1. افتح `supabase/seed.sql`
2. انسخ المحتوى
3. الصق في SQL Editor واضغط Run

## ✅ الخطوة 2: تثبيت المتطلبات

```bash
npm install --legacy-peer-deps
```

## ✅ الخطوة 3: تشغيل التطبيق

```bash
npm start
```

ثم اختر:
- `i` للـ iOS
- `a` للـ Android  
- `w` للـ Web

## ✅ الخطوة 4: إنشاء حساب أدمن

1. سجل حساب جديد من التطبيق
2. اذهب إلى Supabase Dashboard > Authentication > Users
3. انسخ User ID الخاص بك
4. في SQL Editor، نفذ:

```sql
UPDATE public.users 
SET role = 'admin' 
WHERE id = 'your-user-id-here';
```

## ✅ الخطوة 5: (اختياري) نشر Edge Functions

إذا أردت استخدام Edge Functions (لإنشاء الطلبات تلقائياً):

```bash
# ثبت Supabase CLI
npm install -g supabase

# سجل الدخول
supabase login

# اربط المشروع
supabase link --project-ref fdxxynnsxgiozaiiexlm

# انشر الـ Functions
supabase functions deploy create-order
supabase functions deploy confirm-order
supabase functions deploy update-shipment-status
```

## 🎉 جاهز!

الآن يمكنك:
- ✅ تصفح المنتجات
- ✅ إضافة منتجات للسلة
- ✅ إنشاء طلبات
- ✅ إدارة الطلبات والشحنات (إذا كنت أدمن)

## 📝 ملاحظات

- ملف `.env` جاهز ومضبوط ✅
- قاعدة البيانات تحتاج إعداد من Supabase Dashboard
- Edge Functions اختيارية (الكود يعمل بدونها لكن بطرق بديلة)

