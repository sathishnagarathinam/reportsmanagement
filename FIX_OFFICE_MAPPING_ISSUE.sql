-- =====================================================
-- FIX OFFICE MAPPING ISSUE IN PAGE CONFIGURATIONS
-- =====================================================

-- This script converts facility IDs to office names in page_configurations
-- to fix the office-based form filtering mismatch

-- =====================================================
-- 1. ANALYZE THE CURRENT PROBLEM
-- =====================================================

SELECT '🔍 STEP 1: Analyzing the current data mapping issue...' as step;

-- Check the offices table structure
SELECT 
    '📋 Offices table structure:' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'offices'
ORDER BY ordinal_position;

-- Show sample facility ID to office name mapping
SELECT 
    '🏢 Sample facility ID to office name mapping:' as info,
    "Facility ID",
    "Office name",
    "Region",
    "Division"
FROM offices 
WHERE "Facility ID" IS NOT NULL 
  AND "Office name" IS NOT NULL
ORDER BY "Office name"
LIMIT 10;

-- Check current page_configurations with facility IDs
SELECT 
    '📋 Forms currently using facility IDs:' as info,
    id,
    title,
    jsonb_array_length(selected_offices) as office_count,
    selected_offices
FROM page_configurations 
WHERE selected_offices IS NOT NULL 
  AND jsonb_array_length(selected_offices) > 0
ORDER BY id;

-- =====================================================
-- 2. CREATE MAPPING FUNCTION
-- =====================================================

SELECT '🔧 STEP 2: Creating facility ID to office name mapping...' as step;

-- Create a function to convert facility IDs to office names
CREATE OR REPLACE FUNCTION convert_facility_ids_to_office_names(facility_ids JSONB)
RETURNS JSONB AS $$
DECLARE
    facility_id TEXT;
    office_name TEXT;
    result JSONB := '[]'::JSONB;
BEGIN
    -- Loop through each facility ID in the array
    FOR facility_id IN SELECT jsonb_array_elements_text(facility_ids)
    LOOP
        -- Find the corresponding office name
        SELECT "Office name" INTO office_name
        FROM offices 
        WHERE "Facility ID" = facility_id;
        
        -- If office name found, add it to result
        IF office_name IS NOT NULL THEN
            result := result || jsonb_build_array(office_name);
        ELSE
            -- If no mapping found, keep the original facility ID with a warning
            result := result || jsonb_build_array('UNMAPPED: ' || facility_id);
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Mapping function created successfully' as result;

-- =====================================================
-- 3. TEST THE MAPPING FUNCTION
-- =====================================================

SELECT '🧪 STEP 3: Testing the mapping function...' as step;

-- Test the function with sample facility IDs
SELECT 
    '🧪 Testing facility ID to office name conversion:' as test,
    original_ids,
    convert_facility_ids_to_office_names(original_ids) as converted_names
FROM (
    SELECT selected_offices as original_ids
    FROM page_configurations 
    WHERE id = 'newreport'
    LIMIT 1
) test_data;

-- Show detailed mapping for verification
WITH facility_mapping AS (
    SELECT 
        facility_id,
        "Office name" as office_name
    FROM (
        SELECT jsonb_array_elements_text(selected_offices) as facility_id
        FROM page_configurations 
        WHERE id = 'newreport'
    ) facility_ids
    LEFT JOIN offices ON offices."Facility ID" = facility_ids.facility_id
)
SELECT 
    '🔍 Detailed mapping verification:' as info,
    facility_id,
    COALESCE(office_name, 'NOT FOUND') as office_name,
    CASE 
        WHEN office_name IS NOT NULL THEN '✅ MAPPED'
        ELSE '❌ UNMAPPED'
    END as status
FROM facility_mapping
ORDER BY status, facility_id
LIMIT 20;

-- =====================================================
-- 4. BACKUP CURRENT DATA
-- =====================================================

SELECT '💾 STEP 4: Creating backup of current data...' as step;

-- Create backup table
CREATE TABLE IF NOT EXISTS page_configurations_backup AS 
SELECT 
    id,
    title,
    selected_offices,
    NOW() as backup_timestamp
