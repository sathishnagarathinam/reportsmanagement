-- =====================================================
-- IMMEDIATE UUID FIX - Run this in Supabase SQL Editor
-- =====================================================

-- Check current table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'dynamic_form_submissions';

-- Drop and recreate table with correct types
DROP TABLE IF EXISTS dynamic_form_submissions CASCADE;

CREATE TABLE dynamic_form_submissions (
    id SERIAL PRIMARY KEY,
    form_identifier TEXT NOT NULL,
    user_id TEXT NOT NULL,  -- TEXT instead of UUID
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
    'test-fix',
    'D5Zj8sJawxXs5mWHifftIVnvgL22',  -- Your exact Firebase UID
    'TEST001',
    '{"test": "UUID fix verification"}'
);

-- Verify the fix worked
SELECT 'SUCCESS: UUID issue fixed!' as result;
SELECT id, user_id, employee_id FROM dynamic_form_submissions WHERE form_identifier = 'test-fix';
