-- =====================================================
-- SIMPLE FIX FOR NEWREPORT FORM ACCESS ISSUE
-- =====================================================

-- This is a simplified version that avoids column name case sensitivity issues

-- =====================================================
-- 1. CHECK IF NEWREPORT FORM EXISTS
-- =====================================================

SELECT 
    '🔍 Checking if newreport form exists...' as step,
    COUNT(*) as form_count
FROM page_configurations 
WHERE id = 'newreport';

-- Show current configuration if it exists
SELECT 
    '📋 Current newreport configuration:' as info,
    id,
    title,
    selected_offices,
    CASE 
        WHEN selected_offices IS NULL THEN 'NULL - should allow all users'
        WHEN jsonb_array_length(selected_offices) = 0 THEN 'EMPTY - allows all users'
        ELSE 'HAS RESTRICTIONS: ' || selected_offices::text
    END as access_level
FROM page_configurations 
WHERE id = 'newreport';

-- =====================================================
-- 2. FIX THE NEWREPORT FORM (MAIN FIX)
-- =====================================================

SELECT '🔧 Applying fix for newreport form...' as step;

-- Create or update newreport form to allow all users
INSERT INTO page_configurations (
    id,
    title,
    selected_offices
) VALUES (
    'newreport',
    'New Report',
    '[]'::jsonb -- Empty array = no office restrictions = allow all users
) ON CONFLICT (id) DO UPDATE SET
    selected_offices = '[]'::jsonb,
    title = COALESCE(EXCLUDED.title, page_configurations.title);

SELECT '✅ newreport form has been configured to allow all users' as result;

-- =====================================================
-- 3. VERIFY THE FIX
-- =====================================================

SELECT '🔍 Verifying the fix...' as step;

-- Check the updated configuration
SELECT
    '✅ Updated newreport configuration:' as info,
    id,
    title,
    selected_offices,
    CASE
        WHEN selected_offices IS NULL OR jsonb_array_length(selected_offices) = 0
        THEN '✅ ACCESSIBLE TO ALL USERS'
        ELSE '🔒 RESTRICTED TO: ' || selected_offices::text
    END as access_level
FROM page_configurations
WHERE id = 'newreport';

-- =====================================================
-- 4. CLEAN UP OTHER FORMS (OPTIONAL)
-- =====================================================

SELECT '🧹 Cleaning up other forms with null office targeting...' as step;

-- Fix any other forms with null office targeting
UPDATE page_configurations 
SET selected_offices = '[]'::jsonb
WHERE selected_offices IS NULL;

-- Show how many forms were fixed
SELECT 
    '✅ Forms fixed:' as info,
    COUNT(*) as fixed_count
FROM page_configurations 
WHERE selected_offices = '[]'::jsonb;

-- =====================================================
-- 5. SHOW ALL FORMS STATUS
-- =====================================================

SELECT '📊 All forms access status:' as summary;

-- Show summary of all forms and their access levels
SELECT 
    id as form_id,
    title,
    CASE 
        WHEN selected_offices IS NULL OR jsonb_array_length(selected_offices) = 0 
        THEN '🌍 ALL USERS'
        ELSE '🔒 RESTRICTED (' || jsonb_array_length(selected_offices) || ' offices)'
    END as access_level
FROM page_configurations 
ORDER BY 
    CASE 
        WHEN selected_offices IS NULL OR jsonb_array_length(selected_offices) = 0 THEN 0
        ELSE 1
    END,
    id;

-- =====================================================
-- 6. TEST SPECIFIC OFFICE ACCESS
-- =====================================================

SELECT '🧪 TESTING OFFICE ACCESS FOR: Ondipudur SO' as test_section;

-- Test 1: Check if "Ondipudur SO" is in any form's selected_offices
SELECT
    '🔍 Forms that target "Ondipudur SO":' as info,
    id,
    title,
    selected_offices
FROM page_configurations
WHERE selected_offices ? 'Ondipudur SO'
ORDER BY id;

-- Test 2: Check newreport form specifically for "Ondipudur SO"
SELECT
    '🔍 newreport form access for "Ondipudur SO":' as info,
    id,
    title,
    selected_offices,
    CASE
        WHEN selected_offices IS NULL OR jsonb_array_length(selected_offices) = 0
        THEN '✅ HAS ACCESS (no restrictions)'
        WHEN selected_offices ? 'Ondipudur SO'
        THEN '✅ HAS ACCESS (office in targeting list)'
        ELSE '❌ NO ACCESS (office not in targeting list)'
    END as access_result
FROM page_configurations
WHERE id = 'newreport';

