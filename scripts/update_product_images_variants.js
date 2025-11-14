require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function updateProductImagesForVariants() {
  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseToken = process.env.EXPO_SUPABASE_TOKEN;

    if (!supabaseUrl || !supabaseToken) {
      console.error('❌ Missing environment variables:');
      console.error('   EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
      console.error('   EXPO_SUPABASE_TOKEN:', supabaseToken ? '✓' : '✗');
      process.exit(1);
    }

    // Extract project reference from URL
    const projectRef = supabaseUrl.split('//')[1]?.split('.')[0];
    if (!projectRef) {
      console.error('❌ Could not extract project reference from URL');
      process.exit(1);
    }

    console.log('📦 Project Reference:', projectRef);
    console.log('🔗 Supabase URL:', supabaseUrl);

    // Read SQL file
    const sqlFilePath = path.join(__dirname, '../supabase/update_product_images_for_variants.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📄 SQL file read successfully');
    console.log('📊 SQL size:', sql.length, 'characters');

    // Execute SQL using Supabase Management API
    const managementApiUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
    
    console.log('🚀 Updating product_images table to link with variants...');
    
    const response = await fetch(managementApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: sql,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error executing SQL:');
      console.error('   Status:', response.status);
      console.error('   Response:', errorText);
      process.exit(1);
    }

    const result = await response.json();
    console.log('✅ SQL executed successfully!');
    console.log('📊 Result:', JSON.stringify(result, null, 2));
    console.log('✅ product_images table updated to support variants!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

updateProductImagesForVariants();

