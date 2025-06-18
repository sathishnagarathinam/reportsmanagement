# Supabase Troubleshooting Guide

## 🚨 **Issue: Data Not Saving to Supabase**

### **Quick Diagnosis Steps:**

#### **1. Use the Debug Component**
I've added a `SupabaseDebugTest` component to your PageBuilder. It will appear at the top of the page.

**Click "🚀 Run All Tests"** to get a comprehensive diagnosis.

#### **2. Check Common Issues:**

### **Issue A: Table Doesn't Exist**
**Symptoms:** Error code `42P01` or "relation does not exist"

**Solution:**
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run this script:

```sql
CREATE TABLE page_configurations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  is_page BOOLEAN DEFAULT false,
  page_id TEXT,
  selected_region TEXT,
  selected_division TEXT,
  selected_office TEXT,
  selected_frequency TEXT,
  selected_regions JSONB DEFAULT '[]'::jsonb,
  selected_divisions JSONB DEFAULT '[]'::jsonb,
  selected_offices JSONB DEFAULT '[]'::jsonb,
  fields JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Issue B: Row Level Security (RLS) Blocking Access**
**Symptoms:** No error but no data saves, or permission denied

**Solution:**
1. Go to Supabase Dashboard → **Authentication** → **Policies**
2. Find `page_configurations` table
3. **Option 1 (Quick Fix):** Disable RLS temporarily:
```sql
ALTER TABLE page_configurations DISABLE ROW LEVEL SECURITY;
```

4. **Option 2 (Proper Fix):** Create a policy:
```sql
-- Enable RLS
ALTER TABLE page_configurations ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON page_configurations
FOR ALL USING (auth.role() = 'authenticated');

-- OR create policy for anonymous access (less secure)
CREATE POLICY "Allow all operations" ON page_configurations
FOR ALL USING (true);
```

### **Issue C: Environment Variables**
**Symptoms:** Connection errors or "Invalid API key"

**Check your `.env.local` file:**
```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

**Verify:**
1. URL format is correct (starts with https://)
2. Anon key is the public key (not service role key)
3. No extra spaces or quotes
4. File is named exactly `.env.local`

### **Issue D: API Permissions**
**Symptoms:** 403 Forbidden or permission errors

**Solution:**
1. Go to Supabase Dashboard → **Settings** → **API**
2. Check that **anon** key has proper permissions
3. Verify **service_role** key if using it

### **Issue E: Network/CORS Issues**
**Symptoms:** Network errors or CORS blocks

**Solution:**
1. Check browser Network tab for failed requests
2. Verify Supabase URL is accessible
3. Check if corporate firewall is blocking

## 🔧 **Step-by-Step Debugging**

### **Step 1: Run Debug Tests**
1. Go to your PageBuilder
2. Look for the yellow "Supabase Debug & Test" component
3. Click "🚀 Run All Tests"
4. Check results for specific errors

### **Step 2: Check Browser Console**
Look for these error patterns:
- `42P01` = Table doesn't exist
- `42501` = Permission denied
- `PGRST116` = No rows found (normal)
- `Invalid API key` = Environment variable issue

### **Step 3: Verify Table in Supabase**
1. Go to Supabase Dashboard
2. Navigate to **Table Editor**
3. Look for `page_configurations` table
4. If missing, run the CREATE TABLE script

### **Step 4: Test Manual Insert**
In Supabase SQL Editor, try:
```sql
INSERT INTO page_configurations (
  id, 
  title, 
  selected_regions, 
  selected_frequency
) VALUES (
  'manual-test-1',
  'Manual Test',
  '["north"]'::jsonb,
  'weekly'
);
```

If this fails, the issue is with table setup or permissions.

## 🎯 **Expected Debug Results**

### **✅ Working Correctly:**
```
🚀 Starting comprehensive Supabase tests...
✅ Connection successful! Table has X records
✅ Table "page_configurations" exists
✅ SELECT permission OK
✅ INSERT permission OK
✅ Direct insert successful!
✅ Service save successful!
✅ Service load successful!
🏁 All tests completed!
```

### **❌ Common Error Patterns:**

#### **Table Missing:**
```
❌ Table "page_configurations" does not exist!
📝 Please run the SQL script to create the table
```
**Fix:** Run the CREATE TABLE script

#### **Permission Issues:**
```
❌ INSERT permission failed: new row violates row-level security policy
```
**Fix:** Disable RLS or create proper policy

#### **Connection Issues:**
```
❌ Connection failed: Invalid API key
```
**Fix:** Check environment variables

## 🛠️ **Quick Fixes**

### **Fix 1: Create Table (Most Common)**
```sql
-- Copy and paste this entire script in Supabase SQL Editor
CREATE TABLE page_configurations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  is_page BOOLEAN DEFAULT false,
  page_id TEXT,
  selected_region TEXT,
  selected_division TEXT,
  selected_office TEXT,
  selected_frequency TEXT,
  selected_regions JSONB DEFAULT '[]'::jsonb,
  selected_divisions JSONB DEFAULT '[]'::jsonb,
  selected_offices JSONB DEFAULT '[]'::jsonb,
  fields JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for now (can enable later with proper policies)
ALTER TABLE page_configurations DISABLE ROW LEVEL SECURITY;
```

### **Fix 2: Environment Variables**
Create/update `.env.local` in your project root:
```env
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

### **Fix 3: Restart Development Server**
After changing environment variables:
```bash
npm start
```

## 📞 **Getting Help**

### **Share Debug Results**
1. Run the debug tests
2. Copy the console output
3. Share the specific error messages

### **Check These Details**
- Supabase project URL
- Whether table exists in dashboard
- Environment variables are set
- Any console error messages
- Network tab in browser DevTools

The debug component will give you the exact error and solution needed! 🎯
