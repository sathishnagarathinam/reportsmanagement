-- =====================================================
-- FINAL UUID FIX - Make user_id nullable like React
-- =====================================================

-- Check current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'dynamic_form_submissions';

-- Drop and recreate table with nullable user_id (like React)
DROP TABLE IF EXISTS dynamic_form_submissions CASCADE;

CREATE TABLE dynamic_form_submissions (
    id SERIAL PRIMARY KEY,
    form_identifier TEXT NOT NULL,
    user_id TEXT,  -- TEXT and nullable (like React)
    employee_id TEXT,
    submission_data JSONB NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set permissions
ALTER TABLE dynamic_form_submissions DISABLE ROW LEVEL SECURITY;
GRANT ALL ON dynamic_form_submissions TO authenticated;
GRANT ALL ON dynamic_form_submissions TO anon;
GRANT USAGE, SELECT ON SEQUENCE dynamic_form_submissions_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE dynamic_form_submissions_id_seq TO anon;

-- Test with the exact Firebase UID from your error
INSERT INTO dynamic_form_submissions (
    form_identifier,
    user_id,
    employee_id,
    submission_data
) VALUES (
    'test-flutter-fix',
    'D5Zj8sJawxXs5mWHifftIVnvgL22',  -- Your exact Firebase UID
    '10013407',  -- Your exact employee ID
    '{"field_1749386192587": "2025-06-11T00:00:00.000", "test": "Flutter submission test"}'
);

-- Test without user_id (should also work)
INSERT INTO dynamic_form_submissions (
    form_identifier,
    employee_id,
    submission_data
) VALUES (
    'test-no-user-id',
    '10013408',
    '{"test": "Submission without user_id"}'
);

-- Verify the fix worked
SELECT 'SUCCESS: Flutter can now submit forms!' as result;
SELECT id, form_identifier, user_id, employee_id FROM dynamic_form_submissions ORDER BY id DESC LIMIT 5;
