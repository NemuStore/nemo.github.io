require('dotenv').config();
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_TOKEN = process.env.EXPO_SUPABASE_TOKEN;

if (!SUPABASE_URL || !SUPABASE_TOKEN) {
  console.error('❌ Missing environment variables:');
  console.error(`EXPO_PUBLIC_SUPABASE_URL: ${SUPABASE_URL ? '✓' : '✗'}`);
  console.error(`EXPO_SUPABASE_TOKEN: ${SUPABASE_TOKEN ? '✓' : '✗'}`);
  process.exit(1);
}

async function executeSQL() {
  const sqlFile = path.join(__dirname, '../supabase/create_category_variant_options_table.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  try {
    console.log('📡 Executing SQL migration: create_category_variant_options_table.sql');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_TOKEN,
        'Authorization': `Bearer ${SUPABASE_TOKEN}`,
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Status: ${response.status} Response: ${errorText}`);
    }

    console.log('✅ SQL migration executed successfully!');
  } catch (error) {
    console.error('❌ Error executing SQL:', error.message);
    process.exit(1);
  }
}

executeSQL();

