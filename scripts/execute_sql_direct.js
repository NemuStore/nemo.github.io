/**
 * Execute SQL directly using Supabase Management API with Service Role Key
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Read service_role from notes file
let notesContent;
const notesPath = path.join(__dirname, '..', 'notes');
try {
  notesContent = fs.readFileSync(notesPath, 'utf8');
  console.log('✅ Read notes file from:', notesPath);
} catch (e) {
  console.error('❌ Cannot read notes file:', e.message);
  console.log('📋 Trying absolute path...');
  try {
    notesContent = fs.readFileSync('/home/zero/Desktop/nemu/notes', 'utf8');
    console.log('✅ Read notes file from absolute path');
  } catch (e2) {
    console.error('❌ Cannot read notes file:', e2.message);
    process.exit(1);
  }
}

const serviceRoleMatch = notesContent.match(/service_role=([^\s\n\r]+)/);
const supabaseUrlMatch = notesContent.match(/EXPO_PUBLIC_SUPABASE_URL=([^\s\n\r]+)/);

if (!serviceRoleMatch || !supabaseUrlMatch) {
  console.error('❌ Missing service_role or URL in notes file');
  console.log('📋 File content:', notesContent.substring(0, 200));
  process.exit(1);
}

const serviceRoleKey = serviceRoleMatch[1];
const supabaseUrl = supabaseUrlMatch[1];
const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];

// Read SQL file
const sqlFile = path.join(__dirname, '..', 'supabase', 'add_admin_delete_products_simple.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('🔧 Executing SQL to add delete policy...\n');
console.log('📋 Project:', projectRef);
console.log('📝 SQL:');
console.log('='.repeat(60));
console.log(sql);
console.log('='.repeat(60) + '\n');

// Use Supabase Management API
// Note: Management API requires access token, not service role key
// For DDL operations, we need to use psql or SQL Editor

// Try using Supabase client with service role to create a function that executes SQL
// But that's not possible - we can't execute DDL via REST API

// Best approach: Use psql with connection string
const passwordMatch = notesContent.match(/EXPO_SUPABASE_PASSWORD=([^\s\n\r]+)/);
if (passwordMatch) {
  const password = passwordMatch[1];
  
  // Try using psql
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  // Connection string format for Supabase
  const connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
  
  // Write SQL to temp file
  const tempFile = path.join(__dirname, '..', 'temp_delete_policy.sql');
  fs.writeFileSync(tempFile, sql);
  
  console.log('🚀 Attempting to execute via psql...\n');
  
  execAsync(`PGPASSWORD="${password}" psql "${connectionString}" -f "${tempFile}" 2>&1`)
    .then(({ stdout, stderr }) => {
      if (stderr && !stderr.includes('CREATE POLICY') && !stderr.includes('DROP POLICY')) {
        console.error('❌ Error:', stderr);
        console.log('\n📝 Please execute manually:');
        console.log('   https://supabase.com/dashboard/project/' + projectRef + '/sql/new\n');
      } else {
        console.log('✅ SQL executed successfully!');
        if (stdout) console.log('📋 Output:', stdout);
        if (stderr && (stderr.includes('CREATE POLICY') || stderr.includes('DROP POLICY'))) {
          console.log('📋 Info:', stderr);
        }
      }
      fs.unlinkSync(tempFile);
    })
    .catch((error) => {
      console.log('⚠️  psql not available or connection failed');
      console.log('📝 Please execute SQL manually:');
      console.log('   https://supabase.com/dashboard/project/' + projectRef + '/sql/new\n');
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    });
} else {
  console.log('❌ Missing EXPO_SUPABASE_PASSWORD');
  console.log('📝 Please execute SQL manually:');
  console.log('   https://supabase.com/dashboard/project/' + projectRef + '/sql/new\n');
}

