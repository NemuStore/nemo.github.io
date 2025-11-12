/**
 * Execute SQL to add delete policy using psql
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

// Values from notes file
const supabaseUrl = 'https://fdxxynnsxgiozaiiexlm.supabase.co';
const projectRef = 'fdxxynnsxgiozaiiexlm';
const password = 'NemuExtra@321';

// Read SQL file
const sqlFile = path.join(__dirname, '..', 'supabase', 'add_admin_delete_products_simple.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('🔧 Executing SQL to add delete policy...\n');
console.log('📋 Project:', projectRef);
console.log('📝 SQL:');
console.log('='.repeat(60));
console.log(sql);
console.log('='.repeat(60) + '\n');

// Connection string for Supabase
const connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

// Write SQL to temp file
const tempFile = path.join(__dirname, '..', 'temp_delete_policy.sql');
fs.writeFileSync(tempFile, sql);

console.log('🚀 Executing via psql...\n');

execAsync(`PGPASSWORD="${password}" psql "${connectionString}" -f "${tempFile}" 2>&1`)
  .then(({ stdout, stderr }) => {
    // psql outputs to stderr for successful DDL operations
    if (stderr && (stderr.includes('CREATE POLICY') || stderr.includes('DROP POLICY') || stderr.includes('successfully'))) {
      console.log('✅ SQL executed successfully!');
      console.log('📋 Output:', stderr);
    } else if (stdout) {
      console.log('✅ SQL executed successfully!');
      console.log('📋 Output:', stdout);
    } else if (stderr && !stderr.includes('error') && !stderr.includes('ERROR')) {
      console.log('✅ SQL executed successfully!');
      console.log('📋 Output:', stderr);
    } else {
      console.error('❌ Error executing SQL:');
      if (stderr) console.error(stderr);
      if (stdout) console.error(stdout);
      console.log('\n📝 Please execute manually:');
      console.log('   https://supabase.com/dashboard/project/' + projectRef + '/sql/new\n');
    }
    fs.unlinkSync(tempFile);
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    if (error.stderr) console.error('📋 Stderr:', error.stderr);
    if (error.stdout) console.error('📋 Stdout:', error.stdout);
    console.log('\n📝 Please execute SQL manually:');
    console.log('   https://supabase.com/dashboard/project/' + projectRef + '/sql/new\n');
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  });

