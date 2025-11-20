/**
 * Script to execute SQL to fix image_url column in products table
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQL() {
  console.log('🔧 Fixing image_url column in products table...\n');

  try {
    // Read SQL file
    const sqlFile = path.join(__dirname, '..', 'supabase', 'fix_image_url_column.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 SQL file loaded\n');

    // Extract SQL statements (remove comments and empty lines)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('BEGIN') && !s.startsWith('COMMIT'));

    console.log(`📊 Found ${statements.length} SQL statements\n`);

    // Execute each statement using Supabase client
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.length < 10) continue;

      console.log(`🔧 Executing statement ${i + 1}/${statements.length}...`);
      console.log(`📋 ${statement.substring(0, 80)}...\n`);

      try {
        // Try using RPC if available
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement 
        });

        if (error) {
          // RPC not available, try direct query using REST API
          // For DDL statements, we need Management API or psql
          console.log('⚠️  RPC not available, trying alternative method...\n');
          
          // Try using fetch with service role key
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sql_query: statement })
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
          }

          console.log(`✅ Statement ${i + 1} executed successfully\n`);
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully\n`);
        }
      } catch (err) {
        console.error(`❌ Error executing statement ${i + 1}:`, err.message);
        console.log('\n📝 Supabase REST API does not support DDL statements directly');
        console.log('📝 Please execute SQL manually:\n');
        console.log('1. Open: https://supabase.com/dashboard');
        console.log('2. Go to SQL Editor');
        console.log('3. Copy content from: supabase/fix_image_url_column.sql');
        console.log('4. Paste and Run\n');
        return;
      }
    }

    console.log('✅ All SQL statements executed successfully!');
    console.log('\n🎉 image_url column has been removed from products table!');
    console.log('✅ You can now add new products without image_url\n');

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n📝 Please execute SQL manually:\n');
    console.log('1. Open: https://supabase.com/dashboard');
    console.log('2. Go to SQL Editor');
    console.log('3. Copy content from: supabase/fix_image_url_column.sql');
    console.log('4. Paste and Run\n');
    process.exit(1);
  }
}

// Check if we can use psql as alternative
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function tryWithPsql() {
  try {
    await execAsync('which psql');
    console.log('💡 psql is available, but we need database connection string');
    console.log('📝 Please get connection string from Supabase Dashboard:');
    console.log('   Settings > Database > Connection string (URI)\n');
  } catch (error) {
    // psql not available
  }
}

// Main execution
(async () => {
  await executeSQL();
  await tryWithPsql();
})();

