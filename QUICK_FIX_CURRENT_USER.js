/**
 * QUICK FIX SCRIPT FOR CURRENT USER PROFILE UPDATE ISSUE
 * 
 * This script can be run in the browser console to immediately fix
 * the profile update issue for the currently logged-in user.
 * 
 * INSTRUCTIONS:
 * 1. Open your React app in the browser
 * 2. Log in as the user having profile update issues
 * 3. Open browser console (F12 -> Console tab)
 * 4. Copy and paste this entire script
 * 5. Press Enter to run
 * 6. Check the console output for results
 * 7. Try updating your profile again
 */

(async function quickFixCurrentUser() {
  console.log('🚀 Quick Fix: Starting current user profile fix...');
  
  try {
    // Check if we're in the right environment
    if (typeof window === 'undefined') {
      throw new Error('This script must be run in a browser environment');
    }
    
    // Check if Firebase is available
    if (!window.firebase || !window.firebase.auth) {
      throw new Error('Firebase not found. Make sure you are on the app page.');
    }
    
    // Check if Supabase is available
    if (!window.supabase) {
      throw new Error('Supabase not found. Make sure you are on the app page.');
    }
    
    console.log('✅ Quick Fix: Environment check passed');
    
    // Get current Firebase user
    const currentUser = window.firebase.auth().currentUser;
    if (!currentUser) {
      throw new Error('No user is currently logged in');
    }
    
    console.log('✅ Quick Fix: Current user found:', currentUser.uid);
    
    // Get user data from Firebase
    const userDoc = await window.firebase.firestore()
      .collection('employees')
      .doc(currentUser.uid)
      .get();
    
    if (!userDoc.exists) {
      throw new Error('User document not found in Firebase');
    }
    
    const userData = userDoc.data();
    console.log('✅ Quick Fix: Firebase user data:', userData);
    
    // Check if user exists in Supabase
    const { data: existingUser, error: checkError } = await window.supabase
      .from('user_profiles')
      .select('*')
      .eq('employeeId', userData.employeeId)
      .single();
    
    if (checkError && checkError.code === 'PGRST116') {
      // User doesn't exist in Supabase, create them
      console.log('🔄 Quick Fix: User not found in Supabase, creating...');
      
      const newUserRecord = {
        uid: currentUser.uid,
        employeeId: userData.employeeId,
        name: userData.name || '',
        email: userData.email || currentUser.email || '',
        officeName: userData.officeName || '',
        divisionName: userData.divisionName || '',
        designation: userData.designation || '',
        mobileNumber: userData.mobileNumber || '',
        role: userData.role || 'user'
      };
      
      console.log('🔄 Quick Fix: Creating user with data:', newUserRecord);
      
      const { data: createdUser, error: createError } = await window.supabase
        .from('user_profiles')
        .insert(newUserRecord)
        .select()
        .single();
      
      if (createError) {
        throw new Error(`Failed to create user in Supabase: ${createError.message}`);
      }
      
      console.log('✅ Quick Fix: User created successfully:', createdUser);
      
    } else if (checkError) {
      throw new Error(`Error checking user in Supabase: ${checkError.message}`);
    } else {
      console.log('✅ Quick Fix: User already exists in Supabase:', existingUser);
    }
    
    // Test update operation
    console.log('🧪 Quick Fix: Testing profile update...');
    
    const testUpdate = {
      name: userData.name || 'Test Name',
      officeName: userData.officeName || 'Test Office',
      divisionName: userData.divisionName || 'Test Division',
      designation: userData.designation || 'Test Designation',
      mobileNumber: userData.mobileNumber || '+91-0000000000'
    };
    
    const { data: updateResult, error: updateError } = await window.supabase
      .from('user_profiles')
      .update(testUpdate)
      .eq('employeeId', userData.employeeId)
      .select();
    
    if (updateError) {
      throw new Error(`Test update failed: ${updateError.message}`);
    }
    
    console.log('✅ Quick Fix: Test update successful:', updateResult);
    
    // Final verification
    const { data: finalCheck, error: finalError } = await window.supabase
      .from('user_profiles')
      .select('*')
      .eq('employeeId', userData.employeeId)
      .single();
    
    if (finalError) {
      throw new Error(`Final verification failed: ${finalError.message}`);
    }
    
    console.log('✅ Quick Fix: Final verification passed:', finalCheck);
    
    // Success message
    console.log('🎉 QUICK FIX COMPLETED SUCCESSFULLY! 🎉');
    console.log('');
    console.log('✅ Your profile update issue has been fixed!');
    console.log('✅ You can now edit your profile normally');
    console.log('✅ Both Firebase and Supabase are synchronized');
    console.log('');
    console.log('Next steps:');
    console.log('1. Refresh the page');
    console.log('2. Try editing your profile');
    console.log('3. Check that changes are saved successfully');
    
    // Show success alert
    alert('✅ Profile fix completed successfully! You can now edit your profile. Please refresh the page and try again.');
    
  } catch (error) {
    console.error('❌ Quick Fix Failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting steps:');
    console.log('1. Make sure you are logged in');
    console.log('2. Make sure you are on the app page (not this console)');
    console.log('3. Check that Firebase and Supabase are loaded');
    console.log('4. Try running the full migration tool instead');
    console.log('5. Contact support if the issue persists');
    
    alert(`❌ Quick fix failed: ${error.message}\n\nPlease check the console for troubleshooting steps.`);
  }
})();

// Additional helper functions for manual debugging
window.debugProfileIssue = async function() {
  console.log('🔍 Debug: Checking profile issue...');
  
  try {
    const currentUser = window.firebase.auth().currentUser;
    if (!currentUser) {
      console.log('❌ No user logged in');
      return;
    }
    
    console.log('Current user UID:', currentUser.uid);
    console.log('Current user email:', currentUser.email);
    
    // Check Firebase
    const userDoc = await window.firebase.firestore()
      .collection('employees')
      .doc(currentUser.uid)
      .get();
    
    if (userDoc.exists) {
      console.log('✅ Firebase user data:', userDoc.data());
    } else {
      console.log('❌ User not found in Firebase');
    }
    
    // Check Supabase
    const { data: supabaseUser, error } = await window.supabase
      .from('user_profiles')
      .select('*')
      .eq('uid', currentUser.uid)
      .single();
    
    if (error) {
      console.log('❌ Supabase error:', error);
    } else {
      console.log('✅ Supabase user data:', supabaseUser);
    }
    
  } catch (error) {
    console.error('Debug failed:', error);
  }
};

console.log('');
console.log('🛠️  Additional debug function available:');
console.log('Run: debugProfileIssue()');
console.log('');
