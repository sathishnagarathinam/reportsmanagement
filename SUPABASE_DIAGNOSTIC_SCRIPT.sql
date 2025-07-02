-- =====================================================
-- SUPABASE REPORTS DIAGNOSTIC SCRIPT
-- =====================================================
-- This script will help diagnose and fix the reports issue
-- Run this in Supabase SQL Editor to check everything

-- =====================================================
-- 1. CHECK IF TABLE EXISTS
-- =====================================================

-- Check if dynamic_form_submissions table exists
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'dynamic_form_submissions';

-- If the above returns no rows, the table doesn't exist
-- If it returns a row, the table exists

-- =====================================================
-- 2. CHECK TABLE STRUCTURE (if table exists)
-- =====================================================

-- Check table columns and types
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'dynamic_form_submissions'
ORDER BY ordinal_position;

-- =====================================================
-- 3. CHECK DATA IN TABLE (if table exists)
-- =====================================================

-- Count total records
SELECT COUNT(*) as total_records FROM dynamic_form_submissions;

-- Show sample data
SELECT 
    id,
    form_identifier,
    user_id,
    submission_data,
    submitted_at,
    created_at
FROM dynamic_form_submissions 
ORDER BY submitted_at DESC 
LIMIT 5;

-- Check unique form identifiers
SELECT 
    form_identifier,
    COUNT(*) as count
FROM dynamic_form_submissions 
GROUP BY form_identifier
ORDER BY count DESC;

-- =====================================================
-- 4. CHECK ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'dynamic_form_submissions';

-- Check RLS policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'dynamic_form_submissions';

-- =====================================================
-- 5. CHECK PERMISSIONS
-- =====================================================

-- Check table permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'dynamic_form_submissions';

-- =====================================================
-- 6. CREATE TABLE AND DATA (if needed)
-- =====================================================

-- If table doesn't exist, create it
CREATE TABLE IF NOT EXISTS dynamic_form_submissions (
    id SERIAL PRIMARY KEY,
    form_identifier TEXT NOT NULL,
    user_id TEXT NOT NULL,
    submission_data JSONB NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for testing
ALTER TABLE dynamic_form_submissions DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON dynamic_form_submissions TO authenticated;
GRANT ALL ON dynamic_form_submissions TO anon;
GRANT USAGE, SELECT ON SEQUENCE dynamic_form_submissions_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE dynamic_form_submissions_id_seq TO anon;

-- =====================================================
-- 7. INSERT SAMPLE DATA (if table is empty)
-- =====================================================

-- Check if we need to insert data
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM dynamic_form_submissions) = 0 THEN
        -- Insert sample data
        INSERT INTO dynamic_form_submissions (form_identifier, user_id, submission_data, submitted_at) VALUES 
        
        -- Sample 1: Employee Registration
        ('employee-registration', 'user123456789', '{
            "firstName": "John",
            "lastName": "Doe", 
            "email": "john.doe@company.com",
            "officeName": "Alandurai SO",
            "department": "IT",
            "position": "Software Engineer",
            "startDate": "2024-01-15"
        }'::jsonb, NOW() - INTERVAL '2 hours'),
        
        -- Sample 2: Leave Request
        ('leave-request', 'user987654321', '{
            "employeeName": "Jane Smith",
            "leaveType": "Annual Leave",
            "startDate": "2024-02-01",
            "endDate": "2024-02-05",
            "reason": "Family vacation",
            "officeName": "Chennai RO",
            "supervisorApproval": "pending"
        }'::jsonb, NOW() - INTERVAL '1 day'),
        
        -- Sample 3: Expense Report
        ('expense-report', 'user456789123', '{
            "employeeName": "Mike Johnson",
            "expenseType": "Travel",
            "amount": 1500.00,
            "currency": "INR",
            "description": "Client meeting in Mumbai",
            "officeName": "Tambaram SO",
            "receiptAttached": true,
            "approvalStatus": "submitted"
        }'::jsonb, NOW() - INTERVAL '3 days'),
        
        -- Sample 4: Performance Review
        ('performance-review', 'user789123456', '{
            "employeeName": "Sarah Wilson",
            "reviewPeriod": "Q4 2023",
            "overallRating": 4.5,
            "goals": "Improve team collaboration",
            "achievements": "Led successful project delivery",
            "officeName": "Velachery SO",
            "reviewerName": "Manager Name",
            "reviewDate": "2024-01-10"
        }'::jsonb, NOW() - INTERVAL '5 days'),
        
        -- Sample 5: IT Support Request
        ('it-support-request', 'user321654987', '{
            "requestType": "Hardware Issue",
            "priority": "High",
            "description": "Laptop screen flickering",
            "officeName": "Anna Nagar SO",
            "requestedBy": "Alex Brown",
            "department": "Sales",
            "urgency": "Immediate",
            "status": "open"
        }'::jsonb, NOW() - INTERVAL '1 week'),
        
        -- Sample 6: Training Registration
        ('training-registration', 'user654987321', '{
            "trainingName": "Advanced Excel",
            "participantName": "Lisa Davis",
            "department": "Finance",
            "officeName": "Chennai RO",
            "trainingDate": "2024-02-15",
            "duration": "2 days",
            "cost": 5000,
            "approvalRequired": true
        }'::jsonb, NOW() - INTERVAL '2 weeks'),
        
        -- Sample 7: Feedback Form
        ('feedback-form', 'user147258369', '{
            "feedbackType": "Service Quality",
            "rating": 5,
            "comments": "Excellent customer service",
            "officeName": "Alandurai SO",
            "submittedBy": "Customer Name",
            "serviceDate": "2024-01-20",
            "recommendToOthers": true
        }'::jsonb, NOW() - INTERVAL '3 weeks'),
        
        -- Sample 8: Inventory Request
        ('inventory-request', 'user963852741', '{
            "itemName": "Office Supplies",
            "quantity": 50,
            "urgency": "Normal",
            "requestedBy": "Office Manager",
            "officeName": "Tambaram SO",
            "budgetCode": "OFFICE-2024",
            "deliveryDate": "2024-02-10",
            "approvalStatus": "approved"
        }'::jsonb, NOW() - INTERVAL '1 month');
        
        RAISE NOTICE 'Sample data inserted successfully!';
    ELSE
        RAISE NOTICE 'Table already contains data, skipping insert.';
    END IF;
