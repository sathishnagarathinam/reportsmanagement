-- =====================================================
-- FIX OFFICE DATA MAPPING ISSUE (CORRECTED VERSION)
-- =====================================================

-- This script fixes the data mapping issue where form configurations
-- store Facility IDs instead of Office names, causing filtering failures

-- =====================================================
-- 1. ANALYZE THE CURRENT PROBLEM
-- =====================================================

SELECT '🔍 STEP 1: Analyzing the current data mapping problem...' as step;

-- Show sample office data to understand the mapping
SELECT 
    '📊 Sample office data (first 5 records):' as info,
    "Facility ID",
    "Office name",
    "Region",
    "Division"
FROM offices 
LIMIT 5;

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

-- Show affected forms (first 3 for preview)
SELECT 
    '📋 Sample affected forms:' as info,
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
ORDER BY id
LIMIT 3;

-- =====================================================
-- 3. PREVIEW THE CONVERSION
-- =====================================================

SELECT '🔍 STEP 3: Previewing the conversion...' as step;

-- Show what the conversion will look like for a sample form
WITH conversion_preview AS (
    SELECT 
        pc.id,
        pc.title,
        pc.selected_offices as current_facility_ids,
        (
            SELECT jsonb_agg(
                COALESCE(
                    (SELECT "Office name" FROM offices WHERE "Facility ID" = office_id),
                    office_id
                )
            )
            FROM jsonb_array_elements_text(pc.selected_offices) as office_id
        ) as converted_office_names
    FROM page_configurations pc
    WHERE pc.selected_offices IS NOT NULL 
      AND jsonb_array_length(pc.selected_offices) > 0
      AND EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(pc.selected_offices) as office_id
          WHERE office_id LIKE 'PO%'
      )
    LIMIT 2
)
SELECT 
    '📋 Conversion preview (sample):' as preview,
    id,
    title,
    current_facility_ids,
    converted_office_names
FROM conversion_preview;

-- =====================================================
-- 4. PERFORM THE CONVERSION
-- =====================================================

SELECT '🔧 STEP 4: Converting facility IDs to office names...' as step;

-- Count forms before conversion
WITH before_count AS (
    SELECT COUNT(*) as forms_to_update
    FROM page_configurations 
    WHERE selected_offices IS NOT NULL 
      AND jsonb_array_length(selected_offices) > 0
      AND EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(selected_offices) as office_id
          WHERE office_id LIKE 'PO%'
      )
)
SELECT 
    '📊 Forms to be updated:' as info,
    forms_to_update
FROM before_count;

-- Perform the actual conversion
UPDATE page_configurations 
SET selected_offices = (
    SELECT jsonb_agg(
        COALESCE(
            (SELECT "Office name" FROM offices WHERE "Facility ID" = office_id),
            office_id
        )
    )
    FROM jsonb_array_elements_text(selected_offices) as office_id
)
WHERE selected_offices IS NOT NULL 
  AND jsonb_array_length(selected_offices) > 0
  AND EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(selected_offices) as office_id
      WHERE office_id LIKE 'PO%'
  );

SELECT '✅ Conversion completed successfully' as result;

-- =====================================================
-- 5. VERIFICATION
-- =====================================================

SELECT '🔍 STEP 5: Verifying the conversion...' as step;

-- Count remaining facility IDs (should be 0)
SELECT 
    '📊 Remaining facility IDs:' as check,
    COUNT(*) as forms_still_using_facility_ids
FROM page_configurations 
WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(selected_offices) as office_id
    WHERE office_id LIKE 'PO%' AND length(office_id) > 10
);

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
LIMIT 3;

-- =====================================================
-- 6. TEST SPECIFIC CASE
-- =====================================================

SELECT '🧪 STEP 6: Testing specific case for "Ondipudur SO"...' as step;

-- Check if "Ondipudur SO" is now in any form targeting
SELECT 
    '🔍 Forms now targeting "Ondipudur SO":' as test,
    COUNT(*) as form_count
FROM page_configurations 
WHERE selected_offices ? 'Ondipudur SO';

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

-- Show all forms accessible to "Ondipudur SO"
SELECT 
    '📊 All forms accessible to "Ondipudur SO":' as access_summary,
    COUNT(*) as accessible_forms
FROM page_configurations 
WHERE selected_offices IS NULL 
   OR jsonb_array_length(selected_offices) = 0 
   OR selected_offices ? 'Ondipudur SO';

-- =====================================================
-- 7. FINAL SUMMARY
-- =====================================================

SELECT '📊 CONVERSION SUMMARY:' as summary;

-- Final statistics
SELECT 
    'Total forms:' as metric,
    COUNT(*) as value
FROM page_configurations
UNION ALL
SELECT 
    'Forms with office restrictions:',
    COUNT(*)
FROM page_configurations 
WHERE selected_offices IS NOT NULL 
  AND jsonb_array_length(selected_offices) > 0
UNION ALL
SELECT 
    'Forms accessible to "Ondipudur SO":',
    COUNT(*)
FROM page_configurations 
WHERE selected_offices IS NULL 
   OR jsonb_array_length(selected_offices) = 0 
   OR selected_offices ? 'Ondipudur SO'
UNION ALL
SELECT 
    'Forms still using facility IDs:',
    COUNT(*)
FROM page_configurations 
WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(selected_offices) as office_id
    WHERE office_id LIKE 'PO%' AND length(office_id) > 10
);

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

-- =====================================================
-- TESTING INSTRUCTIONS
-- =====================================================

SELECT '📋 TESTING INSTRUCTIONS:' as instructions;

SELECT '1. Restart your Flutter app to clear cached data' as step_1;
SELECT '2. Try accessing the newreport form' as step_2;
SELECT '3. Expected console output: "User CAN access form: newreport"' as step_3;
SELECT '4. Run VERIFY_OFFICE_MAPPING_FIX.sql to double-check results' as step_4;
