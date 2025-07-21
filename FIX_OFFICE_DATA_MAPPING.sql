-- =====================================================
-- FIX OFFICE DATA MAPPING ISSUE
-- =====================================================

-- This script fixes the data mapping issue where form configurations
-- store Facility IDs instead of Office names, causing filtering failures

-- =====================================================
-- 1. ANALYZE THE CURRENT PROBLEM
-- =====================================================

SELECT '🔍 STEP 1: Analyzing the current data mapping problem...' as step;

-- Check the offices table structure
SELECT 
    '📋 Offices table structure:' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'offices'
ORDER BY ordinal_position;

-- Show sample office data to understand the mapping
SELECT 
    '📊 Sample office data (first 10 records):' as info,
    "Facility ID",
    "Office name",
    "Region",
    "Division"
FROM offices 
LIMIT 10;

-- Count total offices available for mapping
SELECT 
    '📈 Office data summary:' as summary,
    COUNT(*) as total_offices,
    COUNT(DISTINCT "Facility ID") as unique_facility_ids,
    COUNT(DISTINCT "Office name") as unique_office_names
FROM offices;

-- =====================================================
-- 2. IDENTIFY AFFECTED FORMS
-- =====================================================

SELECT '🔍 STEP 2: Identifying forms with facility ID targeting...' as step;

-- Find forms that use facility IDs (starting with 'PO')
SELECT 
    '📋 Forms using facility IDs:' as info,
    id,
    title,
    jsonb_array_length(selected_offices) as office_count,
    selected_offices
FROM page_configurations 
WHERE selected_offices IS NOT NULL 
  AND jsonb_array_length(selected_offices) > 0
  AND EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(selected_offices) as office_id
      WHERE office_id LIKE 'PO%'
  )
ORDER BY id;

-- Count how many forms are affected
SELECT 
    '📊 Impact analysis:' as analysis,
    COUNT(*) as forms_with_facility_ids,
    SUM(jsonb_array_length(selected_offices)) as total_facility_id_references
FROM page_configurations 
WHERE selected_offices IS NOT NULL 
  AND jsonb_array_length(selected_offices) > 0
  AND EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(selected_offices) as office_id
      WHERE office_id LIKE 'PO%'
  );

-- =====================================================
-- 3. CREATE MAPPING FUNCTION
-- =====================================================

SELECT '🔧 STEP 3: Creating facility ID to office name mapping...' as step;

-- Create a function to map facility IDs to office names
CREATE OR REPLACE FUNCTION map_facility_id_to_office_name(facility_id TEXT)
RETURNS TEXT AS $$
DECLARE
    office_name TEXT;
BEGIN
    SELECT "Office name" INTO office_name
    FROM offices 
    WHERE "Facility ID" = facility_id;
    
    -- Return the office name if found, otherwise return the original facility_id
    RETURN COALESCE(office_name, facility_id);
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Mapping function created successfully' as result;

-- Test the mapping function with sample data
SELECT 
    '🧪 Testing mapping function:' as test,
    facility_id,
    map_facility_id_to_office_name(facility_id) as mapped_office_name
FROM (
    SELECT DISTINCT office_id as facility_id
    FROM page_configurations,
         jsonb_array_elements_text(selected_offices) as office_id
    WHERE office_id LIKE 'PO%'
    LIMIT 5
) sample_ids;

-- =====================================================
-- 4. PREVIEW THE CONVERSION
-- =====================================================

SELECT '🔍 STEP 4: Previewing the conversion...' as step;

-- Show what the conversion will look like for each form
SELECT 
    '📋 Conversion preview:' as preview,
    pc.id,
    pc.title,
    pc.selected_offices as current_facility_ids,
    (
        SELECT jsonb_agg(map_facility_id_to_office_name(office_id))
        FROM jsonb_array_elements_text(pc.selected_offices) as office_id
    ) as converted_office_names
FROM page_configurations pc
WHERE pc.selected_offices IS NOT NULL 
  AND jsonb_array_length(pc.selected_offices) > 0
  AND EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(pc.selected_offices) as office_id
      WHERE office_id LIKE 'PO%'
  )
ORDER BY pc.id;

-- =====================================================
-- 5. PERFORM THE CONVERSION
-- =====================================================

SELECT '🔧 STEP 5: Converting facility IDs to office names...' as step;

