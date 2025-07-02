-- =====================================================
-- SIMPLE VERIFICATION FOR OFFICE MAPPING FIX
-- =====================================================

-- Quick and simple verification script without complex UNION queries

-- =====================================================
-- 1. CHECK FOR REMAINING FACILITY IDs
-- =====================================================

SELECT '🔍 Step 1: Checking for remaining facility IDs...' as step;

-- Count forms still using facility IDs
SELECT 
    'Forms still using facility IDs:' as check,
    COUNT(*) as count
FROM page_configurations 
WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(selected_offices) as office_id
    WHERE office_id LIKE 'PO%' AND length(office_id) > 10
);

-- Show any remaining facility IDs (should be empty)
SELECT 
    'Any remaining facility IDs:' as warning,
    id,
    title,
    office_id as facility_id
FROM page_configurations,
     jsonb_array_elements_text(selected_offices) as office_id
WHERE office_id LIKE 'PO%' AND length(office_id) > 10
ORDER BY id
LIMIT 5;

-- =====================================================
-- 2. TEST "Ondipudur SO" ACCESS
-- =====================================================

SELECT '🧪 Step 2: Testing "Ondipudur SO" access...' as step;

-- Check if "Ondipudur SO" is in any form targeting
SELECT 
    'Forms specifically targeting "Ondipudur SO":' as test,
    COUNT(*) as form_count
FROM page_configurations 
WHERE selected_offices ? 'Ondipudur SO';

-- Show forms that specifically target "Ondipudur SO"
SELECT 
    'Forms targeting "Ondipudur SO":' as info,
    id,
    title,
    selected_offices
FROM page_configurations 
WHERE selected_offices ? 'Ondipudur SO'
ORDER BY id;

-- =====================================================
-- 3. TEST NEWREPORT FORM
-- =====================================================

SELECT '🎯 Step 3: Testing newreport form...' as step;

-- Check newreport form access for "Ondipudur SO"
SELECT 
    'newreport form access:' as test,
    id,
    title,
    selected_offices,
    CASE 
        WHEN selected_offices IS NULL OR jsonb_array_length(selected_offices) = 0 
        THEN '✅ ACCESSIBLE (no restrictions)'
        WHEN selected_offices ? 'Ondipudur SO'
        THEN '✅ ACCESSIBLE (office targeted)'
        ELSE '❌ NOT ACCESSIBLE'
    END as access_status
FROM page_configurations 
WHERE id = 'newreport';

-- =====================================================
-- 4. FORMS WITH NO RESTRICTIONS
-- =====================================================

SELECT '📊 Step 4: Forms with no restrictions...' as step;

-- Count forms with no office restrictions
SELECT 
    'Forms with no restrictions (accessible to all):' as info,
    COUNT(*) as unrestricted_forms
FROM page_configurations 
WHERE selected_offices IS NULL OR jsonb_array_length(selected_offices) = 0;

-- =====================================================
-- 5. FORMS WITH RESTRICTIONS
-- =====================================================

SELECT '📊 Step 5: Forms with restrictions...' as step;

-- Count forms with office restrictions
SELECT 
    'Forms with office restrictions:' as info,
    COUNT(*) as restricted_forms
FROM page_configurations 
WHERE selected_offices IS NOT NULL AND jsonb_array_length(selected_offices) > 0;

-- =====================================================
-- 6. TOTAL ACCESS FOR "Ondipudur SO"
-- =====================================================

SELECT '📊 Step 6: Total access summary...' as step;

-- Count total forms accessible to "Ondipudur SO"
SELECT 
    'Total forms accessible to "Ondipudur SO":' as summary,
    COUNT(*) as accessible_forms
FROM page_configurations 
WHERE selected_offices IS NULL 
   OR jsonb_array_length(selected_offices) = 0 
   OR selected_offices ? 'Ondipudur SO';

-- =====================================================
-- 7. SAMPLE OFFICE NAMES IN TARGETING
-- =====================================================

SELECT '📊 Step 7: Sample office names in targeting...' as step;

-- Show sample office names being used in targeting
SELECT 
    'Sample office names in form targeting:' as info,
    office_name,
    COUNT(*) as forms_using_this_office
FROM page_configurations,
     jsonb_array_elements_text(selected_offices) as office_name
