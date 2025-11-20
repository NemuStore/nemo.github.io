/**
 * 🔍 سكريبت تشخيص مشكلة حفظ المتغيرات
 * 
 * استخدم هذا السكريبت لفحص حالة قاعدة البيانات والتحقق من المشاكل
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_ACCESS_TOKEN = process.env.EXPO_SUPABASE_TOKEN;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   - EXPO_SUPABASE_TOKEN:', SUPABASE_ACCESS_TOKEN ? '✅' : '❌');
  console.error('   - EXPO_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('   - EXPO_PUBLIC_SUPABASE_ANON_KEY:', SUPABASE_KEY ? '✅' : '❌');
  process.exit(1);
}

const projectRef = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('❌ Could not extract project reference from Supabase URL');
  process.exit(1);
}

console.log('🔍 Starting diagnostic checks...\n');
console.log('📋 Project:', projectRef);
console.log('🌐 Supabase URL:', SUPABASE_URL);
console.log('');

// Helper function to make API requests
function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function runDiagnostics() {
  console.log('='.repeat(60));
  console.log('1️⃣ فحص جدول product_variants');
  console.log('='.repeat(60));
  
  try {
    // Check if we can read from product_variants
    const variantsResponse = await makeRequest('/rest/v1/product_variants?limit=1');
    console.log('📡 Response status:', variantsResponse.status);
    
    if (variantsResponse.status === 200) {
      console.log('✅ يمكن قراءة من product_variants');
      console.log('📊 Sample data:', JSON.stringify(variantsResponse.data, null, 2));
    } else {
      console.log('❌ لا يمكن قراءة من product_variants');
      console.log('📋 Response:', variantsResponse.data);
    }
  } catch (error) {
    console.error('❌ Error reading product_variants:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('2️⃣ فحص عدد المتغيرات');
  console.log('='.repeat(60));
  
  try {
    const countResponse = await makeRequest('/rest/v1/product_variants?select=id&limit=1000');
    if (countResponse.status === 200) {
      const count = Array.isArray(countResponse.data) ? countResponse.data.length : 0;
      console.log(`📊 عدد المتغيرات: ${count}`);
    }
  } catch (error) {
    console.error('❌ Error counting variants:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('3️⃣ فحص جدول product_images');
  console.log('='.repeat(60));
  
  try {
    const imagesResponse = await makeRequest('/rest/v1/product_images?limit=1');
    console.log('📡 Response status:', imagesResponse.status);
    
    if (imagesResponse.status === 200) {
      console.log('✅ يمكن قراءة من product_images');
    } else {
      console.log('❌ لا يمكن قراءة من product_images');
      console.log('📋 Response:', imagesResponse.data);
    }
  } catch (error) {
    console.error('❌ Error reading product_images:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('4️⃣ فحص صور المتغيرات');
  console.log('='.repeat(60));
  
  try {
    const variantImagesResponse = await makeRequest('/rest/v1/product_images?variant_id=not.is.null&limit=10');
    if (variantImagesResponse.status === 200) {
      const variantImages = Array.isArray(variantImagesResponse.data) ? variantImagesResponse.data : [];
      console.log(`📊 عدد صور المتغيرات: ${variantImages.length}`);
      if (variantImages.length > 0) {
        console.log('📸 Sample variant images:');
        variantImages.slice(0, 3).forEach((img, idx) => {
          console.log(`   ${idx + 1}. Variant ID: ${img.variant_id}, Image URL: ${img.image_url?.substring(0, 50)}...`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Error reading variant images:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('5️⃣ اختبار إدراج متغير (اختبار RLS)');
  console.log('='.repeat(60));
  console.log('⚠️  هذا الاختبار يحتاج معرف منتج موجود');
  console.log('   يمكنك تعديل السكريبت وإضافة معرف منتج حقيقي للاختبار');
  /*
  try {
    // استبدل هذا بمعرف منتج موجود فعلاً
    const testVariant = {
      product_id: 'YOUR_PRODUCT_ID_HERE',
      variant_name: 'اختبار - أحمر - L',
      color: 'أحمر',
      size: 'L',
      stock_quantity: 10,
      is_active: true,
      is_default: false,
      display_order: 0
    };

    const insertResponse = await makeRequest('/rest/v1/product_variants', 'POST', testVariant);
    console.log('📡 Insert response status:', insertResponse.status);
    
    if (insertResponse.status === 201 || insertResponse.status === 200) {
      console.log('✅ يمكن إدراج متغير (RLS يسمح)');
      console.log('📊 Inserted variant:', JSON.stringify(insertResponse.data, null, 2));
      
      // حذف المتغير التجريبي
      if (insertResponse.data && insertResponse.data.id) {
        const deleteResponse = await makeRequest(`/rest/v1/product_variants?id=eq.${insertResponse.data.id}`, 'DELETE');
        console.log('🗑️  Test variant deleted:', deleteResponse.status === 204 ? '✅' : '❌');
      }
    } else {
      console.log('❌ لا يمكن إدراج متغير');
      console.log('📋 Response:', insertResponse.data);
      console.log('💡 قد تكون المشكلة في RLS Policies أو Authentication');
    }
  } catch (error) {
    console.error('❌ Error testing insert:', error.message);
  }
  */

  console.log('\n' + '='.repeat(60));
  console.log('✅ انتهى التشخيص');
  console.log('='.repeat(60));
  console.log('\n📝 الخطوات التالية:');
  console.log('   1. راجع النتائج أعلاه');
  console.log('   2. إذا كان هناك أخطاء، انسخها وأرسلها');
  console.log('   3. جرب إضافة متغير من التطبيق وراقب console logs');
  console.log('   4. انسخ جميع رسائل console التي تبدأ بـ 📦, 📤, 📡, ✅, ❌');
}

runDiagnostics().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

