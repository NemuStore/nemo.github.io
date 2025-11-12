/**
 * Execute SQL directly using Supabase service role key
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  console.error('💡 Get it from: Supabase Dashboard > Settings > API > service_role key');
  console.error('   Add it to .env as: SUPABASE_SERVICE_ROLE_KEY=your-key-here\n');
  console.log('📝 SQL to execute manually:');
  console.log('='.repeat(60));
  const sqlFile = path.join(__dirname, '..', 'supabase', 'add_admin_delete_products_simple.sql');
  if (fs.existsSync(sqlFile)) {
    console.log(fs.readFileSync(sqlFile, 'utf8'));
  }
  console.log('='.repeat(60));
  console.log('\n🔗 SQL Editor: https://supabase.com/dashboard/project/fdxxynnsxgiozaiiexlm/sql/new\n');
  process.exit(1);
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQL() {
  try {
    console.log('🔧 Adding delete policy for products...\n');
    
    // Read SQL file
    const sqlFile = path.join(__dirname, '..', 'supabase', 'add_admin_delete_products_simple.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📝 SQL to execute:');
    console.log('='.repeat(60));
    console.log(sql);
    console.log('='.repeat(60) + '\n');
    
    // Split SQL into statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    // Execute each statement using RPC or direct query
    // Note: Supabase REST API doesn't support DDL directly
    // We need to use psql or Management API
    
    // Try using a custom function if it exists
    // Otherwise, we'll need to use psql or Management API
    
    console.log('⚠️  Supabase REST API does not support DDL statements directly');
    console.log('📝 Please execute SQL manually:\n');
    console.log('1. Open: https://supabase.com/dashboard/project/fdxxynnsxgiozaiiexlm/sql/new');
    console.log('2. Copy the SQL above');
    console.log('3. Paste and Run\n');
    
    // Alternative: Try using psql if available
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      // Check if we can get database connection string
      // Supabase provides connection string in dashboard
      console.log('💡 Alternative: Use psql with connection string from Supabase Dashboard');
      console.log('   Settings > Database > Connection string (URI)\n');
    } catch (error) {
      // Ignore
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

executeSQL();