FROM page_configurations 
WHERE selected_offices IS NOT NULL 
  AND jsonb_array_length(selected_offices) > 0;

SELECT 
    '✅ Backup created:' as info,
    COUNT(*) as backed_up_forms
FROM page_configurations_backup;

-- =====================================================
-- 5. CONVERT FACILITY IDS TO OFFICE NAMES
-- =====================================================

SELECT '🔄 STEP 5: Converting facility IDs to office names...' as step;

-- Update all page_configurations to use office names instead of facility IDs
UPDATE page_configurations 
SET selected_offices = convert_facility_ids_to_office_names(selected_offices)
WHERE selected_offices IS NOT NULL 
  AND jsonb_array_length(selected_offices) > 0;

SELECT 
    '✅ Conversion completed:' as info,
    COUNT(*) as updated_forms
FROM page_configurations 
WHERE selected_offices IS NOT NULL 
  AND jsonb_array_length(selected_offices) > 0;

-- =====================================================
-- 6. VERIFICATION QUERIES
-- =====================================================

SELECT '✅ STEP 6: Verifying the conversion...' as step;

-- Verify the conversion was successful
SELECT 
    '📊 Conversion verification:' as info,
    id,
    title,
    jsonb_array_length(selected_offices) as office_count,
    selected_offices
FROM page_configurations 
WHERE selected_offices IS NOT NULL 
  AND jsonb_array_length(selected_offices) > 0
ORDER BY id;

-- Check for any unmapped facility IDs
SELECT 
    '⚠️ Unmapped facility IDs (need manual review):' as warning,
    id,
    title,
    office_entry
FROM page_configurations,
     jsonb_array_elements_text(selected_offices) as office_entry
WHERE office_entry LIKE 'UNMAPPED:%'
ORDER BY id;

-- Test access for "Ondipudur SO" after conversion
SELECT 
    '🧪 Testing "Ondipudur SO" access after conversion:' as test,
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

-- =====================================================
-- 7. CLEAN UP UNMAPPED ENTRIES
-- =====================================================

SELECT '🧹 STEP 7: Cleaning up unmapped entries...' as step;

-- Remove unmapped entries and show what was removed
WITH unmapped_cleanup AS (
    UPDATE page_configurations 
    SET selected_offices = (
        SELECT jsonb_agg(office_entry)
        FROM jsonb_array_elements_text(selected_offices) as office_entry
        WHERE NOT office_entry LIKE 'UNMAPPED:%'
    )
    WHERE EXISTS (
        SELECT 1 
        FROM jsonb_array_elements_text(selected_offices) as office_entry
        WHERE office_entry LIKE 'UNMAPPED:%'
    )
    RETURNING id, title
)
SELECT 
    '🧹 Cleaned up unmapped entries from:' as info,
    COUNT(*) as cleaned_forms
FROM unmapped_cleanup;

-- =====================================================
-- 8. FINAL VERIFICATION
-- =====================================================

SELECT '🎯 STEP 8: Final verification...' as step;

-- Final check: Show all forms and their office targeting
SELECT 
    '📊 Final form configurations:' as summary,
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

-- Check if "Ondipudur SO" now has access to forms
SELECT 
    '🎯 Forms accessible to "Ondipudur SO":' as summary,
    COUNT(*) as accessible_forms
FROM page_configurations 
WHERE selected_offices IS NULL 
   OR jsonb_array_length(selected_offices) = 0 
   OR selected_offices ? 'Ondipudur SO';

-- =====================================================
-- 9. SUCCESS MESSAGE
-- =====================================================

SELECT '🎉 OFFICE MAPPING CONVERSION COMPLETE!' as status;

SELECT 
    'What was fixed:' as summary_1,
    'Facility IDs converted to office names in page_configurations' as description_1;

SELECT 
    'Result:' as summary_2,
    'Office-based form filtering should now work correctly' as description_2;

SELECT 
    'Next steps:' as summary_3,
    'Test form access in your Flutter app' as description_3;

-- =====================================================
-- CLEANUP FUNCTION
-- =====================================================

-- Drop the temporary function
DROP FUNCTION IF EXISTS convert_facility_ids_to_office_names(JSONB);

SELECT '🧹 Temporary function cleaned up' as cleanup;
