# ملخص المتطلبات الجديدة

## ✅ ما تم إضافته

### 1. قاعدة البيانات

#### أ. جدول `products`
```sql
-- حقل مصدر المنتج
source_type TEXT NOT NULL DEFAULT 'warehouse' 
  CHECK (source_type IN ('warehouse', 'external'))

-- كود المنتج الفريد
sku TEXT UNIQUE -- لا يتكرر أبداً
```

#### ب. جدول `orders`
```sql
-- نوع الطلب (داخلي أو خارجي)
source_type TEXT NULL 
  CHECK (source_type IN ('warehouse', 'external'))

-- ربط الطلبات (إذا كان الطلب جزء من طلب أكبر)
parent_order_id UUID NULL 
  REFERENCES orders(id)
```

---

### 2. TypeScript Types

#### أ. `ProductSource` Type
```typescript
export type ProductSource = 'warehouse' | 'external';
```

#### ب. تحديث `Product` Interface
```typescript
source_type: ProductSource; // 'warehouse' أو 'external'
sku: string | null; // كود فريد - لا يظهر للعملاء
```

#### ج. تحديث `Order` Interface
```typescript
source_type: ProductSource | null;
parent_order_id: string | null;
```

---

## 📋 ما يجب تنفيذه

### 1. في نموذج إضافة المنتج (`app/(tabs)/admin.tsx`)

#### أ. إضافة حقل "مصدر المنتج"
```typescript
// Radio buttons
○ من المخزن الداخلي
○ طلب من الخارج
```

#### ب. إضافة حقل "كود المنتج (SKU)"
```typescript
// TextInput - مطلوب وفريد
// التحقق من عدم التكرار قبل الحفظ
```

#### ج. إخفاء حقل "الكمية في المخزن"
```typescript
// يظهر فقط إذا كان source_type === 'warehouse'
{newProduct.source_type === 'warehouse' && (
  <TextInput placeholder="الكمية في المخزن" />
)}
```

---

### 2. في صفحة السلة (`app/(tabs)/cart.tsx`)

#### أ. فصل المنتجات عند إتمام الطلب
```typescript
const warehouseItems = cartItems.filter(
  item => item.product.source_type === 'warehouse'
);
const externalItems = cartItems.filter(
  item => item.product.source_type === 'external'
);
```

#### ب. إنشاء طلبين منفصلين
```typescript
// طلب للمنتجات الداخلية
if (warehouseItems.length > 0) {
  await createOrder({
    items: warehouseItems,
    source_type: 'warehouse',
    // ...
  });
}

// طلب للمنتجات الخارجية
if (externalItems.length > 0) {
  await createOrder({
    items: externalItems,
    source_type: 'external',
    // ...
  });
}
```

#### ج. إظهار رسالة للعميل
```typescript
if (orders.length === 2) {
  Alert.alert(
    'تم إنشاء الطلبين',
    'تم فصل طلبك إلى طلبين منفصلين حسب المصدر'
  );
}
```

---

### 3. في صفحة المنتج (`app/product/[id].tsx`)

#### أ. إخفاء SKU
```typescript
// لا تعرض SKU للعملاء
// يمكن عرضه فقط في لوحة الإدارة
```

---

### 4. في لوحة الإدارة - عرض الطلبات

#### أ. عرض نوع الطلب
```typescript
// بادج يوضح نوع الطلب
{order.source_type === 'warehouse' && (
  <Badge>من المخزن</Badge>
)}
{order.source_type === 'external' && (
  <Badge>من الخارج</Badge>
)}
```

#### ب. ربط الطلبات المرتبطة
```typescript
// إذا كان order.parent_order_id موجود
// أو إذا كان order.id موجود في parent_order_id لطلبات أخرى
// عرض رابط للطلب المرتبط
```

---

## 🔍 التحقق من SKU قبل الحفظ

```typescript
const checkSKUUnique = async (sku: string, productId?: string) => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const accessToken = await getAccessToken();

  let query = `${supabaseUrl}/rest/v1/products?sku=eq.${sku}&select=id`;
  
  // إذا كان تعديل منتج موجود، استثنيه من البحث
  if (productId) {
    query += `&id=neq.${productId}`;
  }

  const response = await fetch(query, {
    headers: {
      'apikey': supabaseKey || '',
      'Authorization': `Bearer ${accessToken}`,
    }
  });

  const data = await response.json();
  return data.length === 0; // true إذا كان فريداً
};

// في دالة addProduct/updateProduct
if (!await checkSKUUnique(newProduct.sku, editingProduct?.id)) {
  sweetAlert.showError('خطأ', 'كود المنتج مستخدم بالفعل. يرجى استخدام كود آخر.');
  return;
}
```

---

## 📝 ملاحظات مهمة

1. **SKU مطلوب:** يجب إدخاله عند إضافة أي منتج
2. **SKU فريد:** قاعدة البيانات تمنع التكرار (UNIQUE constraint)
3. **SKU مخفي:** لا يظهر للعملاء في أي مكان
4. **المخزون:** المنتجات الخارجية لا تحتاج `stock_quantity`
5. **الطلبات:** يتم فصلها تلقائياً حسب `source_type`
6. **التوافق:** المنتجات والطلبات القديمة سيكون `source_type = null` أو القيمة الافتراضية

---

## 🚀 خطوات التنفيذ

1. ✅ تحديث SQL (تم)
2. ✅ تحديث TypeScript Types (تم)
3. ⏳ تحديث نموذج إضافة المنتج
4. ⏳ تحديث منطق إنشاء الطلبات
5. ⏳ إخفاء SKU من واجهة العملاء
6. ⏳ تحديث عرض الطلبات في الإدارة

