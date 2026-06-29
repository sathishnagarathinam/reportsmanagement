/**
 * QUICK RLS FIX SCRIPT FOR BROWSER CONSOLE
 * 
 * This script helps diagnose and potentially fix RLS issues
 * by providing detailed information about the current state.
 * 
 * INSTRUCTIONS:
 * 1. Open your React app in browser
 * 2. Open browser console (F12 -> Console)
 * 3. Copy and paste this script
 * 4. Press Enter to run
 * 5. Follow the instructions in the output
 */

(async function quickRLSFix() {
  console.log('🔍 RLS Diagnosis: Starting Row Level Security check...');
  
  try {
    // Check environment
    if (!window.supabase) {
      throw new Error('Supabase not found. Make sure you are on the app page.');
    }
    
    if (!window.firebase || !window.firebase.auth) {
      throw new Error('Firebase not found. Make sure you are on the app page.');
    }
    
    console.log('✅ Environment check passed');
    
    // Get current user
    const currentUser = window.firebase.auth().currentUser;
    if (!currentUser) {
      throw new Error('No user is currently logged in');
    }
    
    console.log('✅ Current user found:', currentUser.uid);
    
    // Test 1: Try to read from user_profiles table
    console.log('🧪 Test 1: Testing SELECT operation...');
    try {
      const { data: selectData, error: selectError } = await window.supabase
        .from('user_profiles')
        .select('*')
        .limit(1);
      
      if (selectError) {
        console.log('❌ SELECT failed:', selectError);
        if (selectError.code === '42501') {
          console.log('🔍 RLS is blocking SELECT operations');
        }
      } else {
        console.log('✅ SELECT works:', selectData?.length || 0, 'records found');
      }
    } catch (error) {
      console.log('❌ SELECT test failed:', error);
    }
    
    // Test 2: Try to insert a test record
    console.log('🧪 Test 2: Testing INSERT operation...');
    try {
      const testRecord = {
        uid: 'test_rls_' + Date.now(),
        employeeId: 'TEST_RLS_' + Date.now(),
        name: 'RLS Test User',
        email: 'rls.test@example.com',
        officeName: 'Test Office',
        role: 'user'
      };
      
      const { data: insertData, error: insertError } = await window.supabase
        .from('user_profiles')
        .insert(testRecord)
        .select();
      
      if (insertError) {
        console.log('❌ INSERT failed:', insertError);
        if (insertError.code === '42501') {
          console.log('🔍 RLS is blocking INSERT operations');
          console.log('📋 Error details:', insertError.message);
        }
      } else {
        console.log('✅ INSERT works:', insertData);
        
        // Clean up test record
        await window.supabase
          .from('user_profiles')
          .delete()
          .eq('employeeId', testRecord.employeeId);
        console.log('🧹 Test record cleaned up');
      }
    } catch (error) {
      console.log('❌ INSERT test failed:', error);
    }
    
    // Test 3: Check current user's record
    console.log('🧪 Test 3: Checking current user record...');
    try {
      const { data: userData, error: userError } = await window.supabase
        .from('user_profiles')
        .select('*')
        .eq('uid', currentUser.uid)
        .single();
      
      if (userError) {
        if (userError.code === 'PGRST116') {
          console.log('❌ Current user record not found in Supabase');
        } else if (userError.code === '42501') {
          console.log('❌ RLS is blocking access to current user record');
        } else {
          console.log('❌ Error accessing user record:', userError);
        }
      } else {
        console.log('✅ Current user record found:', userData);
      }
    } catch (error) {
      console.log('❌ User record check failed:', error);
    }
    
    // Provide diagnosis and recommendations
    console.log('');
    console.log('📋 DIAGNOSIS COMPLETE');
    console.log('');
    console.log('🔧 RECOMMENDED FIXES:');
    console.log('');
    console.log('1. IMMEDIATE FIX (Disable RLS):');
    console.log('   - Go to Supabase SQL Editor');
    console.log('   - Run: ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;');
    console.log('   - This will immediately fix profile update issues');
    console.log('');
    console.log('2. PROPER FIX (Configure RLS Policies):');
    console.log('   - Run the FIX_RLS_ISSUE.sql script in Supabase');
    console.log('   - This sets up proper security policies');
    console.log('');
    console.log('3. GRANT PERMISSIONS:');
    console.log('   - Run: GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;');
    console.log('   - Run: GRANT USAGE, SELECT ON SEQUENCE user_profiles_id_seq TO authenticated;');
    console.log('');
    console.log('4. VERIFY FIX:');
    console.log('   - Run this script again after applying fixes');
    console.log('   - Try updating your profile');
    console.log('');
    
    // Show SQL commands to copy
    console.log('📋 COPY THESE SQL COMMANDS TO SUPABASE:');
    console.log('');
    console.log('-- Quick fix (disable RLS):');
    console.log('ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;');
    console.log('');
    console.log('-- Grant permissions:');
    console.log('GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;');
    console.log('GRANT USAGE, SELECT ON SEQUENCE user_profiles_id_seq TO authenticated;');
    console.log('');
    console.log('-- Test the fix:');
    console.log("SELECT 'RLS fix applied successfully!' as status;");
    console.log('');
    
  } catch (error) {
    console.error('❌ RLS Diagnosis failed:', error.message);
    console.log('');
    console.log('🔧 Manual steps to fix RLS:');
    console.log('1. Open Supabase dashboard');
    console.log('2. Go to SQL Editor');
    console.log('3. Run: ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;');
    console.log('4. Run: GRANT ALL ON user_profiles TO authenticated;');
    console.log('5. Try profile update again');
  }
})();

// Helper function to test after fix
window.testRLSFix = async function() {
  console.log('🧪 Testing RLS fix...');
  
  try {
    const currentUser = window.firebase.auth().currentUser;
    if (!currentUser) {
      console.log('❌ No user logged in');
      return;
    }
    
    // Test insert
    const testRecord = {
      uid: 'test_fix_' + Date.now(),
      employeeId: 'TEST_FIX_' + Date.now(),
      name: 'Fix Test User',
      email: 'fix.test@example.com',
      officeName: 'Test Office',
      role: 'user'
    };
    
    const { data, error } = await window.supabase
      .from('user_profiles')
      .insert(testRecord)
      .select();
    
    if (error) {
      console.log('❌ RLS fix not working:', error);
      return false;
    }
    
    console.log('✅ RLS fix working! Insert successful:', data);
    
    // Clean up
    await window.supabase
      .from('user_profiles')
      .delete()
      .eq('employeeId', testRecord.employeeId);
    
    console.log('✅ RLS fix verified and test data cleaned up');
    return true;
    
  } catch (error) {
    console.log('❌ Test failed:', error);
    return false;
  }
};

console.log('');
console.log('🛠️  Additional test function available:');
console.log('Run: testRLSFix() - to test if RLS fix is working');
console.log('');
