-- =====================================================
-- ADD EMPLOYEE_ID COLUMN TO DYNAMIC_FORM_SUBMISSIONS
-- =====================================================
-- This script adds the missing employee_id column to the table
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. CHECK CURRENT TABLE STRUCTURE
-- =====================================================

-- Check if table exists and what columns it has
SELECT 
    'Current table structure:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'dynamic_form_submissions'
ORDER BY ordinal_position;

-- =====================================================
-- 2. ADD EMPLOYEE_ID COLUMN (if it doesn't exist)
-- =====================================================

-- Add employee_id column if it doesn't exist
DO $$
BEGIN
    -- Check if employee_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dynamic_form_submissions' 
        AND column_name = 'employee_id'
    ) THEN
        -- Add the column
        ALTER TABLE dynamic_form_submissions 
        ADD COLUMN employee_id TEXT;
        
        RAISE NOTICE '✅ Added employee_id column to dynamic_form_submissions table';
    ELSE
        RAISE NOTICE '⚠️ employee_id column already exists';
    END IF;
END $$;

-- =====================================================
-- 3. CREATE SAMPLE DATA WITH EMPLOYEE_ID
-- =====================================================

-- Clear existing data and insert new data with employee_id
TRUNCATE TABLE dynamic_form_submissions RESTART IDENTITY;

-- Insert sample data with employee_id column
INSERT INTO dynamic_form_submissions (
    form_identifier, 
    user_id, 
    employee_id,
    submission_data, 
    submitted_at
) VALUES 

-- Sample 1: Test Form
('test', 'user123', 'EMP001', '{
    "field_1749386192587": "John Doe",
    "field_1749386216803": "john.doe@company.com",
    "field_1749386266953": "Chennai RO",
    "field_1749386300152": "Software Engineer",
    "field_1749386453918": "2024-01-15"
}'::jsonb, NOW() - INTERVAL '2 hours'),

-- Sample 2: Employee Registration
('employee-registration', 'user456', 'TEST001', '{
    "field_1749386192587": "Jane Smith",
    "field_1749386216803": "jane.smith@company.com", 
    "field_1749386266953": "Mumbai BO",
    "field_1749386300152": "HR Manager",
    "field_1749386453918": "2024-01-10"
}'::jsonb, NOW() - INTERVAL '1 day'),

-- Sample 3: Daily Report
('daily-report', 'user789', 'USER123456', '{
    "field_1749386192587": "Mike Johnson",
    "field_1749386216803": "mike.johnson@company.com",
    "field_1749386266953": "Delhi SO", 
    "field_1749386300152": "Team Lead",
    "field_1749386453918": "2024-01-08"
}'::jsonb, NOW() - INTERVAL '3 days'),

-- Sample 4: Leave Request
('leave-request', 'user101', 'EMP002', '{
    "field_1749386192587": "Sarah Wilson",
    "field_1749386216803": "sarah.wilson@company.com",
    "field_1749386266953": "Bangalore RO",
    "field_1749386300152": "Developer",
    "field_1749386453918": "2024-01-05"
}'::jsonb, NOW() - INTERVAL '5 days'),

-- Sample 5: Expense Report
('expense-report', 'user202', 'TEST002', '{
    "field_1749386192587": "David Brown",
    "field_1749386216803": "david.brown@company.com",
    "field_1749386266953": "Hyderabad BO",
    "field_1749386300152": "Sales Manager",
    "field_1749386453918": "2024-01-03"
}'::jsonb, NOW() - INTERVAL '1 week');

-- =====================================================
-- 4. VERIFY THE CHANGES
-- =====================================================

-- Check updated table structure
SELECT 
    '✅ Updated table structure:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'dynamic_form_submissions'
ORDER BY ordinal_position;

-- Check the data
SELECT 
    '📊 Sample data with employee_id:' as info,
    COUNT(*) as total_records,
    COUNT(DISTINCT employee_id) as unique_employee_ids,
    COUNT(DISTINCT form_identifier) as unique_forms
FROM dynamic_form_submissions;

-- Show sample records
SELECT 
    '📄 Sample records:' as info,
    id,
    form_identifier,
    employee_id,
    user_id,
    submitted_at
FROM dynamic_form_submissions 
ORDER BY submitted_at DESC 
LIMIT 5;

-- =====================================================
-- 5. CREATE INDEX FOR PERFORMANCE
-- =====================================================

-- Create index on employee_id for better query performance
CREATE INDEX IF NOT EXISTS idx_dynamic_form_submissions_employee_id 
ON dynamic_form_submissions(employee_id);

-- =====================================================
-- 6. SUCCESS MESSAGE
-- =====================================================

SELECT 
    '🎉 SUCCESS!' as status,
    'employee_id column added and sample data inserted' as message,
    'Your reports should now show employee IDs instead of "Unknown"' as result;

-- =====================================================
-- EXPECTED RESULTS
-- =====================================================

/*
After running this script, you should see:

1. ✅ employee_id column added to the table
2. 📊 5 sample records with unique employee IDs
3. 📄 Records showing: EMP001, TEST001, USER123456, EMP002, TEST002

Your React and Flutter reports should now display:
- Form Type | Employee ID | Office | Submitted
- Test       | EMP001      | Chennai RO | [date]
- Employee   | TEST001     | Mumbai BO  | [date]
- Daily      | USER123456  | Delhi SO   | [date]

If you still see "Unknown" or "-" values:
1. Submit a new form in Flutter/React
2. Check that the new form submission includes employee_id
3. Refresh the reports page
*/
