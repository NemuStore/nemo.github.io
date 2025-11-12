/**
 * Execute SQL using Supabase Service Role Key
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Read from notes file if .env doesn't have it
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role;

if (!serviceRoleKey) {
  // Try reading from notes file
  try {
    const notesContent = fs.readFileSync(path.join(__dirname, '..', 'notes'), 'utf8');
    const serviceRoleMatch = notesContent.match(/service_role=([^\s\n]+)/);
    if (serviceRoleMatch) {
      serviceRoleKey = serviceRoleMatch[1];
      console.log('✅ Found service_role in notes file');
    }
  } catch (e) {
    // Ignore
  }
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://fdxxynnsxgiozaiiexlm.supabase.co';

if (!serviceRoleKey) {
  console.error('❌ Missing service_role key');
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
    console.log('🔧 Executing SQL to add delete policy...\n');
    
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
    
    console.log(`📊 Found ${statements.length} SQL statements\n`);
    
    // Execute each statement using RPC
    // Note: We need to create a function or use psql
    // Supabase REST API doesn't support DDL directly
    
    // Try using a custom RPC function if it exists
    // Otherwise, we'll use psql or provide instructions
    
    // For now, let's try using the Management API via curl
    console.log('🚀 Attempting to execute via Management API...\n');
    
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Use psql if available with connection string
    // Or use Supabase CLI db execute
    
    // Actually, the best way is to use Supabase client's RPC
    // But for DDL, we need to use psql or Management API
    
    // Let's try using psql with connection pooling
    const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
    
    if (projectRef) {
      console.log('📋 Project Reference:', projectRef);
      
      // Try using Supabase CLI db execute
      try {
        console.log('🔧 Trying Supabase CLI...');
        const { stdout, stderr } = await execAsync(
          `supabase db execute --file "${sqlFile}" --project-ref ${projectRef} 2>&1`
        );
        
        if (stdout && !stderr.includes('error')) {
          console.log('✅ SQL executed successfully via CLI!');
          console.log('📋 Output:', stdout);
          return;
        }
      } catch (cliError) {
        console.log('⚠️  CLI execution failed, trying alternative...\n');
      }
      
      // Alternative: Use psql with connection string
      // Get connection string from environment or construct it
      const dbPassword = process.env.EXPO_SUPABASE_PASSWORD;
      
      if (dbPassword) {
        // Construct connection string
        const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
        
        try {
          console.log('🔧 Trying psql...');
          // Write SQL to temp file
          const tempFile = path.join(__dirname, '..', 'temp_sql.sql');
          fs.writeFileSync(tempFile, sql);
          
          const { stdout, stderr } = await execAsync(
            `PGPASSWORD="${dbPassword}" psql "${connectionString}" -f "${tempFile}" 2>&1`
          );
          
          if (!stderr || stderr.includes('CREATE POLICY')) {
            console.log('✅ SQL executed successfully via psql!');
            if (stdout) console.log('📋 Output:', stdout);
            fs.unlinkSync(tempFile);
            return;
          } else {
            console.log('⚠️  psql execution had issues:', stderr);
            fs.unlinkSync(tempFile);
          }
        } catch (psqlError) {
          console.log('⚠️  psql not available or connection failed\n');
        }
      }
    }
    
    // Final fallback: Use Supabase REST API with a custom function
    // Or provide manual instructions
    console.log('📝 Manual execution required:');
    console.log('='.repeat(60));
    console.log('1. Open: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
    console.log('2. Copy the SQL above');
    console.log('3. Paste and Run\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

executeSQL();

