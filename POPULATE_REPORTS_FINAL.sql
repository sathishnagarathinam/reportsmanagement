-- =====================================================
-- POPULATE REPORTS DATA - FINAL WORKING VERSION
-- =====================================================
-- This script will add sample data to your existing empty tables
-- Copy and paste this ENTIRE script in Supabase SQL Editor and click RUN

-- First, let's check what we have
SELECT 'BEFORE: Checking existing data...' as info;

-- Check dynamic_form_submissions
SELECT 'dynamic_form_submissions' as table_name, COUNT(*) as current_records 
FROM dynamic_form_submissions;

-- =====================================================
-- STEP 1: ENSURE REPORTS_TEST_DATA TABLE EXISTS
-- =====================================================

-- Create reports_test_data table (safe if exists)
CREATE TABLE IF NOT EXISTS reports_test_data (
    id SERIAL PRIMARY KEY,
    form_identifier TEXT NOT NULL,
    user_id TEXT NOT NULL,
    submission_data JSONB NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fix permissions for reports_test_data
ALTER TABLE reports_test_data DISABLE ROW LEVEL SECURITY;
GRANT ALL ON reports_test_data TO authenticated;
GRANT ALL ON reports_test_data TO anon;
GRANT ALL ON reports_test_data TO postgres;
GRANT USAGE, SELECT ON SEQUENCE reports_test_data_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE reports_test_data_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE reports_test_data_id_seq TO postgres;

-- =====================================================
-- STEP 2: CLEAR AND POPULATE REPORTS_TEST_DATA
-- =====================================================

-- Clear existing data
TRUNCATE TABLE reports_test_data RESTART IDENTITY;

-- Insert guaranteed working sample data
INSERT INTO reports_test_data (form_identifier, user_id, submission_data, submitted_at) VALUES 

-- Sample 1: Employee Registration
('employee-registration', 'user_001', '{
    "firstName": "John",
    "lastName": "Doe", 
    "email": "john.doe@company.com",
    "officeName": "Alandurai SO",
    "department": "IT",
    "position": "Software Engineer"
}'::jsonb, NOW() - INTERVAL '2 hours'),

-- Sample 2: Leave Request
('leave-request', 'user_002', '{
    "employeeName": "Jane Smith",
    "leaveType": "Annual Leave",
    "startDate": "2024-02-01",
    "endDate": "2024-02-05",
    "reason": "Family vacation",
    "officeName": "Chennai RO"
}'::jsonb, NOW() - INTERVAL '1 day'),

-- Sample 3: Expense Report
('expense-report', 'user_003', '{
    "employeeName": "Mike Johnson",
    "expenseType": "Travel",
    "amount": 1500.00,
    "currency": "INR",
    "description": "Client meeting in Mumbai",
    "officeName": "Tambaram SO"
}'::jsonb, NOW() - INTERVAL '3 days'),

-- Sample 4: Performance Review
('performance-review', 'user_004', '{
    "employeeName": "Sarah Wilson",
    "reviewPeriod": "Q4 2023",
    "overallRating": 4.5,
    "goals": "Improve team collaboration",
    "achievements": "Led successful project delivery",
    "officeName": "Velachery SO"
}'::jsonb, NOW() - INTERVAL '5 days'),

-- Sample 5: IT Support Request
('it-support-request', 'user_005', '{
    "requestType": "Hardware Issue",
    "priority": "High",
    "description": "Laptop screen flickering",
    "officeName": "Anna Nagar SO",
    "requestedBy": "Alex Brown",
    "department": "Sales"
}'::jsonb, NOW() - INTERVAL '1 week'),

-- Sample 6: Training Registration
('training-registration', 'user_006', '{
    "trainingName": "Advanced Excel",
    "participantName": "Lisa Davis",
    "department": "Finance",
    "officeName": "Chennai RO",
    "trainingDate": "2024-02-15",
    "duration": "2 days"
}'::jsonb, NOW() - INTERVAL '2 weeks'),

-- Sample 7: Feedback Form
('feedback-form', 'user_007', '{
    "feedbackType": "Service Quality",
    "rating": 5,
    "comments": "Excellent customer service",
    "officeName": "Alandurai SO",
    "submittedBy": "Customer Name",
    "serviceDate": "2024-01-20"
}'::jsonb, NOW() - INTERVAL '3 weeks'),

-- Sample 8: Inventory Request
('inventory-request', 'user_008', '{
    "itemName": "Office Supplies",
    "quantity": 50,
    "urgency": "Normal",
    "requestedBy": "Office Manager",
    "officeName": "Tambaram SO",
    "budgetCode": "OFFICE-2024"
}'::jsonb, NOW() - INTERVAL '1 month');

-- =====================================================
-- STEP 3: CREATE SIMPLE VIEW (FIXED COLUMN ISSUE)
-- =====================================================

-- Drop existing view
DROP VIEW IF EXISTS reports_data_view;

-- Create a simple view that only uses columns that exist in both tables
CREATE VIEW reports_data_view AS
SELECT 
    id::text as id,
    form_identifier,
    user_id,
    submission_data,
    submitted_at,
    'test_data' as data_source
FROM reports_test_data

UNION ALL

SELECT 
    id::text as id,
    form_identifier,
    user_id,
    submission_data,
    submitted_at,
    'production' as data_source
FROM dynamic_form_submissions;

-- Grant permissions on view
GRANT SELECT ON reports_data_view TO authenticated;
GRANT SELECT ON reports_data_view TO anon;
GRANT SELECT ON reports_data_view TO postgres;

-- =====================================================
-- STEP 4: VERIFICATION
-- =====================================================

-- Check results
SELECT 'AFTER: Data population results...' as info;

-- Verify reports_test_data
SELECT 
    'reports_test_data' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT form_identifier) as unique_forms,
    COUNT(DISTINCT user_id) as unique_users
