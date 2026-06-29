-- =====================================================
-- MINIMAL FIX FOR NEWREPORT FORM ACCESS ISSUE
-- =====================================================

-- This version only uses columns that definitely exist

-- =====================================================
-- 1. CHECK CURRENT STATE
-- =====================================================

SELECT '🔍 Step 1: Checking current newreport form state...' as step;

-- Check if newreport form exists
SELECT 
    '📋 Current newreport form:' as info,
    id,
    title,
    selected_offices,
    CASE 
        WHEN selected_offices IS NULL THEN 'NULL (should allow all users)'
        WHEN jsonb_array_length(selected_offices) = 0 THEN 'EMPTY (allows all users)'
        ELSE 'HAS RESTRICTIONS: ' || selected_offices::text
    END as access_level
FROM page_configurations 
WHERE id = 'newreport';

-- =====================================================
-- 2. FIX THE NEWREPORT FORM
-- =====================================================

SELECT '🔧 Step 2: Fixing newreport form...' as step;

-- Simple fix: Create or update newreport form to allow all users
INSERT INTO page_configurations (id, title, selected_offices) 
VALUES ('newreport', 'New Report', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET 
    selected_offices = '[]'::jsonb,
    title = COALESCE(EXCLUDED.title, page_configurations.title);

SELECT '✅ newreport form fixed - now allows all users' as result;

-- =====================================================
-- 3. VERIFY THE FIX
-- =====================================================

SELECT '🔍 Step 3: Verifying the fix...' as step;

-- Check the updated configuration
SELECT 
    '✅ Updated newreport form:' as info,
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
-- 4. TEST FOR "Ondipudur SO" OFFICE
-- =====================================================

SELECT '🧪 Step 4: Testing access for "Ondipudur SO"...' as step;

-- Test 1: Check newreport form access for "Ondipudur SO"
SELECT 
    '🔍 newreport access for "Ondipudur SO":' as test,
    id,
    title,
    selected_offices,
    CASE 
        WHEN selected_offices IS NULL OR jsonb_array_length(selected_offices) = 0 
        THEN '✅ HAS ACCESS (no restrictions)'
        WHEN selected_offices ? 'Ondipudur SO'
        THEN '✅ HAS ACCESS (office in list)'
        ELSE '❌ NO ACCESS (office not in list)'
    END as access_result
FROM page_configurations 
WHERE id = 'newreport';

-- Test 2: Check if "Ondipudur SO" is targeted by any forms
SELECT 
    '🔍 Forms targeting "Ondipudur SO":' as test,
    COUNT(*) as form_count
FROM page_configurations 
WHERE selected_offices ? 'Ondipudur SO';

-- Test 3: Show forms that target "Ondipudur SO" (if any)
SELECT 
    '📋 Forms that target "Ondipudur SO":' as info,
    id,
    title,
    selected_offices
FROM page_configurations 
WHERE selected_offices ? 'Ondipudur SO'
ORDER BY id;

-- =====================================================
-- 5. SHOW ALL FORMS ACCESS STATUS
-- =====================================================

SELECT '📊 Step 5: All forms access status for "Ondipudur SO"...' as step;

-- Show access status for all forms
SELECT 
    id as form_id,
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
ORDER BY 
    CASE 
        WHEN selected_offices IS NULL OR jsonb_array_length(selected_offices) = 0 THEN 0
        WHEN selected_offices ? 'Ondipudur SO' THEN 1
        ELSE 2
    END,
    id;

-- =====================================================
-- 6. OFFICE ANALYSIS
-- =====================================================

SELECT '📊 Step 6: Office targeting analysis...' as step;

-- Count forms with no restrictions vs restricted forms
SELECT 
    '📈 Forms summary:' as summary,
    SUM(CASE WHEN selected_offices IS NULL OR jsonb_array_length(selected_offices) = 0 THEN 1 ELSE 0 END) as unrestricted_forms,
    SUM(CASE WHEN selected_offices IS NOT NULL AND jsonb_array_length(selected_offices) > 0 THEN 1 ELSE 0 END) as restricted_forms,
    COUNT(*) as total_forms
FROM page_configurations;

-- Show all offices mentioned in targeting (if any)
SELECT 
    '🏢 Offices mentioned in form targeting:' as info,
    office_name,
    COUNT(*) as forms_count
FROM page_configurations,
     jsonb_array_elements_text(selected_offices) as office_name
WHERE selected_offices IS NOT NULL 
  AND jsonb_array_length(selected_offices) > 0
GROUP BY office_name
ORDER BY forms_count DESC, office_name;

-- =====================================================
-- 7. FINAL VERIFICATION
-- =====================================================

SELECT '🎯 Step 7: Final verification...' as step;

-- Final check: Is "Ondipudur SO" mentioned in any form targeting?
SELECT 
    '🔍 Is "Ondipudur SO" in any targeting list?' as question,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM page_configurations,
                         jsonb_array_elements_text(selected_offices) as office_name
            WHERE office_name = 'Ondipudur SO'
        )
        THEN '✅ YES - Found in targeting lists'
        ELSE '❌ NO - Not in any targeting lists (forms allow all users)'
    END as answer;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT '🎉 ANALYSIS COMPLETE!' as status;

SELECT 
    'Key findings:' as findings,
    'Check the output above for detailed access analysis' as details;

SELECT 
    'Expected for newreport:' as expectation,
    '✅ ACCESSIBLE TO ALL USERS (including Ondipudur SO)' as result;

-- =====================================================
-- NEXT STEPS
-- =====================================================

SELECT '📋 NEXT STEPS:' as next_steps;

SELECT '1. Restart your Flutter app' as step_1;
SELECT '2. Try accessing newreport form' as step_2;
SELECT '3. Should see: "Form has no office restrictions, allowing access"' as step_3;
SELECT '4. Form should load successfully' as step_4;

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================

/*
TROUBLESHOOTING:

If newreport still doesn't work after this fix:

1. Check the form ID in your Flutter app:
   - Make sure it's exactly "newreport" (case-sensitive)
   - Check FormFilteringService.canUserAccessForm() call

2. Check user office name:
   - Should be "Ondipudur SO" 
   - Verify in user_profiles table

3. Check console logs:
   - Should show: "Form has no office restrictions, allowing access"
   - If not, there might be a caching issue

4. Clear app cache:
   - Hot restart might not be enough
   - Try full app restart

5. Emergency fix (if nothing works):
   UPDATE page_configurations SET selected_offices = '[]'::jsonb;
   -- This makes ALL forms accessible to ALL users
*/
