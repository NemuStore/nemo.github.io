const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_ACCESS_TOKEN = process.env.EXPO_SUPABASE_TOKEN;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

if (!SUPABASE_ACCESS_TOKEN || !SUPABASE_URL) {
  console.error('❌ Missing EXPO_SUPABASE_TOKEN or EXPO_PUBLIC_SUPABASE_URL');
  console.log('📝 Please set these environment variables or run:');
  console.log('   export EXPO_SUPABASE_TOKEN=your_token');
  console.log('   export EXPO_PUBLIC_SUPABASE_URL=your_url');
  process.exit(1);
}

const projectRef = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('❌ Could not extract project reference from Supabase URL');
  process.exit(1);
}

const sqlFile = path.join(__dirname, '..', 'supabase', 'create_sections_table.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('🔧 Executing SQL migration for sections table...');
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
      console.log('  - sections table (المستوى الأول: أقسام)');
      console.log('  - section_id column in categories table');
      console.log('  - Updated unique constraints for categories');
      console.log('  - RLS policies for sections');
      console.log('  - Auto-update trigger for sections');
      console.log('\n📝 Next steps:');
      console.log('  1. You can now manage sections from the admin panel');
      console.log('  2. Categories can be linked to sections');
      console.log('  3. Sections will appear in the home page filter');
    } else {
      console.error('\n❌ Failed to execute SQL migration');
      console.log('\n📝 You can also execute the SQL manually:');
      console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Request error:', error.message);
  console.log('\n📝 You can also execute the SQL manually:');
  console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  process.exit(1);
});

req.write(postData);
req.end();
