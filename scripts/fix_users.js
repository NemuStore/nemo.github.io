// Script to fix missing users
// Run with: node scripts/fix_users.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.service_role;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixMissingUsers() {
  console.log('🔍 البحث عن المستخدمين المفقودين...');
  
  // Get all auth users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('Error fetching auth users:', authError);
    return;
  }
  
  console.log(`📊 وجدنا ${authUsers.users.length} مستخدم في auth.users`);
  
  // Get all users in public.users
  const { data: publicUsers, error: publicError } = await supabase
    .from('users')
    .select('id');
  
  if (publicError) {
    console.error('Error fetching public users:', publicError);
    return;
  }
  
  const publicUserIds = new Set(publicUsers.map(u => u.id));
  const missingUsers = authUsers.users.filter(u => !publicUserIds.has(u.id));
  
  console.log(`⚠️  وجدنا ${missingUsers.length} مستخدم مفقود`);
  
  if (missingUsers.length === 0) {
    console.log('✅ لا يوجد مستخدمين مفقودين!');
    return;
  }
  
  // Insert missing users
  const usersToInsert = missingUsers.map(user => ({
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'مستخدم',
    role: 'customer',
    created_at: user.created_at,
    updated_at: new Date().toISOString()
  }));
  
  const { data, error } = await supabase
    .from('users')
    .insert(usersToInsert);
  
  if (error) {
    console.error('❌ خطأ في إضافة المستخدمين:', error);
    return;
  }
  
  console.log(`✅ تم إضافة ${missingUsers.length} مستخدم بنجاح!`);
  console.log('\n📋 المستخدمين المضافين:');
  usersToInsert.forEach(user => {
    console.log(`  - ${user.email} (${user.full_name})`);
  });
}

fixMissingUsers().catch(console.error);

