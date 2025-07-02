-- =====================================================
-- VERIFY OFFICE MAPPING FIX
-- =====================================================

-- Quick verification script to check if the office mapping fix worked

-- =====================================================
-- 1. CHECK FOR REMAINING FACILITY IDs
-- =====================================================

SELECT '🔍 Checking for remaining facility IDs...' as step;

-- Count forms still using facility IDs
SELECT 
    'Forms still using facility IDs:' as check,
    COUNT(*) as count
FROM page_configurations 
WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(selected_offices) as office_id
    WHERE office_id LIKE 'PO%' AND length(office_id) > 10
);

-- Show any remaining facility IDs
SELECT 
    'Remaining facility IDs (should be empty):' as warning,
    id,
    title,
    office_id as facility_id
FROM page_configurations,
     jsonb_array_elements_text(selected_offices) as office_id
WHERE office_id LIKE 'PO%' AND length(office_id) > 10
ORDER BY id;

-- =====================================================
-- 2. CHECK OFFICE NAME CONVERSION
-- =====================================================

SELECT '🔍 Checking office name conversion...' as step;

-- Show sample converted office names
SELECT 
    'Sample office names in targeting:' as info,
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
-- 3. TEST SPECIFIC OFFICE ACCESS
-- =====================================================

SELECT '🧪 Testing "Ondipudur SO" access...' as step;

-- Check if "Ondipudur SO" is now in any form targeting
SELECT 
    'Forms targeting "Ondipudur SO":' as test,
    COUNT(*) as form_count
FROM page_configurations 
WHERE selected_offices ? 'Ondipudur SO';

-- Show forms that target "Ondipudur SO"
SELECT
    'Forms accessible to "Ondipudur SO":' as access,
    id,
    title,
    'Specifically targeted' as reason
FROM page_configurations
WHERE selected_offices ? 'Ondipudur SO'
UNION ALL
SELECT
    'Forms accessible to "Ondipudur SO":' as access,
    id,
    title,
    'No restrictions' as reason
FROM page_configurations
WHERE selected_offices IS NULL
   OR jsonb_array_length(selected_offices) = 0
ORDER BY reason, id;

-- =====================================================
-- 4. TEST NEWREPORT FORM
-- =====================================================

SELECT '🎯 Testing newreport form specifically...' as step;

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
-- 5. OVERALL STATISTICS
-- =====================================================

SELECT '📊 Overall statistics...' as step;

-- Summary statistics
SELECT 
    'Total forms:' as metric,
    COUNT(*) as value
FROM page_configurations
UNION ALL
SELECT 
    'Forms with no restrictions:',
    COUNT(*)
FROM page_configurations 
WHERE selected_offices IS NULL OR jsonb_array_length(selected_offices) = 0
UNION ALL
SELECT 
    'Forms with office restrictions:',
    COUNT(*)
FROM page_configurations 
WHERE selected_offices IS NOT NULL AND jsonb_array_length(selected_offices) > 0
UNION ALL
SELECT 
    'Forms accessible to "Ondipudur SO":',
    COUNT(*)
FROM page_configurations 
WHERE selected_offices IS NULL 
   OR jsonb_array_length(selected_offices) = 0 
   OR selected_offices ? 'Ondipudur SO';

-- =====================================================
-- 6. SUCCESS VERIFICATION
-- =====================================================

SELECT '✅ VERIFICATION RESULTS:' as results;

-- Check if fix was successful
SELECT 
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM page_configurations,
                         jsonb_array_elements_text(selected_offices) as office_id
            WHERE office_id LIKE 'PO%' AND length(office_id) > 10
        )
        THEN '✅ SUCCESS: No facility IDs found in form targeting'
        ELSE '❌ ISSUE: Facility IDs still present in form targeting'
    END as facility_id_check;

-- Check if "Ondipudur SO" has access to forms
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM page_configurations 
            WHERE selected_offices IS NULL 
               OR jsonb_array_length(selected_offices) = 0 
               OR selected_offices ? 'Ondipudur SO'
        )
        THEN '✅ SUCCESS: "Ondipudur SO" has access to forms'
        ELSE '❌ ISSUE: "Ondipudur SO" has no form access'
    END as ondipudur_access_check;

-- Check newreport form specifically
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM page_configurations 
            WHERE id = 'newreport' 
              AND (selected_offices IS NULL 
                   OR jsonb_array_length(selected_offices) = 0 
                   OR selected_offices ? 'Ondipudur SO')
        )
        THEN '✅ SUCCESS: "Ondipudur SO" can access newreport form'
        ELSE '❌ ISSUE: "Ondipudur SO" cannot access newreport form'
    END as newreport_access_check;

-- =====================================================
-- 7. NEXT STEPS
-- =====================================================

SELECT '📋 NEXT STEPS:' as next_steps;

SELECT '1. Restart your Flutter app to clear any cached data' as step_1;
SELECT '2. Test form access in the app' as step_2;
SELECT '3. Check console logs for success messages' as step_3;
SELECT '4. Verify form filtering works correctly' as step_4;

-- =====================================================
-- EXPECTED FLUTTER CONSOLE OUTPUT
-- =====================================================

/*
EXPECTED FLUTTER CONSOLE OUTPUT AFTER FIX:

🔒 FormFilteringService: Checking access for form: newreport
🔒 FormFilteringService: User office name: "Ondipudur SO"
🔒 FormFilteringService: Form config: {id: newreport, title: New Report, selected_offices: [...]}
🔍 FormFilteringService: checkFormAccess called
🔍 FormFilteringService: userOfficeName = "Ondipudur SO"
🔍 FormFilteringService: formOfficeTargeting = ["Ondipudur SO", "Other Office", ...]
✅ FormFilteringService: Form has office restrictions, but user office is in targeting list
🔒 FormFilteringService: Access result: GRANTED
🔒 FormFilteringService: User CAN access form: newreport

OR (if no restrictions):

✅ FormFilteringService: Form has no office restrictions, allowing access
🔒 FormFilteringService: Access result: GRANTED
🔒 FormFilteringService: User CAN access form: newreport
*/