-- Test 3: Show all forms and their access for "Ondipudur SO"
SELECT
    '📊 All forms access status for "Ondipudur SO":' as info,
    id,
    title,
    CASE
        WHEN selected_offices IS NULL OR jsonb_array_length(selected_offices) = 0
        THEN '✅ ACCESSIBLE (no restrictions)'
        WHEN selected_offices ? 'Ondipudur SO'
        THEN '✅ ACCESSIBLE (office targeted)'
        ELSE '❌ NOT ACCESSIBLE'
    END as access_status,
    selected_offices
FROM page_configurations
ORDER BY access_status, id;

-- Test 4: Simulate the exact filtering logic
DO $$
DECLARE
    user_office TEXT := 'Ondipudur SO';
    form_record RECORD;
    has_access BOOLEAN;
BEGIN
    RAISE NOTICE '🧪 SIMULATING ACCESS CHECK FOR: %', user_office;
    RAISE NOTICE '';

    FOR form_record IN
        SELECT id, title, selected_offices
        FROM page_configurations
        ORDER BY id
    LOOP
        -- Apply the same logic as FormFilteringService
        IF form_record.selected_offices IS NULL OR jsonb_array_length(form_record.selected_offices) = 0 THEN
            has_access := TRUE;
            RAISE NOTICE '✅ Form "%" - ACCESS GRANTED (no office restrictions)', form_record.id;
        ELSE
            has_access := form_record.selected_offices ? user_office;
            RAISE NOTICE '% Form "%" - ACCESS % (office targeting: %)',
                CASE WHEN has_access THEN '✅' ELSE '❌' END,
                form_record.id,
                CASE WHEN has_access THEN 'GRANTED' ELSE 'DENIED' END,
                form_record.selected_offices;
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '🎯 SUMMARY: Forms accessible to "%":', user_office;

    FOR form_record IN
        SELECT id, title, selected_offices
        FROM page_configurations
        WHERE selected_offices IS NULL
           OR jsonb_array_length(selected_offices) = 0
           OR selected_offices ? user_office
        ORDER BY id
    LOOP
        RAISE NOTICE '  ✅ %', form_record.id;
    END LOOP;
END $$;

-- =====================================================
-- 7. OFFICE TARGETING ANALYSIS
-- =====================================================

SELECT '📊 OFFICE TARGETING ANALYSIS:' as analysis;

-- Show all unique offices mentioned in selected_offices across all forms
SELECT
    '🏢 All offices mentioned in form targeting:' as info,
    office_name,
    COUNT(*) as forms_targeting_this_office
FROM page_configurations,
     jsonb_array_elements_text(selected_offices) as office_name
WHERE selected_offices IS NOT NULL
  AND jsonb_array_length(selected_offices) > 0
GROUP BY office_name
ORDER BY forms_targeting_this_office DESC, office_name;

-- Check if "Ondipudur SO" is mentioned anywhere
SELECT
    '🔍 Is "Ondipudur SO" mentioned in any form targeting?' as question,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM page_configurations,
                         jsonb_array_elements_text(selected_offices) as office_name
            WHERE office_name = 'Ondipudur SO'
        )
        THEN '✅ YES - "Ondipudur SO" is targeted by some forms'
        ELSE '❌ NO - "Ondipudur SO" is not targeted by any forms'
    END as answer;

-- =====================================================
-- 8. TEST INSTRUCTIONS
-- =====================================================

SELECT '📋 TESTING INSTRUCTIONS:' as instructions;

SELECT 
    '1. After running this script:' as step_1,
    'Restart your Flutter app' as action_1;

SELECT 
    '2. Try accessing newreport form:' as step_2,
    'Should work without access denied errors' as action_2;

SELECT 
    '3. Check console logs for:' as step_3,
    'FormFilteringService: Form has no office restrictions, allowing access' as action_3;

SELECT 
    '4. Expected result:' as step_4,
    'newreport form should be accessible to all users' as action_4;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT '🎉 NEWREPORT FIX COMPLETE!' as status;

SELECT 
    'What was fixed:' as summary_1,
    'newreport form now allows access to all users' as description_1;

SELECT 
    'Next steps:' as summary_2,
    'Test the form access in your Flutter app' as description_2;

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================

/*
IF THE FIX DOESN'T WORK:

1. Check if the form ID is exactly "newreport":
   - Verify in your Flutter app code
   - Check the exact string being passed to FormFilteringService

2. Restart your Flutter app:
   - Clear app cache
   - Hot restart may not be enough

3. Check user office name:
   - Make sure user has an office assigned
   - Check user_profiles table for the current user

4. Check console logs:
   - Look for detailed debug output from FormFilteringService
   - Should show "Form has no office restrictions, allowing access"

5. If still having issues:
   - Run: SELECT * FROM page_configurations WHERE id = 'newreport';
   - Should show selected_offices as empty array: []

EMERGENCY FIX (if nothing else works):
UPDATE page_configurations SET selected_offices = '[]'::jsonb;
-- This makes ALL forms accessible to ALL users
*/
