-- =====================================================
-- Supabase Reports Table Setup
-- =====================================================
-- This script creates the dynamic_form_submissions table
-- and adds sample data for testing the reports functionality

-- =====================================================
-- 1. CREATE TABLE
-- =====================================================

-- Drop table if it exists (for fresh start)
DROP TABLE IF EXISTS dynamic_form_submissions;

-- Create the dynamic_form_submissions table
CREATE TABLE dynamic_form_submissions (
  -- Primary key
  id SERIAL PRIMARY KEY,
  
  -- Form identification
  form_identifier TEXT NOT NULL,
  
  -- User identification
  user_id TEXT NOT NULL,
  
  -- Form data (JSON)
  submission_data JSONB NOT NULL,
  
  -- Timestamps
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================

-- Index for form_identifier (for filtering by form type)
CREATE INDEX idx_dynamic_form_submissions_form_identifier 
ON dynamic_form_submissions(form_identifier);

-- Index for user_id (for filtering by user)
CREATE INDEX idx_dynamic_form_submissions_user_id 
ON dynamic_form_submissions(user_id);

-- Index for submitted_at (for date range filtering and ordering)
CREATE INDEX idx_dynamic_form_submissions_submitted_at 
ON dynamic_form_submissions(submitted_at DESC);

-- Index for submission_data (for JSON queries)
CREATE INDEX idx_dynamic_form_submissions_submission_data 
ON dynamic_form_submissions USING GIN(submission_data);

-- =====================================================
-- 3. DISABLE ROW LEVEL SECURITY (for testing)
-- =====================================================

-- Disable RLS for now to avoid permission issues during testing
ALTER TABLE dynamic_form_submissions DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. INSERT SAMPLE DATA
-- =====================================================

-- Insert sample form submissions for testing
INSERT INTO dynamic_form_submissions (
  form_identifier, 
  user_id, 
  submission_data, 
  submitted_at
) VALUES 

-- Sample 1: Employee Registration Form
(
  'employee-registration',
  'user123456789',
  '{
    "firstName": "John",
    "lastName": "Doe", 
    "email": "john.doe@company.com",
    "officeName": "Alandurai SO",
    "department": "IT",
    "position": "Software Engineer",
    "startDate": "2024-01-15"
  }'::jsonb,
  NOW() - INTERVAL '2 hours'
),

-- Sample 2: Leave Request Form
(
  'leave-request',
  'user987654321',
  '{
    "employeeName": "Jane Smith",
    "leaveType": "Annual Leave",
    "startDate": "2024-02-01",
    "endDate": "2024-02-05",
    "reason": "Family vacation",
    "officeName": "Chennai RO",
    "supervisorApproval": "pending"
  }'::jsonb,
  NOW() - INTERVAL '1 day'
),

-- Sample 3: Expense Report Form
(
  'expense-report',
  'user456789123',
  '{
    "employeeName": "Mike Johnson",
    "expenseType": "Travel",
    "amount": 1500.00,
    "currency": "INR",
    "description": "Client meeting in Mumbai",
    "officeName": "Tambaram SO",
    "receiptAttached": true,
    "approvalStatus": "submitted"
  }'::jsonb,
  NOW() - INTERVAL '3 days'
),

-- Sample 4: Performance Review Form
(
  'performance-review',
  'user789123456',
  '{
    "employeeName": "Sarah Wilson",
    "reviewPeriod": "Q4 2023",
    "overallRating": 4.5,
    "goals": "Improve team collaboration",
    "achievements": "Led successful project delivery",
    "officeName": "Velachery SO",
    "reviewerName": "Manager Name",
    "reviewDate": "2024-01-10"
  }'::jsonb,
  NOW() - INTERVAL '5 days'
),

-- Sample 5: IT Support Request
(
  'it-support-request',
  'user321654987',
  '{
    "requestType": "Hardware Issue",
    "priority": "High",
    "description": "Laptop screen flickering",
    "officeName": "Anna Nagar SO",
    "requestedBy": "Alex Brown",
    "department": "Sales",
    "urgency": "Immediate",
    "status": "open"
  }'::jsonb,
  NOW() - INTERVAL '1 week'
),

-- Sample 6: Training Registration
(
  'training-registration',
  'user654987321',
  '{
    "trainingName": "Advanced Excel",
    "participantName": "Lisa Davis",
    "department": "Finance",
    "officeName": "Chennai RO",
    "trainingDate": "2024-02-15",
    "duration": "2 days",
    "cost": 5000,
    "approvalRequired": true
  }'::jsonb,
  NOW() - INTERVAL '2 weeks'
),

-- Sample 7: Feedback Form
(
  'feedback-form',
  'user147258369',
  '{
    "feedbackType": "Service Quality",
    "rating": 5,
    "comments": "Excellent customer service",
    "officeName": "Alandurai SO",
    "submittedBy": "Customer Name",
    "serviceDate": "2024-01-20",
    "recommendToOthers": true
  }'::jsonb,
  NOW() - INTERVAL '3 weeks'
),

-- Sample 8: Inventory Request
(
  'inventory-request',
  'user963852741',
  '{
    "itemName": "Office Supplies",
    "quantity": 50,
    "urgency": "Normal",
    "requestedBy": "Office Manager",
    "officeName": "Tambaram SO",
    "budgetCode": "OFFICE-2024",
    "deliveryDate": "2024-02-10",
    "approvalStatus": "approved"
  }'::jsonb,
  NOW() - INTERVAL '1 month'
);

-- =====================================================
-- 5. VERIFY DATA
-- =====================================================

-- Check if data was inserted successfully
SELECT 
  COUNT(*) as total_submissions,
  COUNT(DISTINCT form_identifier) as unique_forms,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(submitted_at) as earliest_submission,
  MAX(submitted_at) as latest_submission
FROM dynamic_form_submissions;

-- Show sample of inserted data
SELECT 
  id,
  form_identifier,
  user_id,
  submission_data->>'officeName' as office_name,
  submitted_at
FROM dynamic_form_submissions 
ORDER BY submitted_at DESC 
LIMIT 5;

-- =====================================================
-- 6. GRANT PERMISSIONS (if needed)
-- =====================================================

-- Grant permissions to authenticated users (uncomment if needed)
-- GRANT ALL ON dynamic_form_submissions TO authenticated;
-- GRANT USAGE, SELECT ON SEQUENCE dynamic_form_submissions_id_seq TO authenticated;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

-- If you see this message, the setup was successful!
SELECT 'dynamic_form_submissions table created successfully with sample data!' as status;

-- =====================================================
-- TROUBLESHOOTING NOTES
-- =====================================================

/*
If you encounter issues:

1. **Table already exists error:**
   - The DROP TABLE IF EXISTS should handle this
   - If it persists, manually drop the table first

2. **Permission denied:**
   - Make sure you're running this as a superuser
   - Check if RLS is properly disabled

3. **No data showing in reports:**
   - Verify data was inserted: SELECT COUNT(*) FROM dynamic_form_submissions;
   - Check if RLS is blocking access
   - Verify Supabase connection in your app

4. **JSON data issues:**
   - All JSON data is properly formatted as JSONB
   - Check for any syntax errors in the JSON

5. **Index creation fails:**
   - Indexes are optional for basic functionality
   - You can skip them if they cause issues

To test the reports functionality:
1. Run this script in Supabase SQL Editor
2. Verify data exists: SELECT * FROM dynamic_form_submissions LIMIT 5;
3. Test your reports page - you should see 8 submissions
4. Try filtering by different form types
5. Check that summary statistics show correct counts
*/
