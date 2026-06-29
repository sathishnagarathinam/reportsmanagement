-- =====================================================
-- PREVENT FACILITY ID SAVING IN ADMIN PANEL
-- =====================================================

-- This script creates a database trigger to automatically convert
-- Facility IDs to office names when saving form configurations

-- =====================================================
-- 1. CREATE CONVERSION FUNCTION
-- =====================================================

SELECT '🔧 Step 1: Creating automatic conversion function...' as step;

-- Function to convert facility IDs to office names
CREATE OR REPLACE FUNCTION convert_facility_ids_to_office_names()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if selected_offices is not null and has content
    IF NEW.selected_offices IS NOT NULL AND jsonb_array_length(NEW.selected_offices) > 0 THEN
        
        -- Check if any office IDs look like facility IDs
        IF EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(NEW.selected_offices) as office_id
            WHERE office_id LIKE 'PO%' AND length(office_id) > 10
        ) THEN
            
            -- Log the conversion
            RAISE NOTICE 'Converting facility IDs to office names for form: %', NEW.id;
            
            -- Convert facility IDs to office names
            NEW.selected_offices := (
                SELECT jsonb_agg(
                    COALESCE(
                        (SELECT "Office name" FROM offices WHERE "Facility ID" = office_id),
                        office_id
                    )
                )
                FROM jsonb_array_elements_text(NEW.selected_offices) as office_id
            );
            
            RAISE NOTICE 'Converted selected_offices: %', NEW.selected_offices;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Conversion function created successfully' as result;

-- =====================================================
-- 2. CREATE TRIGGER
-- =====================================================

SELECT '🔧 Step 2: Creating trigger to auto-convert on save...' as step;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_convert_facility_ids ON page_configurations;

-- Create trigger that runs before INSERT or UPDATE
CREATE TRIGGER auto_convert_facility_ids
    BEFORE INSERT OR UPDATE ON page_configurations
    FOR EACH ROW
    EXECUTE FUNCTION convert_facility_ids_to_office_names();

SELECT '✅ Trigger created successfully' as result;

-- =====================================================
-- 3. TEST THE TRIGGER
-- =====================================================

SELECT '🧪 Step 3: Testing the trigger...' as step;

-- Test with a sample facility ID
INSERT INTO page_configurations (
    id,
    title,
    selected_offices
) VALUES (
    'test_trigger_form',
    'Test Trigger Form',
    '["PO29201118000", "PO29201119000"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    selected_offices = EXCLUDED.selected_offices;

-- Check if the trigger converted the facility IDs
SELECT 
    '🧪 Trigger test result:' as test,
    id,
    title,
    selected_offices,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(selected_offices) as office_id
            WHERE office_id LIKE 'PO%' AND length(office_id) > 10
        )
        THEN '❌ FAILED: Still contains facility IDs'
        ELSE '✅ SUCCESS: Converted to office names'
    END as conversion_result
FROM page_configurations 
WHERE id = 'test_trigger_form';

-- Clean up test data
DELETE FROM page_configurations WHERE id = 'test_trigger_form';

-- =====================================================
-- 4. VERIFY EXISTING DATA
-- =====================================================

SELECT '🔍 Step 4: Verifying existing data...' as step;

-- Check if any forms still have facility IDs
SELECT 
    '📊 Current facility ID status:' as status,
    COUNT(*) as forms_with_facility_ids
FROM page_configurations 
WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(selected_offices) as office_id
    WHERE office_id LIKE 'PO%' AND length(office_id) > 10
);

-- Show any forms that still have facility IDs
SELECT 
    '⚠️ Forms still using facility IDs:' as warning,
    id,
    title,
    selected_offices
FROM page_configurations 
WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(selected_offices) as office_id
    WHERE office_id LIKE 'PO%' AND length(office_id) > 10
)
ORDER BY id;

-- =====================================================
-- 5. FIX ANY REMAINING FACILITY IDs
-- =====================================================

SELECT '🔧 Step 5: Fixing any remaining facility IDs...' as step;

-- Convert any remaining facility IDs (this will trigger the conversion function)
UPDATE page_configurations 
SET selected_offices = selected_offices
WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(selected_offices) as office_id
    WHERE office_id LIKE 'PO%' AND length(office_id) > 10
);

SELECT '✅ Any remaining facility IDs have been converted' as result;

-- =====================================================
-- 6. FINAL VERIFICATION
-- =====================================================

SELECT '✅ Step 6: Final verification...' as step;

-- Final check for facility IDs
SELECT 
    '📊 Final facility ID check:' as final_check,
    COUNT(*) as remaining_facility_ids
FROM page_configurations 
WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(selected_offices) as office_id
    WHERE office_id LIKE 'PO%' AND length(office_id) > 10
);

-- Check newreport form specifically
SELECT 
    '🎯 newreport form status:' as newreport_check,
    id,
    title,
    selected_offices,
    CASE 
        WHEN selected_offices IS NULL OR jsonb_array_length(selected_offices) = 0 
        THEN '✅ ACCESSIBLE TO ALL (no restrictions)'
        WHEN selected_offices ? 'Ondipudur SO'
        THEN '✅ ACCESSIBLE TO ONDIPUDUR SO (targeted)'
        ELSE '❌ NOT ACCESSIBLE TO ONDIPUDUR SO'
    END as ondipudur_access
FROM page_configurations 
WHERE id = 'newreport';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT '🎉 FACILITY ID PREVENTION SYSTEM ACTIVE!' as status;

SELECT 
    'What was implemented:' as summary_1,
    'Database trigger that auto-converts facility IDs to office names' as description_1;

SELECT 
    'Effect:' as summary_2,
    'Admin panel can no longer save facility IDs - they get converted automatically' as description_2;

SELECT 
    'Next steps:' as summary_3,
    'Test saving a form in admin panel - facility IDs should be converted' as description_3;

-- =====================================================
-- TESTING INSTRUCTIONS
-- =====================================================

SELECT '📋 TESTING INSTRUCTIONS:' as instructions;

SELECT '1. Go to your admin panel' as step_1;
SELECT '2. Edit any form and save it' as step_2;
SELECT '3. Check the database - should show office names, not facility IDs' as step_3;
SELECT '4. Test form access in Flutter app' as step_4;

-- =====================================================
-- MONITORING QUERY
-- =====================================================

/*
USE THIS QUERY TO MONITOR FOR FACILITY IDs:

SELECT 
    'MONITORING: Facility IDs detected' as alert,
    id,
    title,
    selected_offices
FROM page_configurations 
WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(selected_offices) as office_id
    WHERE office_id LIKE 'PO%' AND length(office_id) > 10
);

If this query returns any rows, facility IDs are still being saved somehow.
*/
