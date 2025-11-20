/**
 * Execute SQL to migrate variant images from product_variants.image_url to product_images
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Values from notes
const projectRef = 'fdxxynnsxgiozaiiexlm';
const accessToken = 'sbp_2472ff9d3a64cb005f321cba70a788c7a8e30d98'; // EXPO_SUPABASE_TOKEN

// Read SQL file
const sqlFile = path.join(__dirname, '..', 'supabase', 'migrate_variant_images_to_product_images.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('🔧 Executing SQL to migrate variant images to product_images...\n');
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
      console.log('\n✨ What was done:');
      console.log('  - Migrated variant images from product_variants.image_url to product_images');
      console.log('  - All variant images now have variant_id set correctly');
      console.log('  - Images are now in product_images table only');
      console.log('\n📝 Next steps:');
      console.log('  1. Review the migration results above');
      console.log('  2. If migration is successful, run remove_image_url_from_product_variants.sql');
      console.log('  3. Update code to stop using variant.image_url');
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

