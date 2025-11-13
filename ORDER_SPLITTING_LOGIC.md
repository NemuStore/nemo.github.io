# منطق فصل الطلبات حسب المصدر

## 📋 المطلوب

عندما يطلب العميل منتجات من **المخزن الداخلي** ومنتجات **مطلوبة من الخارج**، يجب فصلها إلى:
1. **طلب منفصل للمنتجات الداخلية** (`source_type = 'warehouse'`)
2. **طلب منفصل للمنتجات الخارجية** (`source_type = 'external'`)

---

## 🔄 منطق العمل

### 1. عند إتمام الطلب (Checkout)

```typescript
// في cart.tsx - confirmOrder function

// 1. فصل المنتجات حسب source_type
const warehouseItems = cartItems.filter(item => item.product.source_type === 'warehouse');
const externalItems = cartItems.filter(item => item.product.source_type === 'external');

// 2. إنشاء طلب للمنتجات الداخلية (إن وجدت)
if (warehouseItems.length > 0) {
  const warehouseOrder = await createOrder({
    items: warehouseItems,
    source_type: 'warehouse',
    // ... باقي البيانات
  });
}

// 3. إنشاء طلب للمنتجات الخارجية (إن وجدت)
if (externalItems.length > 0) {
  const externalOrder = await createOrder({
    items: externalItems,
    source_type: 'external',
    // ... باقي البيانات
  });
}

// 4. ربط الطلبين (اختياري) - parent_order_id
// يمكن ربطهما بطلب رئيسي أو تركهما منفصلين
```

---

## 📊 التغييرات المطلوبة

### أ. في `app/(tabs)/cart.tsx`

```typescript
const confirmOrder = async () => {
  // ... الكود الحالي للحصول على الموقع والعنوان
  
  // فصل المنتجات حسب المصدر
  const warehouseItems = cartItems.filter(item => 
    item.product.source_type === 'warehouse'
  );
  const externalItems = cartItems.filter(item => 
    item.product.source_type === 'external'
  );
  
  const orders = [];
  
  // إنشاء طلب للمنتجات الداخلية
  if (warehouseItems.length > 0) {
    const warehouseTotal = warehouseItems.reduce((sum, item) => 
      sum + (item.product.price * item.quantity), 0
    );
    
    const warehouseOrder = await createOrder({
      user_id: user.id,
      items: warehouseItems,
      total_amount: warehouseTotal,
      source_type: 'warehouse',
      shipping_address: address,
      latitude: location?.latitude,
      longitude: location?.longitude,
    });
    
    orders.push(warehouseOrder);
  }
  
  // إنشاء طلب للمنتجات الخارجية
  if (externalItems.length > 0) {
    const externalTotal = externalItems.reduce((sum, item) => 
      sum + (item.product.price * item.quantity), 0
    );
    
    const externalOrder = await createOrder({
      user_id: user.id,
      items: externalItems,
      total_amount: externalTotal,
      source_type: 'external',
      shipping_address: address,
      latitude: location?.latitude,
      longitude: location?.longitude,
    });
    
    orders.push(externalOrder);
  }
  
  // ربط الطلبين (اختياري)
  if (orders.length === 2) {
    // ربط الطلب الثاني بالأول
    await updateOrder(orders[1].id, {
      parent_order_id: orders[0].id
    });
  }
  
  // إظهار رسالة للعميل
  if (orders.length === 2) {
    Alert.alert(
      'تم إنشاء الطلبين',
      `تم إنشاء طلبين منفصلين:\n- طلب من المخزن: ${orders[0].order_number}\n- طلب من الخارج: ${orders[1].order_number}`
    );
  } else {
    Alert.alert('تم إنشاء الطلب', `رقم الطلب: ${orders[0].order_number}`);
  }
  
  clearCart();
};
```

---

### ب. في `app/(tabs)/admin.tsx` - نموذج إضافة المنتج

