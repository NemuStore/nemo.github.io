const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_ACCESS_TOKEN = process.env.EXPO_SUPABASE_TOKEN;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

if (!SUPABASE_ACCESS_TOKEN || !SUPABASE_URL) {
  console.error('❌ Missing EXPO_SUPABASE_TOKEN or EXPO_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

const projectRef = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('❌ Could not extract project reference from Supabase URL');
  process.exit(1);
}

const sqlFile = path.join(__dirname, '..', 'supabase', 'add_discount_fields.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('🔧 Executing SQL migration for discount fields...');
console.log('\n📋 Project:', projectRef);
console.log('📝 SQL:\n============================================================');
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
      console.log('\n✨ What was added:');
      console.log('  - original_price column (nullable)');
      console.log('  - discount_percentage column (nullable, 0-100)');
      console.log('  - Auto-calculation trigger');
      console.log('  - Index for better performance');
      console.log('\n📝 Next steps:');
      console.log('  1. The trigger will automatically calculate one field from the other');
      console.log('  2. You can now add discounts in the admin panel');
      console.log('  3. Products with discounts will show badges on the home page');
    } else {
      console.error('\n❌ Failed to execute SQL migration');
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

