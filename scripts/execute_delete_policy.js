/**
 * Execute SQL to add delete policy for products
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// SQL to execute
const sql = `
-- Add RLS policy to allow admins to delete products
-- First, try using the function if it exists, otherwise use direct check
DO $$
BEGIN
  -- Check if is_admin_or_manager function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_admin_or_manager'
  ) THEN
    -- Use the function
    EXECUTE 'CREATE POLICY IF NOT EXISTS "Only admins can delete products" ON public.products
      FOR DELETE USING (public.is_admin_or_manager(auth.uid()));';
  ELSE
    -- Use direct check
    EXECUTE 'CREATE POLICY IF NOT EXISTS "Only admins can delete products" ON public.products
      FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN (''admin'', ''manager''))
      );';
  END IF;
END $$;
`;

async function executeSQL() {
  try {
    console.log('🔧 Adding delete policy for products...\n');
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Try to execute via RPC (if we have a function for it)
    // Otherwise, we'll need to use the Management API or direct connection
    
    // Since Supabase REST API doesn't support DDL, we need to use psql or Management API
    // Let's try using curl with Management API if we have access token
    
    console.log('📝 SQL to execute:');
    console.log('='.repeat(60));
    console.log(sql);
    console.log('='.repeat(60) + '\n');
    
    // Extract project ref
    const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
    
    if (projectRef) {
      console.log('📋 Project Reference:', projectRef);
      console.log('🔗 SQL Editor URL:');
      console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new\n`);
    }
    
    // Try using Supabase CLI if available
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      // Check if supabase CLI is available
      await execAsync('which supabase');
      
      // Try to execute SQL using psql through Supabase CLI
      console.log('🚀 Attempting to execute SQL via Supabase CLI...\n');
      
      // Write SQL to temp file
      const tempFile = path.join(__dirname, '..', 'temp_delete_policy.sql');
      fs.writeFileSync(tempFile, sql);
      
      // Try to execute (this might require project linking)
      try {
        const { stdout, stderr } = await execAsync(
          `supabase db execute --file "${tempFile}" --project-ref ${projectRef} 2>&1 || echo "CLI execution failed"`
        );
        
        if (stdout && !stdout.includes('CLI execution failed')) {
          console.log('✅ SQL executed successfully via CLI!');
          console.log('📋 Output:', stdout);
          fs.unlinkSync(tempFile);
          return;
        }
      } catch (cliError) {
        console.log('⚠️  CLI execution not available, trying alternative...\n');
      }
      
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch (error) {
      console.log('⚠️  Supabase CLI not available\n');
    }
    
    // Final fallback: provide manual instructions
    console.log('📝 Manual Execution Required:');
    console.log('='.repeat(60));
    console.log('1. Open Supabase Dashboard:');
    if (projectRef) {
      console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`);
    } else {
      console.log('   https://supabase.com/dashboard');
    }
    console.log('\n2. Copy and paste the SQL above');
    console.log('3. Click "Run" to execute\n');
    
    // Also try to use Management API if we have access
    console.log('💡 Alternative: Use Supabase CLI with linked project:');
    console.log('   supabase link --project-ref ' + (projectRef || 'YOUR_PROJECT_REF'));
    console.log('   supabase db execute --file supabase/add_admin_delete_products_policy.sql\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

executeSQL();