```typescript
// إضافة حقل source_type
const [newProduct, setNewProduct] = useState({
  name: '',
  description: '',
  price: '',
  original_price: '',
  discount_percentage: '',
  category_id: '',
  category: '',
  stock_quantity: '',
  source_type: 'warehouse', // 'warehouse' أو 'external'
  sku: '', // كود المنتج الفريد
  // ... باقي الحقول
});

// في النموذج:
<View style={styles.selectContainer}>
  <Text style={styles.selectLabel}>مصدر المنتج:</Text>
  <View style={styles.radioGroup}>
    <TouchableOpacity
      style={[styles.radioOption, newProduct.source_type === 'warehouse' && styles.radioOptionActive]}
      onPress={() => setNewProduct({ ...newProduct, source_type: 'warehouse' })}
    >
      <Ionicons 
        name={newProduct.source_type === 'warehouse' ? 'radio-button-on' : 'radio-button-off'} 
        size={20} 
        color={newProduct.source_type === 'warehouse' ? '#EE1C47' : '#666'} 
      />
      <Text>من المخزن الداخلي</Text>
    </TouchableOpacity>
    
    <TouchableOpacity
      style={[styles.radioOption, newProduct.source_type === 'external' && styles.radioOptionActive]}
      onPress={() => setNewProduct({ ...newProduct, source_type: 'external' })}
    >
      <Ionicons 
        name={newProduct.source_type === 'external' ? 'radio-button-on' : 'radio-button-off'} 
        size={20} 
        color={newProduct.source_type === 'external' ? '#EE1C47' : '#666'} 
      />
      <Text>طلب من الخارج</Text>
    </TouchableOpacity>
  </View>
</View>

// إخفاء حقل المخزون إذا كان المنتج من الخارج
{newProduct.source_type === 'warehouse' && (
  <TextInput
    style={styles.input}
    placeholder="الكمية في المخزن"
    value={newProduct.stock_quantity}
    onChangeText={(text) => setNewProduct({ ...newProduct, stock_quantity: text })}
    keyboardType="numeric"
  />
)}

// حقل SKU (مطلوب وفريد)
<TextInput
  style={styles.input}
  placeholder="كود المنتج (SKU) *"
  value={newProduct.sku}
  onChangeText={(text) => setNewProduct({ ...newProduct, sku: text })}
  required
/>
<Text style={styles.helpText}>
  ⚠️ الكود يجب أن يكون فريداً ولا يتكرر
</Text>
```

---

### ج. في صفحة المنتج - إخفاء SKU

```typescript
// في app/product/[id].tsx
// لا تعرض SKU للعملاء - فقط للإدارة
// يمكن عرضه فقط في لوحة الإدارة
```

---

## 🎯 ملخص التغييرات

### 1. قاعدة البيانات ✅
- ✅ إضافة `source_type` في `products`
- ✅ إضافة `sku` فريد في `products`
- ✅ إضافة `source_type` و `parent_order_id` في `orders`

### 2. واجهة الإدارة
- ⏳ إضافة اختيار مصدر المنتج
- ⏳ إخفاء حقل المخزون للمنتجات الخارجية
- ⏳ إضافة حقل SKU (مطلوب)

### 3. منطق الطلبات
- ⏳ فصل المنتجات حسب `source_type`
- ⏳ إنشاء طلبين منفصلين
- ⏳ ربط الطلبين (اختياري)

### 4. واجهة العملاء
- ⏳ إخفاء SKU من صفحة المنتج
- ⏳ إظهار رسالة عند فصل الطلبات

---

## 📝 ملاحظات مهمة

1. **SKU فريد:** يجب التحقق من عدم التكرار قبل الحفظ
2. **المخزون:** المنتجات الخارجية لا تحتاج `stock_quantity` (يمكن أن يكون 0 أو null)
3. **الطلبات:** يمكن ربط الطلبين بـ `parent_order_id` أو تركهما منفصلين
4. **التوافق:** الطلبات القديمة سيكون `source_type = null`

