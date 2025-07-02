# Reports Troubleshooting Guide

## 🚨 **Issue: Reports Summary Cards Show But No Data Fetched**

### **Root Cause Analysis**

The most likely causes for this issue are:

1. **❌ Table doesn't exist** - `dynamic_form_submissions` table not created in Supabase
2. **❌ No data in table** - Table exists but has no form submissions
3. **❌ Permission issues** - Row Level Security (RLS) blocking access
4. **❌ API connection issues** - Supabase configuration problems

## 🔍 **Diagnostic Steps**

### **Step 1: Check Supabase Console**

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **Table Editor**

2. **Look for `dynamic_form_submissions` table**
   - ✅ **If table exists:** Proceed to Step 2
   - ❌ **If table doesn't exist:** Go to **Fix 1**

3. **Check table data**
   - Click on the `dynamic_form_submissions` table
   - ✅ **If data exists:** Proceed to Step 3
   - ❌ **If no data:** Go to **Fix 2**

### **Step 2: Check Console Logs**

1. **Open Browser Developer Tools**
   - Press F12 or right-click → Inspect
   - Go to **Console** tab

2. **Look for ReportsService logs**
   - You should see logs like:
   ```
   ReportsService: Fetching form submissions with filters: {...}
   ReportsService: Checking dynamic_form_submissions table...
   ReportsService: Raw response data: [...]
   ```

3. **Check for errors**
   - ❌ **PostgrestException:** Table doesn't exist → **Fix 1**
   - ❌ **Permission denied:** RLS issue → **Fix 3**
   - ❌ **No data found:** Empty table → **Fix 2**

### **Step 3: Test Direct Query**

1. **Go to Supabase SQL Editor**
2. **Run test query:**
   ```sql
   SELECT COUNT(*) FROM dynamic_form_submissions;
   ```
3. **Expected results:**
   - ✅ **Returns number > 0:** Data exists, check **Fix 3**
   - ❌ **Returns 0:** No data, go to **Fix 2**
   - ❌ **Error:** Table doesn't exist, go to **Fix 1**

## 🛠️ **Fixes**

### **Fix 1: Create Table and Add Sample Data**

**Problem:** `dynamic_form_submissions` table doesn't exist

**Solution:**
1. **Open Supabase SQL Editor**
2. **Copy and paste the entire script from `SUPABASE_REPORTS_TABLE_SETUP.sql`**
3. **Click "Run"**
4. **Verify success message appears**

**Quick Test:**
```sql
-- Should return 8 sample records
SELECT COUNT(*) FROM dynamic_form_submissions;
```

### **Fix 2: Add Sample Data**

**Problem:** Table exists but has no data

**Solution:**
```sql
-- Insert sample data (copy from SUPABASE_REPORTS_TABLE_SETUP.sql)
INSERT INTO dynamic_form_submissions (form_identifier, user_id, submission_data, submitted_at) VALUES 
('employee-registration', 'user123456789', '{"firstName": "John", "lastName": "Doe", "officeName": "Alandurai SO"}'::jsonb, NOW() - INTERVAL '2 hours'),
('leave-request', 'user987654321', '{"employeeName": "Jane Smith", "leaveType": "Annual Leave", "officeName": "Chennai RO"}'::jsonb, NOW() - INTERVAL '1 day'),
('expense-report', 'user456789123', '{"employeeName": "Mike Johnson", "expenseType": "Travel", "officeName": "Tambaram SO"}'::jsonb, NOW() - INTERVAL '3 days');
```

### **Fix 3: Disable Row Level Security**

**Problem:** RLS is blocking data access

**Solution:**
```sql
-- Disable RLS for testing
ALTER TABLE dynamic_form_submissions DISABLE ROW LEVEL SECURITY;

-- Grant permissions (if needed)
GRANT ALL ON dynamic_form_submissions TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE dynamic_form_submissions_id_seq TO authenticated;
```

### **Fix 4: Check Supabase Configuration**

**Problem:** API connection issues

**Solution:**
1. **Check environment variables:**
   ```typescript
   // In your .env file
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_anon_key
   ```

2. **Verify Supabase client:**
   ```typescript
   // In src/config/supabase.ts
   import { createClient } from '@supabase/supabase-js'
   
   const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!
   const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!
   
   export const supabase = createClient(supabaseUrl, supabaseAnonKey)
   ```

## ✅ **Verification Steps**

### **After applying fixes:**

1. **Check table exists and has data:**
   ```sql
   SELECT 
     COUNT(*) as total_submissions,
     COUNT(DISTINCT form_identifier) as unique_forms,
     COUNT(DISTINCT user_id) as unique_users
   FROM dynamic_form_submissions;
   ```

2. **Test API access:**
   ```sql
   -- This should return data without errors
   SELECT * FROM dynamic_form_submissions LIMIT 5;
   ```

3. **Refresh reports page:**
   - Clear browser cache (Ctrl+F5)
   - Check console for success logs
   - Verify data appears in reports table

### **Expected Console Output (Success):**
```
ReportsService: Fetching form submissions with filters: {}
ReportsService: Checking dynamic_form_submissions table...
ReportsService: Raw response data: [{id: 1, form_identifier: "employee-registration", ...}, ...]
ReportsService: Successfully fetched 8 submissions
ReportsService: First submission sample: {id: 1, form_identifier: "employee-registration", ...}
```

### **Expected UI Behavior (Success):**
- ✅ **Summary cards** show correct numbers (8 total submissions, etc.)
- ✅ **Reports table** displays list of form submissions
- ✅ **Filters** work correctly (form type, office name)
- ✅ **Details modal** opens when clicking on submissions

## 🔧 **Advanced Troubleshooting**

### **If issues persist:**

1. **Check network requests:**
   - Open Developer Tools → Network tab
   - Look for requests to Supabase API
   - Check for 401, 403, or 500 errors

2. **Verify table schema:**
   ```sql
   \d dynamic_form_submissions
   ```

3. **Test with simple query:**
   ```sql
   SELECT 'Hello World' as test;
   ```

4. **Check Supabase logs:**
   - Go to Supabase Dashboard → Logs
   - Look for API errors or warnings

### **Common Error Messages:**

| Error | Cause | Fix |
|-------|-------|-----|
| `relation "dynamic_form_submissions" does not exist` | Table not created | Fix 1 |
| `permission denied for table dynamic_form_submissions` | RLS blocking access | Fix 3 |
| `Invalid API key` | Wrong Supabase config | Fix 4 |
| `No data found` | Empty table | Fix 2 |

## 📞 **Still Need Help?**

If you're still experiencing issues:

1. **Check the console logs** and share any error messages
2. **Verify the table exists** in Supabase dashboard
3. **Run the SQL setup script** from `SUPABASE_REPORTS_TABLE_SETUP.sql`
4. **Test with a simple query** in Supabase SQL Editor

The most common issue is that the `dynamic_form_submissions` table doesn't exist yet. Running the SQL setup script should resolve this in most cases.

## 🎯 **Quick Fix Summary**

**Most likely solution:**
1. Open Supabase SQL Editor
2. Run the complete script from `SUPABASE_REPORTS_TABLE_SETUP.sql`
3. Refresh your reports page
4. Check console logs for success messages

This should create the table, add sample data, and make the reports functional immediately! 🎉
