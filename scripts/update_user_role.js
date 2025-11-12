// Script to update user role to admin
// Usage: node scripts/update_user_role.js <user_id> <role>

require('dotenv').config();
const fetch = require('node-fetch');

const userId = process.argv[2] || 'bb354ec1-058b-495c-8936-4ecdf6de14b6';
const newRole = process.argv[3] || 'admin';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

async function updateUserRole() {
  try {
    console.log(`🔄 Updating user ${userId} role to ${newRole}...`);
    
    const response = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        role: newRole,
        updated_at: new Date().toISOString()
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ User role updated successfully!');
      console.log('📋 Updated user:', JSON.stringify(data[0], null, 2));
    } else {
      const errorText = await response.text();
      console.error('❌ Error updating user role:', errorText);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateUserRole();

