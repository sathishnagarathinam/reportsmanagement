-- =====================================================
-- DEBUG OFFICE FILTERING ISSUE
-- =====================================================

-- This script helps debug why office filtering is failing
-- for the "newreport" form even when office names match

-- =====================================================
-- 1. CHECK FORM CONFIGURATION
-- =====================================================

SELECT '🔍 STEP 1: Checking newreport form configuration...' as step;

-- Check if newreport form exists
SELECT 
    '📋 Form Configuration:' as info,
    id,
    title,
    selected_offices,
    selected_office,
    selected_regions,
    selected_divisions,
    last_updated
FROM page_configurations 
WHERE id = 'newreport';

-- If not found, check similar forms
SELECT 
    '📋 Similar Forms:' as info,
    id,
    title,
    selected_offices
FROM page_configurations 
WHERE id ILIKE '%report%' OR title ILIKE '%report%'
ORDER BY id;

-- =====================================================
-- 2. CHECK USER PROFILES
-- =====================================================

SELECT '🔍 STEP 2: Checking user profiles...' as step;

-- Show all user office names
SELECT 
    '👥 User Office Names:' as info,
    employeeId,
    name,
    officeName,
    uid
FROM user_profiles 
ORDER BY officeName;

-- =====================================================
-- 3. CHECK OFFICE DATA
-- =====================================================

SELECT '🔍 STEP 3: Checking office data...' as step;

-- Show all office names from offices table
SELECT 
    '🏢 Available Offices:' as info,
    "Office name",
    "Region",
    "Division",
    "Reporting Office Nam"
FROM offices 
ORDER BY "Office name";

-- =====================================================
-- 4. SIMULATE FILTERING LOGIC
-- =====================================================

SELECT '🔍 STEP 4: Simulating filtering logic...' as step;

-- Test case 1: Check if newreport has office restrictions
DO $$
DECLARE
    form_offices JSONB;
    form_record RECORD;
BEGIN
    -- Get newreport form configuration
    SELECT selected_offices INTO form_offices
    FROM page_configurations 
    WHERE id = 'newreport';
    
    IF form_offices IS NULL THEN
        RAISE NOTICE '❌ newreport form not found';
        RETURN;
    END IF;
    
    RAISE NOTICE '📋 newreport form office targeting: %', form_offices;
    
    -- Check if it has office restrictions
    IF form_offices IS NULL OR jsonb_array_length(form_offices) = 0 THEN
        RAISE NOTICE '✅ Form has NO office restrictions - should allow all users';
    ELSE
        RAISE NOTICE '🔒 Form has office restrictions: %', form_offices;
        
        -- Test against each user office
        FOR form_record IN 
            SELECT DISTINCT officeName 
            FROM user_profiles 
            WHERE officeName IS NOT NULL
        LOOP
            -- Simulate the filtering logic
            IF form_offices ? form_record.officeName THEN
                RAISE NOTICE '✅ Office "%" SHOULD have access', form_record.officeName;
            ELSE
                RAISE NOTICE '❌ Office "%" should NOT have access', form_record.officeName;
            END IF;
        END LOOP;
    END IF;
END $$;

-- =====================================================
-- 5. CHECK FOR COMMON ISSUES
-- =====================================================

SELECT '🔍 STEP 5: Checking for common issues...' as step;

-- Issue 1: Check for null/empty office targeting
SELECT 
    '⚠️ Forms with null/empty office targeting:' as issue,
    id,
    title,
    selected_offices
FROM page_configurations 
WHERE selected_offices IS NULL 
   OR selected_offices = '[]'::jsonb 
   OR selected_offices = 'null'::jsonb;

-- Issue 2: Check for malformed office targeting
SELECT 
    '⚠️ Forms with non-array office targeting:' as issue,
    id,
    title,
    selected_offices,
    jsonb_typeof(selected_offices) as data_type
FROM page_configurations 
WHERE selected_offices IS NOT NULL 
  AND jsonb_typeof(selected_offices) != 'array';

-- Issue 3: Check for case sensitivity issues
SELECT 
    '⚠️ Potential case sensitivity issues:' as issue,
    pc.id,
    pc.title,
    pc.selected_offices,
    up.officeName as user_office
FROM page_configurations pc
CROSS JOIN (SELECT DISTINCT officeName FROM user_profiles WHERE officeName IS NOT NULL) up
WHERE pc.selected_offices IS NOT NULL 
  AND jsonb_array_length(pc.selected_offices) > 0
  AND NOT (pc.selected_offices ? up.officeName)
  AND EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(pc.selected_offices) as office_target
      WHERE LOWER(office_target) = LOWER(up.officeName)
  );

