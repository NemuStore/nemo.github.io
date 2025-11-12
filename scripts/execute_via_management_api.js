/**
 * Execute SQL using Supabase Management API
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Values from notes
const projectRef = 'fdxxynnsxgiozaiiexlm';
const accessToken = 'sbp_2472ff9d3a64cb005f321cba70a788c7a8e30d98'; // EXPO_SUPABASE_TOKEN

// Read SQL file
const sqlFile = path.join(__dirname, '..', 'supabase', 'add_admin_delete_products_simple.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('🔧 Executing SQL via Management API...\n');
console.log('📋 Project:', projectRef);
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
    } else {
      console.log('\n❌ Failed to execute SQL');
      console.log('📝 Please execute manually:');
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

