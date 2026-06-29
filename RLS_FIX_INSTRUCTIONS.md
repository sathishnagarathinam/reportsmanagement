# 🔧 Fix Row Level Security (RLS) Issue

## Problem
Profile updates are failing with this error:
```
new row violates row-level security policy for table "user_profiles"
```

## Root Cause
Supabase Row Level Security (RLS) is enabled on the `user_profiles` table but no proper policies are configured, blocking all insert/update operations.

---

## 🚀 QUICK FIX (Recommended for Development)

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"

### Step 2: Run This SQL Command
```sql
-- Disable RLS for user_profiles table
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE user_profiles_id_seq TO authenticated;

-- Verify the fix
SELECT 'RLS disabled successfully!' as status;
```

### Step 3: Test the Fix
1. Go back to your app
2. Try updating your profile
3. It should work now!

---

## 🔒 PROPER FIX (Recommended for Production)

If you want to keep RLS enabled with proper security policies:

### Step 1: Enable RLS with Policies
```sql
-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT 
    USING (auth.uid()::text = uid);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT 
    WITH CHECK (auth.uid()::text = uid);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE 
    USING (auth.uid()::text = uid)
    WITH CHECK (auth.uid()::text = uid);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE user_profiles_id_seq TO authenticated;
```

---

## 🧪 Test Your Fix

### Option 1: Browser Console Test
1. Open your app in browser
2. Press F12 to open console
3. Copy and paste the `QUICK_RLS_FIX.js` script
4. Run it to test if RLS is working

### Option 2: Manual Test
1. Try updating your profile in the app
2. Check browser console for errors
3. If successful, you'll see success messages

---

## 🔍 Troubleshooting

### If Quick Fix Doesn't Work:

1. **Check Table Exists:**
   ```sql
   SELECT * FROM information_schema.tables WHERE table_name = 'user_profiles';
   ```

2. **Check Current RLS Status:**
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'user_profiles';
   ```

3. **Check Permissions:**
   ```sql
   SELECT grantee, privilege_type FROM information_schema.role_table_grants 
   WHERE table_name = 'user_profiles';
   ```

### If You Still Get Errors:

1. **Run the full diagnostic script:** `DIAGNOSE_PROFILE_UPDATE_ISSUE.sql`
2. **Create the table if missing:** `CREATE_USER_PROFILES_TABLE.sql`
3. **Check your Supabase API keys** in your app configuration
4. **Verify user authentication** is working properly

---

## 📋 What Each Fix Does

### Quick Fix (Disable RLS):
- ✅ **Pros:** Immediate fix, works for all users
- ❌ **Cons:** Less secure, anyone can access any record
- 🎯 **Best for:** Development, testing, quick fixes

### Proper Fix (RLS Policies):
- ✅ **Pros:** Secure, users can only access their own data
- ❌ **Cons:** More complex, requires proper authentication
- 🎯 **Best for:** Production, secure applications

---

## 🚨 Important Notes

1. **For Development:** Use the Quick Fix (disable RLS)
2. **For Production:** Use the Proper Fix (RLS with policies)
3. **Always test** after applying any fix
4. **Backup your data** before making changes
5. **Monitor logs** for any remaining issues

---

## 🎉 Success Indicators

After applying the fix, you should see:
- ✅ Profile updates work without errors
- ✅ No RLS error messages in console
- ✅ Data is saved to both Firebase and Supabase
- ✅ Users can edit all profile fields

---

## 📞 Need Help?

If you're still having issues:
1. Run the diagnostic scripts provided
2. Check the browser console for detailed error messages
3. Verify your Supabase configuration
4. Contact support with the console logs

The Quick Fix should resolve the issue immediately for most cases! 🎯
