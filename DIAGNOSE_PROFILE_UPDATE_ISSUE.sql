-- =====================================================
-- DIAGNOSE PROFILE UPDATE ISSUE
-- =====================================================

-- This script helps diagnose why Supabase profile updates are failing
-- Run this in Supabase SQL Editor to identify the issue

-- =====================================================
-- 1. CHECK TABLE EXISTENCE
-- =====================================================

SELECT '🔍 STEP 1: Checking table existence...' as step;

-- Check if user_profiles table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'user_profiles'
        ) 
        THEN '✅ user_profiles table EXISTS'
        ELSE '❌ user_profiles table DOES NOT EXIST'
    END as table_status;

-- =====================================================
-- 2. CHECK TABLE STRUCTURE
-- =====================================================

SELECT '🔍 STEP 2: Checking table structure...' as step;

-- Show table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- =====================================================
-- 3. CHECK DATA IN TABLE
-- =====================================================

SELECT '🔍 STEP 3: Checking data in table...' as step;

-- Count total records
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT employeeId) as unique_employee_ids,
    COUNT(DISTINCT uid) as unique_firebase_uids
FROM user_profiles;

-- Show sample records
SELECT 
    'Sample records:' as info,
    employeeId,
    name,
    email,
    officeName,
    uid
FROM user_profiles 
LIMIT 10;

-- =====================================================
-- 4. CHECK FOR SPECIFIC EMPLOYEE ID
-- =====================================================

SELECT '🔍 STEP 4: Checking for specific employee IDs...' as step;

-- Check if there are any records with common test employee IDs
SELECT 
    employeeId,
    name,
    officeName,
    uid,
    created_at
FROM user_profiles 
WHERE employeeId IN ('EMP001', 'EMP002', 'EMP003', 'TEST001', 'TEST002')
ORDER BY employeeId;

-- =====================================================
-- 5. TEST UPDATE OPERATION
-- =====================================================

SELECT '🔍 STEP 5: Testing update operation...' as step;

-- First, let's see what records exist
SELECT 
    'Records available for update:' as info,
    employeeId,
    name,
    officeName,
    divisionName,
    designation,
    mobileNumber
FROM user_profiles 
ORDER BY employeeId;

-- =====================================================
-- 6. SIMULATE UPDATE QUERY
-- =====================================================

SELECT '🔍 STEP 6: Simulating update query...' as step;

-- Test if we can find a record to update (using first available employeeId)
DO $$
DECLARE
    test_employee_id TEXT;
    record_count INTEGER;
BEGIN
    -- Get the first available employeeId
    SELECT employeeId INTO test_employee_id 
    FROM user_profiles 
    LIMIT 1;
    
    IF test_employee_id IS NOT NULL THEN
        RAISE NOTICE '✅ Found test employee ID: %', test_employee_id;
        
        -- Check if we can find the record
        SELECT COUNT(*) INTO record_count
        FROM user_profiles 
        WHERE employeeId = test_employee_id;
        
        RAISE NOTICE '✅ Records found with this ID: %', record_count;
        
        -- Try a test update (this will actually update the record)
        UPDATE user_profiles 
        SET officeName = 'Test Office Update - ' || NOW()
        WHERE employeeId = test_employee_id;
        
        GET DIAGNOSTICS record_count = ROW_COUNT;
        RAISE NOTICE '✅ Records updated: %', record_count;
        
        -- Show the updated record
        RAISE NOTICE '✅ Updated record:';
        FOR rec IN 
            SELECT employeeId, name, officeName 
            FROM user_profiles 
            WHERE employeeId = test_employee_id
        LOOP
            RAISE NOTICE 'Employee ID: %, Name: %, Office: %', rec.employeeId, rec.name, rec.officeName;
        END LOOP;
        
    ELSE
        RAISE NOTICE '❌ No employee records found in table';
    END IF;
END $$;

-- =====================================================
-- 7. CHECK PERMISSIONS
-- =====================================================

SELECT '🔍 STEP 7: Checking permissions...' as step;

-- Check table permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'user_profiles'
ORDER BY grantee, privilege_type;

-- =====================================================
-- 8. CHECK ROW LEVEL SECURITY
-- =====================================================

SELECT '🔍 STEP 8: Checking Row Level Security...' as step;

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerowsecurity
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- =====================================================
-- 9. COMMON ISSUES AND SOLUTIONS
-- =====================================================

SELECT '🔍 STEP 9: Common issues and solutions...' as step;

SELECT 
    'Common Issues:' as issue_type,
    '1. Table does not exist' as issue_1,
    '2. No matching employeeId found' as issue_2,
    '3. RLS blocking updates' as issue_3,
    '4. Permission issues' as issue_4,
    '5. Column name mismatch' as issue_5;

-- =====================================================
-- 10. RECOMMENDED FIXES
-- =====================================================

SELECT '💡 RECOMMENDED FIXES:' as recommendations;

SELECT 
    'If table does not exist:' as fix_1,
    'Run CREATE_USER_PROFILES_TABLE.sql script' as solution_1;

SELECT 
    'If no matching records:' as fix_2,
    'Check employeeId values in your app vs database' as solution_2;

SELECT 
    'If RLS is blocking:' as fix_3,
    'Disable RLS or create proper policies' as solution_3;

SELECT 
    'If permission issues:' as fix_4,
    'Grant proper permissions to authenticated role' as solution_4;

-- =====================================================
-- DIAGNOSIS COMPLETE
-- =====================================================

SELECT '🎉 Diagnosis complete! Check the output above for issues.' as status;
