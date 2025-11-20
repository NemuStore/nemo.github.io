/**
 * Execute SQL to ensure product_images table is complete and ready
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Values from notes
const projectRef = 'fdxxynnsxgiozaiiexlm';
const accessToken = 'sbp_2472ff9d3a64cb005f321cba70a788c7a8e30d98'; // EXPO_SUPABASE_TOKEN

// Read SQL file
const sqlFile = path.join(__dirname, '..', 'supabase', 'ensure_product_images_complete.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('🔧 Executing SQL to ensure product_images table is complete...\n');
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
      console.log('\n✨ What was ensured:');
      console.log('  - product_images table exists with all required columns');
      console.log('  - variant_id column exists for variant images');
      console.log('  - All indexes are created');
      console.log('  - RLS policies are configured correctly');
      console.log('  - Triggers are set up (updated_at, single primary image)');
      console.log('  - is_admin_or_manager function exists');
      console.log('\n📝 Next steps:');
      console.log('  1. Add product general images (variant_id = NULL)');
      console.log('  2. Add variant images (variant_id = UUID)');
      console.log('  3. All images will be stored in product_images table');
      console.log('  4. Images are linked to imgbb URLs (not stored in database)');
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

