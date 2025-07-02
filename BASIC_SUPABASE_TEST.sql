-- =====================================================
-- BASIC SUPABASE CONNECTION TEST
-- =====================================================
-- This is the simplest possible test to verify Supabase is working
-- Copy and paste this ENTIRE script in Supabase SQL Editor and click RUN

-- Test 1: Basic SQL functionality
SELECT 'Hello from Supabase!' as test_message, NOW() as current_time;

-- Test 2: Check if we can create a simple table
DROP TABLE IF EXISTS simple_test_table;
CREATE TABLE simple_test_table (
    id SERIAL PRIMARY KEY,
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Test 3: Insert test data
INSERT INTO simple_test_table (message) VALUES 
('Test message 1'),
('Test message 2'),
('Test message 3');

-- Test 4: Query the data back
SELECT 'SUCCESS: Basic table operations work!' as status, COUNT(*) as records FROM simple_test_table;

-- Test 5: Show the data
SELECT * FROM simple_test_table ORDER BY id;

-- Test 6: Grant permissions (this is crucial)
GRANT ALL ON simple_test_table TO authenticated;
GRANT ALL ON simple_test_table TO anon;
GRANT ALL ON simple_test_table TO postgres;
GRANT USAGE, SELECT ON SEQUENCE simple_test_table_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE simple_test_table_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE simple_test_table_id_seq TO postgres;

-- Test 7: Disable RLS
ALTER TABLE simple_test_table DISABLE ROW LEVEL SECURITY;

-- Final verification
SELECT 
    'BASIC TEST COMPLETE!' as message,
    'If you see this, Supabase is working correctly' as instruction,
    COUNT(*) as test_records
FROM simple_test_table;

/*
EXPECTED OUTPUT:
- You should see "Hello from Supabase!" message
- "SUCCESS: Basic table operations work!" with 3 records
- List of 3 test messages
- "BASIC TEST COMPLETE!" with 3 test_records

IF THIS FAILS:
- Check you're in the correct Supabase project
- Verify you have admin/owner permissions
- Check your internet connection
*/
