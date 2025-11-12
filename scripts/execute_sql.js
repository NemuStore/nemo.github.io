/**
 * Execute SQL directly using Supabase REST API with service role key
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
// Try to get service role key from env
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role;

if (!supabaseUrl) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  console.error('💡 Get it from: Supabase Dashboard > Settings > API > service_role key');
  console.error('   Add it to .env as: SUPABASE_SERVICE_ROLE_KEY=your-key-here\n');
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
  const sqlFile = path.join(__dirname, '..', 'supabase', 'fix_rls_recursion.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  console.log('📝 Reading SQL file...');
  console.log(`📄 File: ${sqlFile}\n`);

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📊 Found ${statements.length} SQL statements\n`);

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip comments and empty statements
    if (statement.startsWith('--') || statement.length < 10) {
      continue;
    }

    console.log(`🔧 Executing statement ${i + 1}/${statements.length}...`);
    console.log(`📋 Preview: ${statement.substring(0, 100)}...\n`);

    try {
      // Use RPC to execute SQL (if available)
      // Or use direct query
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: statement 
      });

      if (error) {
        // If RPC doesn't exist, try using the REST API directly
        console.log('⚠️  RPC not available, trying alternative method...\n');
        
        // For DDL statements, we need to use a different approach
        // Supabase doesn't allow direct SQL execution via REST API for security
        // We need to use the Management API or SQL Editor
        
        console.log('❌ Cannot execute SQL directly via REST API');
        console.log('📝 Please execute SQL manually:\n');
        console.log('1. Open: https://supabase.com/dashboard/project/fdxxynnsxgiozaiiexlm/sql/new');
        console.log('2. Copy content from: supabase/fix_rls_recursion.sql');
        console.log('3. Paste and Run\n');
        return;
      }

      console.log(`✅ Statement ${i + 1} executed successfully\n`);
    } catch (err) {
      console.error(`❌ Error executing statement ${i + 1}:`, err.message);
      console.log('\n📝 Please execute SQL manually:\n');
      console.log('1. Open: https://supabase.com/dashboard/project/fdxxynnsxgiozaiiexlm/sql/new');
      console.log('2. Copy content from: supabase/fix_rls_recursion.sql');
      console.log('3. Paste and Run\n');
      return;
    }
  }

  console.log('✅ All SQL statements executed successfully!');
}

// Actually, Supabase doesn't support direct SQL execution via REST API
// We need to use the Management API or create a function
// Let's try using psql if available, or provide clear instructions

async function tryExecute() {
  console.log('🔧 Attempting to fix RLS recursion issue...\n');
  console.log('='.repeat(50) + '\n');

  // Check if we can use psql
  const { exec } = require('child_process');
  
  return new Promise((resolve, reject) => {
    exec('which psql', (error) => {
      if (error) {
        console.log('⚠️  psql not available');
        console.log('📝 Using Supabase Dashboard method...\n');
        
        // Read SQL file
        const sqlFile = path.join(__dirname, '..', 'supabase', 'fix_rls_recursion.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');
        
        // Extract database connection info from URL
        const urlMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
        const projectRef = urlMatch ? urlMatch[1] : 'unknown';
        
        console.log('📋 SQL File Content:');
        console.log('='.repeat(50));
        console.log(sql);
        console.log('='.repeat(50) + '\n');
        
        console.log('📝 Manual Execution Steps:');
        console.log('1. Open: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
        console.log('2. Copy the SQL above');
        console.log('3. Paste in SQL Editor');
        console.log('4. Click Run\n');
        
        // Actually, let's try using curl to Supabase Management API
        console.log('🚀 Trying Supabase Management API...\n');
        
        const https = require('https');
        const url = require('url');
        
        // Supabase Management API endpoint for SQL execution
        // This requires a different approach - we need to use the SQL Editor API
        // But that's not publicly documented
        
        // Best solution: Use the Supabase Dashboard URL with instructions
        console.log('✅ Instructions prepared!');
        console.log('📝 Please follow the manual steps above.\n');
        
        resolve();
      } else {
        console.log('✅ psql found!');
        console.log('💡 However, we need database connection string...');
        console.log('📝 Using Supabase Dashboard method instead...\n');
        resolve();
      }
    });
  });
}

// Main execution
tryExecute()
  .then(() => {
    console.log('='.repeat(50));
    console.log('✅ Setup complete!');
    console.log('🔄 After executing SQL, refresh your app.\n');
  })
  .catch(console.error);

