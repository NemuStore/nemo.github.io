# إعداد قاعدة البيانات - خطوات سريعة

## الخطوة 1: فتح SQL Editor في Supabase

1. اذهب إلى [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروعك: `fdxxynnsxgiozaiiexlm`
3. من القائمة الجانبية، اضغط على **SQL Editor**
4. اضغط على **New query**

## الخطوة 2: تنفيذ مخطط قاعدة البيانات

1. افتح ملف `supabase/schema.sql` من المشروع
2. انسخ **كل** محتوى الملف
3. الصق الكود في SQL Editor
4. اضغط على **Run** (أو Ctrl+Enter)

⚠️ **مهم**: تأكد من أن الكود تم تنفيذه بنجاح بدون أخطاء

## الخطوة 3: (اختياري) إضافة بيانات تجريبية

1. افتح ملف `supabase/seed.sql`
2. انسخ محتواه
3. الصق في SQL Editor واضغط Run

## الخطوة 4: إنشاء حساب أدمن

بعد إنشاء حساب من التطبيق:

1. اذهب إلى **Authentication** > **Users** في Supabase Dashboard
2. ابحث عن المستخدم الذي تريد جعله أدمن
3. انسخ الـ User ID

ثم في SQL Editor:

```sql
UPDATE public.users 
SET role = 'admin' 
WHERE id = 'user-id-here';
```

## التحقق من الإعداد

بعد تنفيذ الكود، تأكد من وجود الجداول التالية:

- ✅ users
- ✅ products
- ✅ orders
- ✅ order_items
- ✅ shipments
- ✅ shipment_orders
- ✅ inventory
- ✅ notifications

يمكنك التحقق من **Table Editor** في Supabase Dashboard.

## ملاحظات مهمة

- تأكد من تفعيل Row Level Security (RLS) - تم تفعيله تلقائياً في الكود
- Edge Functions تحتاج نشر منفصل (راجع SETUP.md)
- Service Role Key موجود في .env لكن لا تستخدمه في الكود الأمامي

