/**
 * Direct SQL execution using Supabase Management API
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing credentials');
  console.error('Need: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('❌ Could not extract project ref from URL');
  process.exit(1);
}

console.log(`🔧 Project: ${projectRef}`);
console.log('🔧 Fixing image_url column...\n');

// Read SQL file
const sqlFile = path.join(__dirname, '..', 'supabase', 'fix_image_url_column.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

// Clean SQL (remove comments)
const cleanSQL = sql
  .split('\n')
  .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
  .join('\n')
  .trim();

console.log('📄 SQL to execute:');
console.log('='.repeat(60));
console.log(cleanSQL);
console.log('='.repeat(60) + '\n');

// Supabase Management API endpoint
// Note: This requires Management API access which might not be available
// We'll try using the REST API with a custom function or direct psql

console.log('⚠️  Supabase Management API requires special access');
console.log('📝 Using alternative: Direct psql connection\n');

// Try to get database password from environment or guide user
const dbPassword = process.env.EXPO_SUPABASE_PASSWORD || process.env.SUPABASE_DB_PASSWORD;

if (dbPassword) {
  // Construct connection string
  // Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
  const connectionString = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;
  
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  // Write SQL to temp file
  const tempFile = path.join(__dirname, 'temp_fix.sql');
  fs.writeFileSync(tempFile, cleanSQL);
  
  console.log('🚀 Executing via psql...\n');
  
  execAsync(`PGPASSWORD="${dbPassword}" psql "${connectionString}" -f "${tempFile}" 2>&1`)
    .then(({ stdout, stderr }) => {
      if (stderr && !stderr.includes('NOTICE') && !stderr.includes('WARNING')) {
        console.error('❌ Error:', stderr);
        console.log('\n📝 Please execute manually in Supabase Dashboard SQL Editor\n');
      } else {
        console.log('✅ SQL executed successfully!');
        if (stdout) console.log('📋 Output:', stdout);
        if (stderr) {
          // Filter out notices and warnings
          const errors = stderr.split('\n').filter(line => 
            !line.includes('NOTICE') && 
            !line.includes('WARNING') && 
            line.trim().length > 0
          );
          if (errors.length > 0) {
            console.log('📋 Info:', errors.join('\n'));
          }
        }
        console.log('\n🎉 image_url column has been removed!');
        console.log('✅ You can now add new products\n');
      }
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    })
    .catch((error) => {
      console.log('⚠️  psql execution failed:', error.message);
      console.log('\n📝 Please execute SQL manually:');
      console.log('   1. Open: https://supabase.com/dashboard');
      console.log('   2. Go to SQL Editor');
      console.log('   3. Copy SQL from: supabase/fix_image_url_column.sql');
      console.log('   4. Paste and Run\n');
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    });
} else {
  console.log('❌ Database password not found in environment');
  console.log('📝 Please execute SQL manually:\n');
  console.log('   1. Open: https://supabase.com/dashboard');
  console.log('   2. Go to SQL Editor');
  console.log('   3. Copy SQL from: supabase/fix_image_url_column.sql');
  console.log('   4. Paste and Run\n');
  console.log('💡 Or set EXPO_SUPABASE_PASSWORD in .env file');
}