WHERE selected_offices IS NOT NULL 
  AND jsonb_array_length(selected_offices) > 0
  AND NOT (office_name LIKE 'PO%' AND length(office_name) > 10)
GROUP BY office_name
ORDER BY forms_using_this_office DESC, office_name
LIMIT 10;

-- =====================================================
-- 8. SUCCESS VERIFICATION
-- =====================================================

SELECT '✅ Step 8: Success verification...' as step;

-- Check if fix was successful
SELECT 
    'Facility ID check:' as check_1,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM page_configurations,
                         jsonb_array_elements_text(selected_offices) as office_id
            WHERE office_id LIKE 'PO%' AND length(office_id) > 10
        )
        THEN '✅ SUCCESS: No facility IDs found'
        ELSE '❌ ISSUE: Facility IDs still present'
    END as result_1;

-- Check if "Ondipudur SO" has access to forms
SELECT 
    'Ondipudur SO access check:' as check_2,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM page_configurations 
            WHERE selected_offices IS NULL 
               OR jsonb_array_length(selected_offices) = 0 
               OR selected_offices ? 'Ondipudur SO'
        )
        THEN '✅ SUCCESS: "Ondipudur SO" has form access'
        ELSE '❌ ISSUE: "Ondipudur SO" has no access'
    END as result_2;

-- Check newreport form specifically
SELECT 
    'newreport access check:' as check_3,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM page_configurations 
            WHERE id = 'newreport' 
              AND (selected_offices IS NULL 
                   OR jsonb_array_length(selected_offices) = 0 
                   OR selected_offices ? 'Ondipudur SO')
        )
        THEN '✅ SUCCESS: newreport accessible to "Ondipudur SO"'
        ELSE '❌ ISSUE: newreport not accessible to "Ondipudur SO"'
    END as result_3;

-- =====================================================
-- 9. FINAL SUMMARY
-- =====================================================

SELECT '📊 FINAL SUMMARY:' as summary;

-- Overall statistics
SELECT 'Total forms:' as metric, COUNT(*) as value FROM page_configurations;
SELECT 'Unrestricted forms:' as metric, COUNT(*) as value FROM page_configurations WHERE selected_offices IS NULL OR jsonb_array_length(selected_offices) = 0;
SELECT 'Restricted forms:' as metric, COUNT(*) as value FROM page_configurations WHERE selected_offices IS NOT NULL AND jsonb_array_length(selected_offices) > 0;
SELECT 'Forms accessible to Ondipudur SO:' as metric, COUNT(*) as value FROM page_configurations WHERE selected_offices IS NULL OR jsonb_array_length(selected_offices) = 0 OR selected_offices ? 'Ondipudur SO';
SELECT 'Forms still using facility IDs:' as metric, COUNT(*) as value FROM page_configurations WHERE EXISTS (SELECT 1 FROM jsonb_array_elements_text(selected_offices) as office_id WHERE office_id LIKE 'PO%' AND length(office_id) > 10);

-- =====================================================
-- 10. NEXT STEPS
-- =====================================================

SELECT '📋 NEXT STEPS:' as next_steps;

SELECT '1. If all checks show SUCCESS, restart your Flutter app' as step_1;
SELECT '2. Try accessing the newreport form' as step_2;
SELECT '3. Check console logs for: "User CAN access form: newreport"' as step_3;
SELECT '4. If issues remain, check admin panel office selection logic' as step_4;

-- =====================================================
-- EXPECTED FLUTTER OUTPUT
-- =====================================================

/*
EXPECTED FLUTTER CONSOLE OUTPUT AFTER SUCCESSFUL FIX:

🔒 FormFilteringService: Checking access for form: newreport
🔒 FormFilteringService: User office name: "Ondipudur SO"
🔒 FormFilteringService: Form config: {...}
🔍 FormFilteringService: checkFormAccess called
🔍 FormFilteringService: userOfficeName = "Ondipudur SO"
🔍 FormFilteringService: formOfficeTargeting = ["Ondipudur SO", ...] OR null

EITHER:
✅ FormFilteringService: Form has no office restrictions, allowing access

OR:
🔍 FormFilteringService: Target[0]: "Ondipudur SO" -> "ondipudur so" -> Match: true
✅ FormFilteringService: Final access decision: GRANTED

FINAL RESULT:
🔒 FormFilteringService: User CAN access form: newreport
*/

SELECT '🎉 VERIFICATION COMPLETE!' as status;
