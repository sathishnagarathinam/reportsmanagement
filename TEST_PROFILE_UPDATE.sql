-- =====================================================
-- TEST PROFILE UPDATE FUNCTIONALITY
-- =====================================================

-- This script tests the exact update queries used by the React and Flutter apps
-- Run this in Supabase SQL Editor to verify update functionality

-- =====================================================
-- 1. SETUP TEST DATA (if needed)
-- =====================================================

-- Ensure we have test data
INSERT INTO user_profiles (
    uid,
    employeeId,
    name,
    email,
    officeName,
    divisionName,
    designation,
    mobileNumber,
    role
) VALUES (
    'test_firebase_uid_123',
    'TEST_EMP_001',
    'Test User',
    'test.user@company.com',
    'Test Office',
    'Test Division',
    'Test Designation',
    '+91-1234567890',
    'user'
) ON CONFLICT (employeeId) DO NOTHING;

-- =====================================================
-- 2. SHOW INITIAL STATE
-- =====================================================

SELECT '🔍 INITIAL STATE:' as step;

SELECT 
    employeeId,
    name,
    officeName,
    divisionName,
    designation,
    mobileNumber,
    updated_at
FROM user_profiles 
WHERE employeeId = 'TEST_EMP_001';

-- =====================================================
-- 3. TEST REACT-STYLE UPDATE
-- =====================================================

SELECT '🧪 TESTING REACT-STYLE UPDATE:' as step;

-- This simulates the exact update query from React Profile component
UPDATE user_profiles 
SET 
    name = 'Updated Test User',
    officeName = 'Updated Test Office',
    divisionName = 'Updated Test Division',
    designation = 'Updated Test Designation',
    mobileNumber = '+91-9876543210'
WHERE employeeId = 'TEST_EMP_001';

-- Check if update worked
SELECT 
    CASE 
        WHEN ROW_COUNT > 0 
        THEN '✅ React-style update SUCCESSFUL'
        ELSE '❌ React-style update FAILED'
    END as react_update_result;

-- Show updated state
SELECT 
    'After React-style update:' as info,
    employeeId,
    name,
    officeName,
    divisionName,
    designation,
    mobileNumber,
    updated_at
FROM user_profiles 
WHERE employeeId = 'TEST_EMP_001';

-- =====================================================
-- 4. TEST FLUTTER-STYLE UPDATE
-- =====================================================

SELECT '🧪 TESTING FLUTTER-STYLE UPDATE:' as step;

-- This simulates the exact update query from Flutter Profile screen
UPDATE user_profiles 
SET 
    name = 'Flutter Updated User',
    officeName = 'Flutter Updated Office',
    divisionName = 'Flutter Updated Division',
    designation = 'Flutter Updated Designation',
    mobileNumber = '+91-5555555555'
WHERE employeeId = 'TEST_EMP_001';

-- Check if update worked
SELECT 
    CASE 
        WHEN ROW_COUNT > 0 
        THEN '✅ Flutter-style update SUCCESSFUL'
        ELSE '❌ Flutter-style update FAILED'
    END as flutter_update_result;

-- Show updated state
SELECT 
    'After Flutter-style update:' as info,
    employeeId,
    name,
    officeName,
    divisionName,
    designation,
    mobileNumber,
    updated_at
FROM user_profiles 
WHERE employeeId = 'TEST_EMP_001';

-- =====================================================
-- 5. TEST WITH RETURNING CLAUSE
-- =====================================================

SELECT '🧪 TESTING UPDATE WITH RETURNING:' as step;

-- Test update with RETURNING clause (used in enhanced debugging)
UPDATE user_profiles 
SET 
    officeName = 'Final Test Office - ' || NOW()
WHERE employeeId = 'TEST_EMP_001'
RETURNING employeeId, name, officeName, updated_at;

-- =====================================================
-- 6. TEST COMMON FAILURE SCENARIOS
-- =====================================================

SELECT '🧪 TESTING FAILURE SCENARIOS:' as step;

-- Test 1: Non-existent employeeId
UPDATE user_profiles 
SET officeName = 'Should Not Work'
WHERE employeeId = 'NON_EXISTENT_ID';

SELECT 
    CASE 
        WHEN ROW_COUNT = 0 
        THEN '✅ Correctly failed for non-existent ID'
        ELSE '❌ Unexpectedly succeeded for non-existent ID'
    END as non_existent_test;

-- Test 2: NULL employeeId
UPDATE user_profiles 
SET officeName = 'Should Not Work'
WHERE employeeId IS NULL;

SELECT 
    CASE 
        WHEN ROW_COUNT = 0 
        THEN '✅ Correctly failed for NULL ID'
        ELSE '❌ Unexpectedly succeeded for NULL ID'
    END as null_id_test;

-- Test 3: Empty string employeeId
UPDATE user_profiles 
SET officeName = 'Should Not Work'
WHERE employeeId = '';

SELECT 
    CASE 
        WHEN ROW_COUNT = 0 
        THEN '✅ Correctly failed for empty string ID'
        ELSE '❌ Unexpectedly succeeded for empty string ID'
    END as empty_string_test;

-- =====================================================
-- 7. VERIFY FINAL STATE
-- =====================================================

SELECT '🔍 FINAL STATE:' as step;

SELECT 
    employeeId,
    name,
    officeName,
    divisionName,
    designation,
    mobileNumber,
    updated_at,
    created_at
FROM user_profiles 
WHERE employeeId = 'TEST_EMP_001';

-- =====================================================
-- 8. CLEANUP TEST DATA (OPTIONAL)
-- =====================================================

-- Uncomment the line below to remove test data
-- DELETE FROM user_profiles WHERE employeeId = 'TEST_EMP_001';

-- =====================================================
-- 9. SUMMARY
-- =====================================================

SELECT '📋 TEST SUMMARY:' as summary;

SELECT 
    'If all tests passed:' as result_1,
    'Profile updates should work in your apps' as meaning_1;

SELECT 
    'If tests failed:' as result_2,
    'Check table structure and permissions' as meaning_2;

SELECT 
    'Next steps:' as next_steps,
    '1. Run this test script' as step_1,
    '2. Check app logs for specific errors' as step_2,
    '3. Verify employeeId values match' as step_3;

-- =====================================================
-- TEST COMPLETE
-- =====================================================

SELECT '🎉 Profile update test complete!' as status;