-- Update all forms to use office names instead of facility IDs
UPDATE page_configurations 
SET selected_offices = (
    SELECT jsonb_agg(map_facility_id_to_office_name(office_id))
    FROM jsonb_array_elements_text(selected_offices) as office_id
)
WHERE selected_offices IS NOT NULL 
  AND jsonb_array_length(selected_offices) > 0
  AND EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(selected_offices) as office_id
      WHERE office_id LIKE 'PO%'
  );

-- Get the number of updated forms (manual count since ROW_COUNT() doesn't exist)
SELECT
    '✅ Conversion completed:' as result,
    'Check verification section below for updated form count' as forms_updated;

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

SELECT '🔍 STEP 6: Verifying the conversion...' as step;

-- Verify that facility IDs have been converted to office names
SELECT 
    '📊 Post-conversion analysis:' as analysis,
    COUNT(*) as total_forms,
    SUM(CASE WHEN selected_offices IS NULL OR jsonb_array_length(selected_offices) = 0 THEN 1 ELSE 0 END) as unrestricted_forms,
    SUM(CASE WHEN selected_offices IS NOT NULL AND jsonb_array_length(selected_offices) > 0 THEN 1 ELSE 0 END) as restricted_forms,
    SUM(CASE WHEN EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(selected_offices) as office_id
        WHERE office_id LIKE 'PO%'
    ) THEN 1 ELSE 0 END) as forms_still_using_facility_ids
FROM page_configurations;

-- Show sample converted forms
SELECT 
    '📋 Sample converted forms:' as sample,
    id,
    title,
    selected_offices as office_names
FROM page_configurations 
WHERE selected_offices IS NOT NULL 
  AND jsonb_array_length(selected_offices) > 0
ORDER BY id
LIMIT 5;

-- Check if any facility IDs remain unconverted
SELECT 
    '⚠️ Unconverted facility IDs (if any):' as warning,
    id,
    title,
    office_id as unconverted_facility_id
FROM page_configurations,
     jsonb_array_elements_text(selected_offices) as office_id
WHERE office_id LIKE 'PO%'
ORDER BY id, office_id;

-- =====================================================
-- 7. TEST SPECIFIC CASE
-- =====================================================

SELECT '🧪 STEP 7: Testing specific case for "Ondipudur SO"...' as step;

-- Check if "Ondipudur SO" is now in any form targeting
SELECT 
    '🔍 Forms now targeting "Ondipudur SO":' as test,
    id,
    title,
    selected_offices
FROM page_configurations 
WHERE selected_offices ? 'Ondipudur SO'
ORDER BY id;

-- Test the newreport form specifically
SELECT 
    '🎯 newreport form access for "Ondipudur SO":' as test,
    id,
    title,
    selected_offices,
    CASE 
        WHEN selected_offices IS NULL OR jsonb_array_length(selected_offices) = 0 
        THEN '✅ HAS ACCESS (no restrictions)'
        WHEN selected_offices ? 'Ondipudur SO'
        THEN '✅ HAS ACCESS (office in targeting)'
        ELSE '❌ NO ACCESS (office not in targeting)'
    END as access_result
FROM page_configurations 
WHERE id = 'newreport';

-- =====================================================
-- 8. CLEANUP
-- =====================================================

SELECT '🧹 STEP 8: Cleaning up...' as step;

-- Drop the temporary mapping function
DROP FUNCTION IF EXISTS map_facility_id_to_office_name(TEXT);

SELECT '✅ Cleanup completed' as result;

-- =====================================================
-- 9. SUMMARY
-- =====================================================

SELECT '📊 CONVERSION SUMMARY:' as summary;

-- Final statistics
SELECT 
    'Total forms:' as metric,
    COUNT(*) as value
FROM page_configurations;

SELECT 
    'Forms with office restrictions:' as metric,
    COUNT(*) as value
FROM page_configurations 
WHERE selected_offices IS NOT NULL 
  AND jsonb_array_length(selected_offices) > 0;

SELECT 
    'Forms accessible to "Ondipudur SO":' as metric,
    COUNT(*) as value
FROM page_configurations 
WHERE selected_offices IS NULL 
   OR jsonb_array_length(selected_offices) = 0 
   OR selected_offices ? 'Ondipudur SO';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT '🎉 OFFICE DATA MAPPING FIX COMPLETE!' as status;

SELECT 
    'What was fixed:' as summary_1,
    'Converted facility IDs to office names in form targeting' as description_1;

SELECT 
    'Impact:' as summary_2,
    'Office-based form filtering should now work correctly' as description_2;

SELECT 
    'Next steps:' as summary_3,
    'Test form access in your Flutter app' as description_3;
