-- =====================================================
-- FIX UUID ISSUE FOR FLUTTER FORM SUBMISSIONS
-- =====================================================
-- This script fixes the UUID type issue that prevents Flutter from submitting forms
-- Copy and paste this ENTIRE script in Supabase SQL Editor and click RUN

-- =====================================================
-- 1. CHECK CURRENT TABLE STRUCTURE
-- =====================================================

-- Check if table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'dynamic_form_submissions'
ORDER BY ordinal_position;

-- =====================================================
-- 2. DROP AND RECREATE TABLE WITH CORRECT TYPES
-- =====================================================

-- Drop the table if it exists (this will remove all data)
DROP TABLE IF EXISTS dynamic_form_submissions CASCADE;

-- Create table with TEXT type for user_id (not UUID)
CREATE TABLE dynamic_form_submissions (
    id SERIAL PRIMARY KEY,
    form_identifier TEXT NOT NULL,
    user_id TEXT NOT NULL,  -- TEXT type to accept Firebase Auth UIDs
    employee_id TEXT,       -- Optional employee ID column
    submission_data JSONB NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for form_identifier (for filtering by form type)
CREATE INDEX idx_dynamic_form_submissions_form_identifier 
ON dynamic_form_submissions(form_identifier);

-- Index for user_id (for filtering by user)
CREATE INDEX idx_dynamic_form_submissions_user_id 
ON dynamic_form_submissions(user_id);

-- Index for employee_id (for filtering by employee)
CREATE INDEX idx_dynamic_form_submissions_employee_id 
ON dynamic_form_submissions(employee_id);

-- Index for submitted_at (for date range filtering and ordering)
CREATE INDEX idx_dynamic_form_submissions_submitted_at 
ON dynamic_form_submissions(submitted_at DESC);

-- Index for submission_data (for JSON queries)
CREATE INDEX idx_dynamic_form_submissions_submission_data 
ON dynamic_form_submissions USING GIN(submission_data);

-- =====================================================
-- 4. SET PERMISSIONS
-- =====================================================

-- Disable RLS for easier access
ALTER TABLE dynamic_form_submissions DISABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated and anonymous users
GRANT ALL ON dynamic_form_submissions TO authenticated;
GRANT ALL ON dynamic_form_submissions TO anon;
GRANT USAGE, SELECT ON SEQUENCE dynamic_form_submissions_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE dynamic_form_submissions_id_seq TO anon;

-- =====================================================
-- 5. CREATE SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample data with Firebase-style UIDs
INSERT INTO dynamic_form_submissions (
    form_identifier,
    user_id,
    employee_id,
    submission_data,
    submitted_at
) VALUES 
(
    'test-form',
    'D5Zj8sJawxXs5mWHifftlVnvgL22',  -- Firebase Auth UID format
    'EMP001',
    '{"field_1749386192587": "John Doe", "field_1749386216803": "john.doe@company.com", "field_1749386266953": "Chennai RO", "field_1749386300152": "Software Engineer"}',
    NOW()
),
(
    'employee-registration',
    'AbCdEfGhIjKlMnOpQrStUvWxYz12',  -- Firebase Auth UID format
    'EMP002',
    '{"field_1749386192587": "Jane Smith", "field_1749386216803": "jane.smith@company.com", "field_1749386266953": "Mumbai BO", "field_1749386300152": "HR Manager"}',
    NOW() - INTERVAL '1 day'
),
(
    'daily-report',
    'XyZ123AbC456DeF789GhI012JkL34',  -- Firebase Auth UID format
    'EMP003',
    '{"field_1749386192587": "Mike Johnson", "field_1749386216803": "mike.johnson@company.com", "field_1749386266953": "Delhi SO", "field_1749386300152": "Team Lead"}',
    NOW() - INTERVAL '2 days'
);

-- =====================================================
-- 6. VERIFY THE FIX
-- =====================================================

-- Check table structure
SELECT 'Table structure:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'dynamic_form_submissions'
ORDER BY ordinal_position;

-- Check sample data
SELECT 'Sample data:' as info;
SELECT 
    id,
    form_identifier,
    user_id,
    employee_id,
    submitted_at
FROM dynamic_form_submissions
ORDER BY submitted_at DESC
LIMIT 5;

-- Test Firebase UID insertion
SELECT 'Testing Firebase UID insertion:' as info;
INSERT INTO dynamic_form_submissions (
    form_identifier,
    user_id,
    employee_id,
    submission_data
) VALUES (
    'test-firebase-uid',
    'D5Zj8sJawxXs5mWHifftlVnvgL22',  -- The exact UID from the error
    'TEST001',
    '{"test": "Firebase UID insertion test"}'
) RETURNING id, user_id, employee_id;

-- =====================================================
-- 7. SUCCESS MESSAGE
-- =====================================================

SELECT '✅ UUID issue fixed! Flutter should now be able to submit forms successfully.' as result;
SELECT '📱 The user_id column now accepts Firebase Auth UIDs as TEXT instead of UUID.' as info;
SELECT '🔧 You can now test form submission from Flutter app.' as next_step;