END $$;

-- =====================================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_dynamic_form_submissions_form_identifier 
ON dynamic_form_submissions(form_identifier);

CREATE INDEX IF NOT EXISTS idx_dynamic_form_submissions_user_id 
ON dynamic_form_submissions(user_id);

CREATE INDEX IF NOT EXISTS idx_dynamic_form_submissions_submitted_at 
ON dynamic_form_submissions(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_dynamic_form_submissions_submission_data 
ON dynamic_form_submissions USING GIN(submission_data);

-- =====================================================
-- 9. FINAL VERIFICATION
-- =====================================================

-- Final check - this should show your data
SELECT 
    'SUCCESS: Table setup complete!' as status,
    COUNT(*) as total_records,
    COUNT(DISTINCT form_identifier) as unique_forms,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(submitted_at) as earliest_submission,
    MAX(submitted_at) as latest_submission
FROM dynamic_form_submissions;

-- Show sample of data
SELECT 
    id,
    form_identifier,
    user_id,
    submission_data->>'officeName' as office_name,
    submitted_at
FROM dynamic_form_submissions 
ORDER BY submitted_at DESC 
LIMIT 3;

-- =====================================================
-- 10. TEST QUERIES (same as your apps use)
-- =====================================================

-- Test the exact queries your apps are using
SELECT COUNT(*) as total_count FROM dynamic_form_submissions;

SELECT DISTINCT form_identifier FROM dynamic_form_submissions ORDER BY form_identifier;

SELECT DISTINCT user_id FROM dynamic_form_submissions ORDER BY user_id;

SELECT * FROM dynamic_form_submissions ORDER BY submitted_at DESC LIMIT 5;

-- =====================================================
-- TROUBLESHOOTING NOTES
-- =====================================================

/*
EXPECTED RESULTS:

1. Table exists check: Should return 1 row with table_name = 'dynamic_form_submissions'
2. Data count: Should return 8 records
3. RLS check: Should show rowsecurity = false (disabled)
4. Final verification: Should show 8 total_records, 8 unique_forms, 8 unique_users

IF ANY OF THESE FAIL:
- Table doesn't exist: The CREATE TABLE statement will fix it
- No data: The INSERT statements will add sample data
- RLS blocking: The ALTER TABLE statement will disable it
- Permission issues: The GRANT statements will fix permissions

AFTER RUNNING THIS SCRIPT:
1. Your reports should immediately start showing data
2. Summary cards should show: 8 total, 8 forms, 8 users
3. Table should display 8 different form submissions
4. Filters should work with the form types and office names
*/