FROM reports_test_data;

-- Verify reports_data_view
SELECT 
    'reports_data_view' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT form_identifier) as unique_forms,
    COUNT(DISTINCT user_id) as unique_users,
    string_agg(DISTINCT data_source, ', ') as data_sources
FROM reports_data_view;

-- Show sample data
SELECT 
    'SAMPLE DATA FROM reports_test_data:' as info,
    id,
    form_identifier,
    user_id,
    submission_data->>'officeName' as office_name,
    submitted_at
FROM reports_test_data 
ORDER BY submitted_at DESC 
LIMIT 3;

-- Test the exact queries your apps use
SELECT 'TESTING APP QUERIES:' as info;

-- Test 1: Count query
SELECT 'Total count from reports_data_view:' as test, COUNT(*) as result FROM reports_data_view;

-- Test 2: Form identifiers
SELECT 'Form types:' as test, string_agg(DISTINCT form_identifier, ', ') as result FROM reports_data_view;

-- Test 3: Office names
SELECT 'Office names:' as test, string_agg(DISTINCT submission_data->>'officeName', ', ') as result FROM reports_data_view;

-- =====================================================
-- DIRECT TABLE ACCESS (GUARANTEED TO WORK)
-- =====================================================

SELECT 'DIRECT TABLE TEST:' as info;

-- Test reports_test_data directly (this is what your apps will use)
SELECT 'reports_test_data direct access:' as test, COUNT(*) as result FROM reports_test_data;

-- Show all form types available
SELECT 'Available form types:' as info, form_identifier, COUNT(*) as count 
FROM reports_test_data 
GROUP BY form_identifier 
ORDER BY form_identifier;

-- Show all offices available
SELECT 'Available offices:' as info, submission_data->>'officeName' as office, COUNT(*) as count 
FROM reports_test_data 
GROUP BY submission_data->>'officeName' 
ORDER BY office;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT 
    '🎉 DATA POPULATION COMPLETE!' as status,
    'Your reports should now show data!' as message,
    'Go test your React and Flutter apps now!' as instruction;

/*
EXPECTED RESULTS:
- reports_test_data: 8 total_records, 8 unique_forms, 8 unique_users
- reports_data_view: 8 total_records, 8 unique_forms, 8 unique_users
- Sample data showing recent submissions
- Form types: employee-registration, leave-request, expense-report, etc.
- Office names: Alandurai SO, Chennai RO, Tambaram SO, etc.

AFTER RUNNING THIS:
1. Go to http://localhost:3000/basic-test
2. Click "Test Reports Tables" 
3. You should see 8 records in reports_test_data and reports_data_view
4. Go to http://localhost:3000/reports
5. You should see working reports with data!

YOUR APPS WILL AUTOMATICALLY USE:
- reports_data_view (preferred - combines all data)
- reports_test_data (fallback - guaranteed to work)
- dynamic_form_submissions (if it gets data later)
*/
