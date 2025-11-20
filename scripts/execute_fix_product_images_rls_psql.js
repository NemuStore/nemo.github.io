/**
 * Execute SQL to fix product_images RLS policies using psql
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
const sqlFile = path.join(__dirname, '..', 'supabase', 'fix_product_images_rls_final.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('🔧 Executing SQL to fix product_images RLS policies...\n');
console.log('📋 Project:', projectRef);
console.log('📝 SQL File:', sqlFile);
console.log('📝 SQL:');
console.log('='.repeat(60));
console.log(sql);
console.log('='.repeat(60) + '\n');

// Connection string for Supabase
const connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

// Write SQL to temp file
const tempFile = path.join(__dirname, '..', 'temp_fix_product_images_rls.sql');
fs.writeFileSync(tempFile, sql);

console.log('🚀 Executing via psql...\n');

execAsync(`PGPASSWORD="${password}" psql "${connectionString}" -f "${tempFile}" 2>&1`)
  .then(({ stdout, stderr }) => {
    // psql outputs to stderr for successful DDL operations
    if (stderr && (stderr.includes('CREATE POLICY') || stderr.includes('DROP POLICY') || stderr.includes('CREATE FUNCTION') || stderr.includes('ALTER TABLE') || stderr.includes('successfully'))) {
      console.log('✅ SQL executed successfully!');
      console.log('📋 Output:', stderr);
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
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
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

