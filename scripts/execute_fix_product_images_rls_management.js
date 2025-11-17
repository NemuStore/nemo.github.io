/**
 * Execute SQL to fix product_images RLS policies using Supabase Management API
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Values from notes
const projectRef = 'fdxxynnsxgiozaiiexlm';
const accessToken = 'sbp_2472ff9d3a64cb005f321cba70a788c7a8e30d98'; // EXPO_SUPABASE_TOKEN

// Read SQL file
const sqlFile = path.join(__dirname, '..', 'supabase', 'fix_product_images_rls_final.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('🔧 Executing SQL to fix product_images RLS policies via Management API...\n');
console.log('📋 Project:', projectRef);
console.log('📝 SQL File:', sqlFile);
console.log('📝 SQL:');
console.log('='.repeat(60));
console.log(sql);
console.log('='.repeat(60) + '\n');

// Supabase Management API endpoint
const options = {
  hostname: 'api.supabase.com',
  port: 443,
  path: `/v1/projects/${projectRef}/database/query`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
};

const postData = JSON.stringify({
  query: sql
});

console.log('🚀 Sending request to Management API...\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📡 Response status:', res.statusCode);
    console.log('📋 Response:', data);
    
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('\n✅ SQL executed successfully!');
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
      console.log('\n❌ Failed to execute SQL');
      console.log('Response:', data);
      console.log('\n📝 Please execute SQL manually:');
      console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new\n`);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.log('\n📝 Please execute SQL manually:');
  console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new\n`);
});

req.write(postData);
req.end();

