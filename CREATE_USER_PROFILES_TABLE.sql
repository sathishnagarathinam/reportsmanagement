-- =====================================================
-- CREATE USER_PROFILES TABLE FOR PROFILE EDITING
-- =====================================================

-- This script creates the user_profiles table that stores user profile data
-- for both React and Flutter applications. This table is used for:
-- 1. User registration (dual database storage)
-- 2. Profile editing (dual database updates)
-- 3. Form filtering (office-based access control)

-- =====================================================
-- 1. CHECK IF TABLE EXISTS
-- =====================================================

-- Check current table structure (if exists)
SELECT 
    '🔍 Checking if user_profiles table exists...' as info,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- =====================================================
-- 2. CREATE USER_PROFILES TABLE
-- =====================================================

-- Drop table if it exists (for clean recreation)
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Create user_profiles table with all required fields
CREATE TABLE user_profiles (
    -- Primary key
    id SERIAL PRIMARY KEY,
    
    -- Firebase Auth integration
    uid TEXT NOT NULL UNIQUE, -- Firebase Auth UID
    
    -- User identification
    employeeId TEXT NOT NULL UNIQUE, -- Employee ID (used for updates)
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    
    -- Office and organizational info
    officeName TEXT,
    divisionName TEXT,
    designation TEXT,
    mobileNumber TEXT,
    
    -- User role
    role TEXT DEFAULT 'user',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index on uid for Firebase Auth lookups
CREATE INDEX idx_user_profiles_uid ON user_profiles(uid);

-- Index on employeeId for profile updates
CREATE INDEX idx_user_profiles_employee_id ON user_profiles(employeeId);

-- Index on officeName for office-based filtering
CREATE INDEX idx_user_profiles_office_name ON user_profiles(officeName);

-- Index on email for user lookups
CREATE INDEX idx_user_profiles_email ON user_profiles(email);

-- =====================================================
-- 4. CREATE UPDATE TRIGGER
-- =====================================================

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_user_profiles_updated_at_trigger
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_updated_at();

-- =====================================================
-- 5. SET UP ROW LEVEL SECURITY (OPTIONAL)
-- =====================================================

-- Disable RLS for now (can enable later with proper policies)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Example RLS policies (commented out for now):
-- ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Users can view their own profile" ON user_profiles
--   FOR SELECT USING (auth.uid() = uid);
-- 
-- CREATE POLICY "Users can update their own profile" ON user_profiles
--   FOR UPDATE USING (auth.uid() = uid);

-- =====================================================
-- 6. INSERT SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample user profiles for testing
INSERT INTO user_profiles (
    uid,
    employeeId,
    name,
    email,
    officeName,
    divisionName,
    designation,
    mobileNumber,
    role
) VALUES 
-- Sample User 1
(
    'firebase_uid_001',
    'EMP001',
    'John Doe',
    'john.doe@company.com',
    'Chennai RO',
    'IT Division',
    'Software Engineer',
    '+91-9876543210',
    'user'
),
-- Sample User 2
(
    'firebase_uid_002',
    'EMP002',
    'Jane Smith',
    'jane.smith@company.com',
    'Mumbai BO',
    'Finance Division',
    'Financial Analyst',
    '+91-9876543211',
    'user'
),
-- Sample User 3
(
    'firebase_uid_003',
    'EMP003',
    'Mike Johnson',
    'mike.johnson@company.com',
    'Tambaram SO',
    'Operations Division',
    'Operations Manager',
    '+91-9876543212',
    'admin'
),
-- Sample User 4
(
    'firebase_uid_004',
    'EMP004',
    'Sarah Wilson',
    'sarah.wilson@company.com',
    'Velachery SO',
    'HR Division',
    'HR Specialist',
    '+91-9876543213',
    'user'
),
-- Sample User 5
(
    'firebase_uid_005',
    'EMP005',
    'Alex Brown',
    'alex.brown@company.com',
    'Anna Nagar SO',
    'Sales Division',
    'Sales Representative',
    '+91-9876543214',
    'user'
);

-- =====================================================
-- 7. VERIFY TABLE CREATION
-- =====================================================

-- Check final table structure
SELECT 
    '✅ Final table structure:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Check indexes
SELECT 
    '📊 Table indexes:' as info,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'user_profiles';

-- Check sample data
SELECT 
    '📋 Sample data:' as info,
    COUNT(*) as total_records,
    COUNT(DISTINCT officeName) as unique_offices,
    COUNT(DISTINCT divisionName) as unique_divisions
FROM user_profiles;

-- Show first few records
SELECT 
    '👥 Sample records:' as info,
    employeeId,
    name,
    officeName,
    designation
FROM user_profiles 
LIMIT 5;

-- =====================================================
-- 8. GRANT PERMISSIONS (IF NEEDED)
-- =====================================================

-- Grant permissions to authenticated users (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
-- GRANT USAGE, SELECT ON SEQUENCE user_profiles_id_seq TO authenticated;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

SELECT '🎉 User profiles table setup complete!' as status;
