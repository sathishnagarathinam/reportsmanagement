# 🔧 Office Filtering Troubleshooting Guide

## Problem
Flutter app shows: `FormFilteringService: User CANNOT access form: newreport` even when office names match.

## Root Causes & Solutions

---

## 🔍 **Diagnosis Steps**

### Step 1: Run Enhanced Debug Logs
The Flutter FormFilteringService now has enhanced debugging. Check your console for:

```
🔒 FormFilteringService: Checking access for form: newreport
🔒 FormFilteringService: User office name: "Your Office Name"
🔒 FormFilteringService: Form config: {...}
🔍 FormFilteringService: checkFormAccess called
🔍 FormFilteringService: userOfficeName = "Your Office Name"
🔍 FormFilteringService: formOfficeTargeting = [...]
```

### Step 2: Check Database Configuration
Run the diagnostic script in Supabase SQL Editor:
```sql
-- Copy and paste DEBUG_OFFICE_FILTERING.sql
```

---

## 🚀 **Quick Fixes**

### Fix 1: Allow All Users (Recommended)
**Problem:** Form has office restrictions when it shouldn't

**Solution:** Run in Supabase SQL Editor:
```sql
-- Make newreport accessible to all users
UPDATE page_configurations 
SET selected_offices = '[]'::jsonb
WHERE id = 'newreport';
```

### Fix 2: Create Missing Form
**Problem:** newreport form doesn't exist in database

**Solution:** Run in Supabase SQL Editor:
```sql
-- Create newreport form
INSERT INTO page_configurations (
    id, title, selected_offices, is_page, page_id
) VALUES (
    'newreport', 'New Report', '[]'::jsonb, true, 'newreport'
) ON CONFLICT (id) DO NOTHING;
```

### Fix 3: Fix Null Office Targeting
**Problem:** selected_offices is null instead of empty array

**Solution:** Run in Supabase SQL Editor:
```sql
-- Fix all forms with null office targeting
UPDATE page_configurations 
SET selected_offices = '[]'::jsonb
WHERE selected_offices IS NULL;
```

---

## 🔧 **Detailed Troubleshooting**

### Issue 1: Form Not Found
**Symptoms:**
- `❌ FormFilteringService: Form not found: newreport`

**Diagnosis:**
```sql
SELECT * FROM page_configurations WHERE id = 'newreport';
```

**Solutions:**
1. **Create the form:**
   ```sql
   INSERT INTO page_configurations (id, title, selected_offices) 
   VALUES ('newreport', 'New Report', '[]'::jsonb);
   ```

2. **Check form ID spelling** - ensure it's exactly "newreport"

### Issue 2: User Office Not Set
**Symptoms:**
- `❌ FormFilteringService: User has no office assigned, denying access`

**Diagnosis:**
```sql
SELECT uid, employeeId, name, officeName 
FROM user_profiles 
WHERE uid = 'your-firebase-uid';
```

**Solutions:**
1. **Update user profile** with office name
2. **Check Firebase employees collection** has officeName field
3. **Run profile migration** to sync Firebase → Supabase

### Issue 3: Office Name Mismatch
**Symptoms:**
- User office: "Chennai RO"
- Form targeting: ["chennai ro", "Chennai RO "] (case/spacing issues)

**Diagnosis:**
```sql
-- Check exact office names
SELECT 
    pc.selected_offices,
    up.officeName
FROM page_configurations pc
CROSS JOIN user_profiles up
WHERE pc.id = 'newreport' AND up.officeName IS NOT NULL;
```

**Solutions:**
1. **Normalize office names** in database
2. **Update form targeting** to match exact user office names
3. **Use case-insensitive matching** (already implemented)

### Issue 4: Wrong Data Type
**Symptoms:**
- `selected_offices is not a list: "Chennai RO" (type: String)`

**Diagnosis:**
```sql
SELECT 
    id, 
    selected_offices,
    jsonb_typeof(selected_offices) as data_type
FROM page_configurations 
WHERE id = 'newreport';
```

**Solutions:**
```sql
-- Convert string to array
UPDATE page_configurations 
SET selected_offices = jsonb_build_array(selected_offices)
WHERE id = 'newreport' 
  AND jsonb_typeof(selected_offices) = 'string';
```

---

## 🧪 **Testing Your Fix**

### Test 1: Check Database
```sql
-- Should return empty array or your target offices
SELECT id, title, selected_offices 
FROM page_configurations 
WHERE id = 'newreport';
```

### Test 2: Check User Office
```sql
-- Should return your office name
SELECT officeName 
FROM user_profiles 
WHERE uid = 'your-firebase-uid';
```

### Test 3: Simulate Access Check
```sql
-- Should return true for your office
SELECT 
    CASE 
        WHEN selected_offices IS NULL OR jsonb_array_length(selected_offices) = 0 
        THEN true
        ELSE selected_offices ? 'Your Office Name'
    END as has_access
FROM page_configurations 
WHERE id = 'newreport';
```

### Test 4: App Testing
1. **Restart your Flutter app** (clear cache)
2. **Try accessing newreport form**
3. **Check console logs** for detailed debug output
4. **Look for success message:** `✅ FormFilteringService: Form has no office restrictions, allowing access`

---

## 📋 **Expected Debug Output (Success)**

```
🔒 FormFilteringService: Checking access for form: newreport
🔒 FormFilteringService: User office name: "Chennai RO"
🔒 FormFilteringService: Querying page_configurations for form: newreport
🔒 FormFilteringService: Query response: [{id: newreport, title: New Report, selected_offices: []}]
🔒 FormFilteringService: Form config: {id: newreport, title: New Report, selected_offices: []}
🔒 FormFilteringService: No office targeting found - allowing all users
🔒 FormFilteringService: Final selectedOffices: null
🔒 FormFilteringService: User office: "Chennai RO"
🔍 FormFilteringService: checkFormAccess called
🔍 FormFilteringService: userOfficeName = "Chennai RO"
🔍 FormFilteringService: formOfficeTargeting = null
✅ FormFilteringService: Form has no office restrictions, allowing access
🔒 FormFilteringService: Access result: GRANTED
🔒 FormFilteringService: User CAN access form: newreport
```

---

## 🚨 **Emergency Fix Script**

If nothing else works, run this complete fix:

```sql
-- EMERGENCY FIX: Make ALL forms accessible to ALL users
UPDATE page_configurations 
SET selected_offices = '[]'::jsonb;

-- Verify fix
SELECT 
    id, 
    title,
    'ALL USERS CAN ACCESS' as access_level
FROM page_configurations;
```

---

## 📞 **Still Having Issues?**

### Collect Debug Information:
1. **Console logs** from Flutter app
2. **Database query results** from diagnostic scripts
3. **User office name** from user_profiles table
4. **Form configuration** from page_configurations table

### Common Final Solutions:
1. **Restart Flutter app** (clear cache)
2. **Clear app data** and re-login
3. **Check network connectivity** to Supabase
4. **Verify Supabase credentials** in app config
5. **Run user migration** to sync Firebase → Supabase

---

## ✅ **Success Indicators**

After applying fixes, you should see:
- ✅ No more "CANNOT access form" errors
- ✅ Forms load successfully
- ✅ Debug logs show "GRANTED" access
- ✅ Users can submit forms without issues

The most common fix is simply ensuring the form has `selected_offices = '[]'::jsonb` (empty array) to allow all users! 🎯
