-- =====================================================
-- FIX ROW LEVEL SECURITY (RLS) ISSUE FOR USER_PROFILES
-- =====================================================

-- This script fixes the RLS issue that's preventing profile updates
-- Error: "new row violates row-level security policy for table user_profiles"

-- =====================================================
-- OPTION 1: DISABLE RLS (QUICK FIX)
-- =====================================================

-- Check current RLS status
SELECT 
    '🔍 Current RLS Status:' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    forcerowsecurity as force_rls
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- Disable RLS for user_profiles table (Quick fix)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

SELECT '✅ RLS disabled for user_profiles table' as status;

-- =====================================================
-- OPTION 2: CONFIGURE PROPER RLS POLICIES (RECOMMENDED)
-- =====================================================

-- If you prefer to keep RLS enabled with proper policies, 
-- uncomment the following section:

/*
-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can do everything" ON user_profiles;

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT 
    USING (auth.uid()::text = uid);

-- Policy 2: Users can insert their own profile
CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT 
    WITH CHECK (auth.uid()::text = uid);

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE 
    USING (auth.uid()::text = uid)
    WITH CHECK (auth.uid()::text = uid);

-- Policy 4: Service role can do everything (for admin operations)
CREATE POLICY "Service role can do everything" ON user_profiles
    FOR ALL
    USING (current_setting('role') = 'service_role')
    WITH CHECK (current_setting('role') = 'service_role');

SELECT '✅ RLS policies configured for user_profiles table' as status;
*/

-- =====================================================
-- GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE user_profiles_id_seq TO authenticated;

-- Grant permissions to anon users (if needed for registration)
GRANT SELECT, INSERT ON user_profiles TO anon;
GRANT USAGE, SELECT ON SEQUENCE user_profiles_id_seq TO anon;

-- Grant full permissions to service_role (for admin operations)
GRANT ALL ON user_profiles TO service_role;
GRANT ALL ON SEQUENCE user_profiles_id_seq TO service_role;

SELECT '✅ Permissions granted to user roles' as status;

-- =====================================================
-- TEST THE FIX
-- =====================================================

-- Test insert operation (should work now)
INSERT INTO user_profiles (
    uid,
    employeeId,
    name,
    email,
    officeName,
    role
) VALUES (
    'test_rls_fix_uid',
    'TEST_RLS_001',
    'RLS Test User',
    'rls.test@company.com',
    'Test Office',
    'user'
) ON CONFLICT (employeeId) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    officeName = EXCLUDED.officeName;

-- Test update operation (should work now)
UPDATE user_profiles 
SET officeName = 'Updated Test Office - ' || NOW()
WHERE employeeId = 'TEST_RLS_001';

-- Verify the operations worked
SELECT 
    '✅ Test Results:' as info,
    employeeId,
    name,
    officeName,
    updated_at
FROM user_profiles 
WHERE employeeId = 'TEST_RLS_001';

-- Clean up test data
DELETE FROM user_profiles WHERE employeeId = 'TEST_RLS_001';

-- =====================================================
-- VERIFY FINAL STATUS
-- =====================================================

-- Check final RLS status
SELECT 
    '📊 Final RLS Status:' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    forcerowsecurity as force_rls
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- Check policies (if RLS is enabled)
SELECT 
    '📋 Current Policies:' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- Check permissions
SELECT 
    '🔐 Current Permissions:' as info,
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'user_profiles'
ORDER BY grantee, privilege_type;

-- =====================================================
-- SUMMARY
-- =====================================================

SELECT '🎉 RLS FIX COMPLETE!' as summary;

SELECT 
    'What was fixed:' as issue_1,
    'Row Level Security was blocking profile operations' as description_1;

SELECT 
    'Solution applied:' as solution_1,
    'RLS disabled OR proper policies configured' as description_2;

SELECT 
    'Next steps:' as next_steps,
    '1. Test profile updates in your app' as step_1,
    '2. Verify both insert and update work' as step_2,
    '3. Check that data is saved correctly' as step_3;

-- =====================================================
-- TROUBLESHOOTING NOTES
-- =====================================================

/*
TROUBLESHOOTING NOTES:

1. If you still get RLS errors:
   - Make sure you're using the correct Supabase client configuration
   - Check that your app is using the correct API keys
   - Verify that auth.uid() matches the uid in your records

2. If you prefer to keep RLS enabled:
   - Uncomment the RLS policies section above
   - Make sure your app properly authenticates users
   - Test with authenticated users only

3. For development/testing:
   - Disabling RLS is often easier
   - You can re-enable it later with proper policies
   - Make sure to secure it before production

4. Common RLS policy patterns:
   - auth.uid()::text = uid (user owns the record)
   - auth.role() = 'authenticated' (any authenticated user)
   - current_setting('role') = 'service_role' (admin operations)
*/
