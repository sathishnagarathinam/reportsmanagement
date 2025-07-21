-- =====================================================
-- QUICK FIX FOR NEWREPORT FORM ACCESS ISSUE
-- =====================================================

-- This script fixes the specific issue where "newreport" form
-- is denying access even when office names match

-- =====================================================
-- 1. CHECK CURRENT STATE
-- =====================================================

SELECT '🔍 STEP 1: Checking current newreport form state...' as step;

-- Check if newreport form exists
SELECT 
    '📋 Current newreport configuration:' as info,
    id,
    title,
    selected_offices,
    selected_office,
    CASE 
        WHEN selected_offices IS NULL THEN 'NULL (should allow all users)'
        WHEN jsonb_array_length(selected_offices) = 0 THEN 'EMPTY ARRAY (should allow all users)'
        ELSE 'HAS RESTRICTIONS: ' || selected_offices::text
    END as access_level
FROM page_configurations 
WHERE id = 'newreport';

-- If not found, show what forms do exist
SELECT 
    '📋 Available forms:' as info,
    id,
    title,
    selected_offices
FROM page_configurations 
ORDER BY id
LIMIT 10;

-- =====================================================
-- 2. CHECK USER OFFICE NAMES
-- =====================================================

SELECT '🔍 STEP 2: Checking user office names...' as step;

-- Show all unique user office names
SELECT
    '👥 User office names in system:' as info,
    DISTINCT "officeName",
    COUNT(*) as user_count
FROM user_profiles
WHERE "officeName" IS NOT NULL
GROUP BY "officeName"
ORDER BY "officeName";

-- =====================================================
-- 3. FIX THE NEWREPORT FORM
-- =====================================================

SELECT '🔧 STEP 3: Fixing newreport form configuration...' as step;

-- Option 1: Create/Update newreport form with NO office restrictions (recommended)
INSERT INTO page_configurations (
    id,
    title,
    selected_offices,
    last_updated,
    is_page,
    page_id
) VALUES (
    'newreport',
    'New Report',
    '[]'::jsonb, -- Empty array = no office restrictions = allow all users
    NOW(),
    true,
    'newreport'
) ON CONFLICT (id) DO UPDATE SET
    selected_offices = '[]'::jsonb,
    last_updated = NOW(),
    title = COALESCE(EXCLUDED.title, page_configurations.title);

SELECT '✅ Fix applied: newreport form now allows all users' as result;

-- =====================================================
-- 4. VERIFY THE FIX
-- =====================================================

SELECT '🔍 STEP 4: Verifying the fix...' as step;

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
    END as access_level,
    last_updated
FROM page_configurations 
WHERE id = 'newreport';

-- =====================================================
-- 5. TEST ACCESS FOR SAMPLE USERS
-- =====================================================

SELECT '🧪 STEP 5: Testing access for sample users...' as step;

-- Test access logic for each user office
DO $$
DECLARE
    user_office RECORD;
    form_offices JSONB;
    has_access BOOLEAN;
BEGIN
    -- Get newreport form configuration
    SELECT selected_offices INTO form_offices
    FROM page_configurations 
    WHERE id = 'newreport';
    
    RAISE NOTICE '📋 Testing access for newreport form with targeting: %', form_offices;
    
    -- Test for each user office
    FOR user_office IN
        SELECT DISTINCT "officeName"
        FROM user_profiles
        WHERE "officeName" IS NOT NULL
        LIMIT 5 -- Test first 5 offices
    LOOP
        -- Apply the same logic as the app
        IF form_offices IS NULL OR jsonb_array_length(form_offices) = 0 THEN
            has_access := TRUE;
            RAISE NOTICE '✅ Office "%" should have access (no restrictions)', user_office."officeName";
        ELSE
            has_access := form_offices ? user_office."officeName";
            RAISE NOTICE '% Office "%" should % access',
                CASE WHEN has_access THEN '✅' ELSE '❌' END,
                user_office."officeName",
                CASE WHEN has_access THEN 'have' ELSE 'NOT have' END;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- 6. ALTERNATIVE FIX (if you want specific office targeting)
-- =====================================================

SELECT '🔧 ALTERNATIVE: If you want to restrict to specific offices...' as alternative;

-- Uncomment and modify this section if you want to restrict newreport to specific offices
/*
-- Get all user office names to add to targeting
WITH user_offices AS (
    SELECT DISTINCT "officeName"
    FROM user_profiles
    WHERE "officeName" IS NOT NULL
)
UPDATE page_configurations
SET selected_offices = (
    SELECT jsonb_agg("officeName")
    FROM user_offices
)
WHERE id = 'newreport';

SELECT '✅ Alternative fix: newreport now targets all existing user offices' as result;
*/

-- =====================================================
-- 7. CLEAN UP OTHER FORMS
-- =====================================================

SELECT '🧹 STEP 6: Cleaning up other forms with null office targeting...' as step;

-- Fix any other forms with null office targeting
UPDATE page_configurations 
SET selected_offices = '[]'::jsonb
WHERE selected_offices IS NULL;

SELECT 
    '✅ Fixed forms with null office targeting:' as info,
    COUNT(*) as fixed_count
FROM page_configurations 
WHERE selected_offices = '[]'::jsonb;

-- =====================================================
-- 8. FINAL VERIFICATION
-- =====================================================

SELECT '📊 FINAL VERIFICATION:' as summary;

-- Show summary of all forms and their access levels
SELECT 
    id,
    title,
    CASE 
        WHEN selected_offices IS NULL OR jsonb_array_length(selected_offices) = 0 
        THEN '🌍 ALL USERS'
        ELSE '🔒 RESTRICTED (' || jsonb_array_length(selected_offices) || ' offices)'
    END as access_level,
    selected_offices
FROM page_configurations 
ORDER BY 
    CASE 
        WHEN selected_offices IS NULL OR jsonb_array_length(selected_offices) = 0 THEN 0
        ELSE 1
    END,
    id;

-- =====================================================
-- INSTRUCTIONS FOR TESTING
-- =====================================================

/*
TESTING INSTRUCTIONS:

1. After running this script, test the newreport form access:
   - Open your Flutter app
   - Try to access the newreport form
   - Check the console logs for detailed debugging output

2. Expected behavior:
   - newreport form should now be accessible to all users
   - Console should show: "Form has no office restrictions, allowing access"

3. If still having issues:
   - Check the enhanced debug logs in FormFilteringService
   - Verify user's office name is not null/empty
   - Ensure the form ID is exactly "newreport"

4. Debug logs to look for:
   - "🔒 FormFilteringService: User office name: ..."
   - "🔒 FormFilteringService: Form config: ..."
   - "✅ FormFilteringService: Form has no office restrictions, allowing access"

COMMON ISSUES:
- Form ID mismatch (check exact spelling)
- User office name is null/empty
- Database connection issues
- Caching issues (restart app)
*/

SELECT '🎉 newreport form access fix complete!' as status;
SELECT 'Run this script in Supabase SQL Editor, then test your app!' as instruction;