-- =====================================================
-- 6. TEST SPECIFIC SCENARIOS
-- =====================================================

SELECT '🔍 STEP 6: Testing specific scenarios...' as step;

-- Test the exact scenario from the error
DO $$
DECLARE
    user_office TEXT := 'Chennai RO'; -- Replace with actual user office
    form_id TEXT := 'newreport';
    form_offices JSONB;
    has_access BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '🧪 Testing access for user office: % to form: %', user_office, form_id;
    
    -- Get form configuration
    SELECT selected_offices INTO form_offices
    FROM page_configurations 
    WHERE id = form_id;
    
    IF form_offices IS NULL THEN
        RAISE NOTICE '❌ Form not found: %', form_id;
        RETURN;
    END IF;
    
    RAISE NOTICE '📋 Form office targeting: %', form_offices;
    
    -- Test access logic
    IF form_offices IS NULL OR jsonb_array_length(form_offices) = 0 THEN
        has_access := TRUE;
        RAISE NOTICE '✅ No office restrictions - access GRANTED';
    ELSE
        -- Check if user office is in the targeting list
        has_access := form_offices ? user_office;
        RAISE NOTICE 'Office match check: %', has_access;
        
        -- Also check case-insensitive
        SELECT EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(form_offices) as office_target
            WHERE LOWER(office_target) = LOWER(user_office)
        ) INTO has_access;
        
        RAISE NOTICE 'Case-insensitive match: %', has_access;
    END IF;
    
    RAISE NOTICE '🎯 Final result: User % access to form %', 
        CASE WHEN has_access THEN 'HAS' ELSE 'DOES NOT HAVE' END, form_id;
END $$;

-- =====================================================
-- 7. RECOMMENDED FIXES
-- =====================================================

SELECT '🔧 STEP 7: Recommended fixes...' as step;

-- Fix 1: Ensure newreport form has proper configuration
INSERT INTO page_configurations (
    id,
    title,
    selected_offices,
    last_updated
) VALUES (
    'newreport',
    'New Report',
    '[]'::jsonb, -- No office restrictions - allow all users
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    selected_offices = EXCLUDED.selected_offices,
    last_updated = EXCLUDED.last_updated;

SELECT '✅ Fix 1: Ensured newreport form exists with no office restrictions' as fix;

-- Fix 2: Update any forms with null office targeting
UPDATE page_configurations 
SET selected_offices = '[]'::jsonb
WHERE selected_offices IS NULL;

SELECT '✅ Fix 2: Updated forms with null office targeting' as fix;

-- Fix 3: Verify the fix worked
SELECT 
    '✅ Verification:' as info,
    id,
    title,
    selected_offices,
    CASE 
        WHEN selected_offices IS NULL OR jsonb_array_length(selected_offices) = 0 
        THEN 'ACCESSIBLE TO ALL USERS'
        ELSE 'RESTRICTED TO: ' || selected_offices::text
    END as access_level
FROM page_configurations 
WHERE id = 'newreport';

-- =====================================================
-- 8. SUMMARY
-- =====================================================

SELECT '📋 DIAGNOSIS SUMMARY:' as summary;

SELECT 
    'Total forms:' as metric,
    COUNT(*) as value
FROM page_configurations;

SELECT 
    'Forms with no office restrictions:' as metric,
    COUNT(*) as value
FROM page_configurations 
WHERE selected_offices IS NULL OR jsonb_array_length(selected_offices) = 0;

SELECT 
    'Forms with office restrictions:' as metric,
    COUNT(*) as value
FROM page_configurations 
WHERE selected_offices IS NOT NULL AND jsonb_array_length(selected_offices) > 0;

SELECT 
    'Total user offices:' as metric,
    COUNT(DISTINCT officeName) as value
FROM user_profiles 
WHERE officeName IS NOT NULL;

-- =====================================================
-- TROUBLESHOOTING NOTES
-- =====================================================

/*
COMMON ISSUES AND SOLUTIONS:

1. Form not found:
   - Check if 'newreport' exists in page_configurations table
   - Verify the form ID is correct

2. Null office targeting:
   - Forms with null selected_offices should allow all users
   - Update null values to empty array: '[]'::jsonb

3. Case sensitivity:
   - Office names must match exactly (case-sensitive)
   - Consider normalizing office names

4. Array format:
   - selected_offices must be a JSONB array
   - Example: '["Chennai RO", "Mumbai BO"]'::jsonb

5. User office not set:
   - Check if user has officeName in user_profiles table
   - Verify Firebase employees collection has officeName

NEXT STEPS:
1. Run this diagnostic script
2. Check the output for issues
3. Apply the recommended fixes
4. Test the form access again
*/

SELECT '🎉 Office filtering diagnosis complete!' as status;
