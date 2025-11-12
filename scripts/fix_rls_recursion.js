/**
 * Script to fix RLS recursion issue in Supabase
 * This script executes SQL to fix the infinite recursion problem
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n💡 Note: You need Service Role Key (not anon key) to execute SQL.');
  console.error('   Get it from: Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

// Extract project ref from URL
const projectRef = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('❌ Invalid Supabase URL format');
  process.exit(1);
}

// Read SQL file
const sqlFile = path.join(__dirname, '..', 'supabase', 'fix_rls_recursion.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('📝 Reading SQL file...');
console.log(`📄 File: ${sqlFile}`);
console.log(`📊 SQL length: ${sql.length} characters\n`);

// Execute SQL using Supabase Management API
async function executeSQL() {
  return new Promise((resolve, reject) => {
    const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
    
    const postData = JSON.stringify({
      query: sql
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    };

    console.log('🔗 Connecting to Supabase...');
    console.log(`🌐 URL: ${url.replace(SUPABASE_SERVICE_KEY, '***')}\n`);

    // Note: Supabase Management API might not support direct SQL execution
    // We'll try using the REST API with RPC or direct query
    
    // Alternative: Use Supabase REST API with pg_query extension
    // But this requires the query to be in a specific format
    
    // Best approach: Use Supabase CLI if available, or guide user to use Dashboard
    console.log('⚠️  Direct SQL execution via API is not straightforward.');
    console.log('💡 Using alternative method: Supabase Dashboard SQL Editor\n');
    
    // Try using the REST API endpoint for SQL execution
    const restUrl = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
    
    const restOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    };

    const req = https.request(restUrl, restOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('✅ SQL executed successfully!');
          console.log('📋 Response:', data);
          resolve(data);
        } else {
          console.error(`❌ Error: HTTP ${res.statusCode}`);
          console.error('📋 Response:', data);
          
          // If API doesn't work, provide manual instructions
          console.log('\n📝 Manual execution required:');
          console.log('1. Open: https://supabase.com/dashboard');
          console.log('2. Go to SQL Editor');
          console.log('3. Copy content from: supabase/fix_rls_recursion.sql');
          console.log('4. Paste and Run\n');
          
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      console.log('\n📝 Please execute SQL manually:');
      console.log('1. Open: https://supabase.com/dashboard');
      console.log('2. Go to SQL Editor');
      console.log('3. Copy content from: supabase/fix_rls_recursion.sql');
      console.log('4. Paste and Run\n');
      reject(error);
    });

    // For now, we'll use a simpler approach: check if we can use psql
    // But since we don't have direct database access, we'll provide instructions
    console.log('📋 SQL Content Preview (first 500 chars):');
    console.log(sql.substring(0, 500) + '...\n');
    
    // Actually, let's try using Supabase CLI if available
    console.log('🔍 Checking for Supabase CLI...');
    
    const { exec } = require('child_process');
    exec('which supabase', (error, stdout) => {
      if (error || !stdout.trim()) {
        console.log('❌ Supabase CLI not found');
        console.log('\n📝 Please execute SQL manually:');
        console.log('1. Open: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
        console.log('2. Copy content from: supabase/fix_rls_recursion.sql');
        console.log('3. Paste and Run\n');
        reject(new Error('Supabase CLI not available'));
      } else {
        console.log('✅ Supabase CLI found!');
        console.log('🚀 Executing SQL via CLI...\n');
        
        // Use Supabase CLI to execute SQL
        // First, we need to link the project
        exec(`supabase db execute --file "${sqlFile}" --project-ref ${projectRef}`, (error, stdout, stderr) => {
          if (error) {
            console.error('❌ Error executing SQL:', error.message);
            console.error('📋 Stderr:', stderr);
            console.log('\n📝 Please execute SQL manually:');
            console.log('1. Open: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
            console.log('2. Copy content from: supabase/fix_rls_recursion.sql');
            console.log('3. Paste and Run\n');
            reject(error);
          } else {
            console.log('✅ SQL executed successfully via CLI!');
            console.log('📋 Output:', stdout);
            resolve(stdout);
          }
        });
      }
    });
  });
}

// Main execution
console.log('🔧 Fixing RLS Recursion Issue\n');
console.log('=' .repeat(50) + '\n');

executeSQL()
  .then(() => {
    console.log('\n' + '='.repeat(50));
    console.log('✅ Done! RLS recursion issue should be fixed.');
    console.log('🔄 Please refresh your app and try again.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed to execute SQL automatically');
    console.error('📝 Please execute it manually from Supabase Dashboard\n');
    process.exit(1);
  });

