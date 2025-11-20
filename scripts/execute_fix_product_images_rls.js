const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_ACCESS_TOKEN = process.env.EXPO_SUPABASE_TOKEN;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

if (!SUPABASE_ACCESS_TOKEN || !SUPABASE_URL) {
  console.error('❌ Missing EXPO_SUPABASE_TOKEN or EXPO_PUBLIC_SUPABASE_URL');
  console.error('💡 Set these environment variables:');
  console.error('   export EXPO_SUPABASE_TOKEN=your_access_token');
  console.error('   export EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  process.exit(1);
}

const projectRef = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('❌ Could not extract project reference from Supabase URL');
  process.exit(1);
}

const sqlFile = path.join(__dirname, '..', 'supabase', 'fix_product_images_rls_final.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('🔧 Executing SQL migration to fix product_images RLS policies...');
console.log('\n📋 Project:', projectRef);
console.log('📝 SQL File:', sqlFile);
console.log('\n📝 SQL:\n============================================================');
console.log(sql);
console.log('============================================================\n');

const postData = JSON.stringify({
  query: sql
});

const options = {
  hostname: 'api.supabase.com',
  port: 443,
  path: `/v1/projects/${projectRef}/database/query`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`
  }
};

const req = https.request(options, (res) => {
  let data = '';

  console.log('📡 Response status:', res.statusCode);

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📋 Response:', data);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('\n✅ SQL migration executed successfully!');
      console.log('\n✨ What was fixed:');
      console.log('  - Updated RLS policies for product_images table');
      console.log('  - Using is_admin_or_manager() function to bypass RLS');
      console.log('  - Ensured variant_id column exists');
      console.log('  - All policies now work with Supabase REST API');
      console.log('\n📝 Next steps:');
      console.log('  1. Try adding a product with images');
      console.log('  2. Try adding variants with images');
      console.log('  3. All images should be saved in product_images table');
      console.log('  4. RLS policies should now work correctly');
    } else {
      console.error('\n❌ Failed to execute SQL migration');
      console.error('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Request error:', error.message);
  process.exit(1);
});

req.write(postData);
req.end();

