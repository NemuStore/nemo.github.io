/**
 * Script to execute migration: migrate product images from products.image_url to product_images table
 * 
 * This script:
 * 1. Moves all images from products.image_url to product_images table
 * 2. Makes image_url nullable in products table
 * 3. Ensures no duplicate images are created
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeMigration() {
  console.log('🚀 Starting migration: Move product images from products.image_url to product_images...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251112000000_migrate_product_images.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL file loaded\n');

    // Execute the migration using Supabase RPC or direct SQL
    // Note: Supabase client doesn't support executing arbitrary SQL directly
    // We'll need to execute it step by step using the client methods

    // Step 1: Get all products with image_url
    console.log('📦 Step 1: Fetching products with image_url...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, image_url, created_at, updated_at')
      .not('image_url', 'is', null)
      .neq('image_url', '')
      .neq('image_url', 'null');

    if (productsError) {
      throw productsError;
    }

    console.log(`✅ Found ${products.length} products with image_url\n`);

    // Step 2: Check which products already have images in product_images
    console.log('🔍 Step 2: Checking existing images in product_images...');
    const { data: existingImages, error: imagesError } = await supabase
      .from('product_images')
      .select('product_id, image_url')
      .is('variant_id', null);

    if (imagesError) {
      throw imagesError;
    }

    const existingProductIds = new Set(
      existingImages.map(img => `${img.product_id}_${img.image_url}`)
    );

    console.log(`✅ Found ${existingImages.length} existing images in product_images\n`);

    // Step 3: Filter products that need migration
    const productsToMigrate = products.filter(p => {
      const key = `${p.id}_${p.image_url}`;
      return !existingProductIds.has(key);
    });

    console.log(`📤 Step 3: Migrating ${productsToMigrate.length} product images...\n`);

    if (productsToMigrate.length === 0) {
      console.log('✅ No products need migration. All images are already in product_images.\n');
    } else {
      // Step 4: Insert images into product_images
      const imagesToInsert = productsToMigrate.map(p => ({
        product_id: p.id,
        image_url: p.image_url,
        display_order: 0,
        is_primary: true,
        variant_id: null,
        created_at: p.created_at || new Date().toISOString(),
        updated_at: p.updated_at || new Date().toISOString(),
      }));

      const { data: insertedImages, error: insertError } = await supabase
        .from('product_images')
        .insert(imagesToInsert)
        .select();

      if (insertError) {
        throw insertError;
      }

      console.log(`✅ Successfully migrated ${insertedImages.length} images to product_images\n`);
    }

    // Step 5: Make image_url nullable in products table
    console.log('🔧 Step 4: Making image_url nullable in products table...');
    // Note: Supabase client doesn't support ALTER TABLE directly
    // This needs to be done manually in Supabase dashboard or using a service role
    console.log('⚠️  Note: You need to manually run this SQL in Supabase dashboard:');
    console.log('   ALTER TABLE public.products ALTER COLUMN image_url DROP NOT NULL;\n');

    // Step 6: Verify migration
    console.log('🔍 Step 5: Verifying migration...');
    const { data: allImages, error: verifyError } = await supabase
      .from('product_images')
      .select('product_id')
      .is('variant_id', null);

    if (verifyError) {
      throw verifyError;
    }

    const uniqueProducts = new Set(allImages.map(img => img.product_id));
    console.log(`✅ Verification: ${allImages.length} images for ${uniqueProducts.size} products in product_images\n`);

    console.log('✅ Migration completed successfully!\n');
    console.log('📝 Next steps:');
    console.log('   1. Run this SQL in Supabase dashboard:');
    console.log('      ALTER TABLE public.products ALTER COLUMN image_url DROP NOT NULL;');
    console.log('   2. Update your code to use product_images instead of products.image_url');
    console.log('   3. (Optional) After testing, you can drop the image_url column:');
    console.log('      ALTER TABLE public.products DROP COLUMN image_url;');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

executeMigration();

