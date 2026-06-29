# Office Dropdown Debug Guide

## 🚨 **Issue: Only User Office Listed**

If the hierarchical office filtering is only showing the user's office instead of multiple related offices, this guide will help identify and fix the issue.

## 🔍 **Debugging Steps**

### **Step 1: Check Console Output**

Run the app and look for these debug messages in the console:

#### **Expected Debug Flow:**
```
OfficeService: Building hierarchical office list for user: Alandurai SO
OfficeService: Querying Supabase for user office: Alandurai SO
OfficeService: Query response length: 1
OfficeService: User office record found: {Office name: Alandurai SO, Reporting Office Nam: Chennai RO, ...}
OfficeService: User reporting office from DB: Chennai RO
OfficeService: Available columns in user office record: [Office name, Reporting Office Nam, Region, Division, ...]
OfficeService: Found 4 offices under reporting office: Chennai RO
OfficeService: Added user office: Alandurai SO
OfficeService: Added sibling office: Tambaram SO
OfficeService: Added sibling office: Velachery SO
OfficeService: Added reporting office: Chennai RO
OfficeService: Successfully returned 4 hierarchical office names: [Alandurai SO, Chennai RO, Tambaram SO, Velachery SO]
```

#### **Problem Scenarios:**

##### **Scenario A: User Office Not Found in Database**
```
OfficeService: Querying Supabase for user office: Alandurai SO
OfficeService: Query response length: 0
OfficeService: User office not found in Supabase, returning user office only
OfficeService: This might be because:
  1. Office name "Alandurai SO" does not exist in Supabase offices table
  2. Column name mismatch in query
  3. Database connection issue
OfficeService: Sample records from offices table:
  - Office: Chennai RO, Reporting: South Regional Office
  - Office: Bangalore SO, Reporting: Bangalore RO
```

**Solution:** The user's office name in Firebase doesn't match any office name in Supabase.

##### **Scenario B: No Reporting Office Name**
```
OfficeService: User office record found: {Office name: Alandurai SO, Region: South, Division: Tamil Nadu}
OfficeService: User reporting office from DB: null
OfficeService: Available columns in user office record: [Office name, Region, Division, Facility ID]
OfficeService: No reporting office found, showing user office only
```

**Solution:** The "Reporting Office Name" column is missing or null in the database.

##### **Scenario C: No Sibling Offices Found**
```
OfficeService: User reporting office from DB: Chennai RO
OfficeService: Found 0 offices under reporting office: Chennai RO
OfficeService: No reporting office found, showing user office only
```

**Solution:** No other offices report to the same reporting office.

### **Step 2: Verify Database Structure**

#### **Check Supabase 'offices' Table:**

1. **Login to Supabase Dashboard**
2. **Navigate to Table Editor**
3. **Open 'offices' table**
4. **Verify columns exist:**
   - ✅ `"Office name"` (with space)
   - ✅ `"Reporting Office Nam"` (with space, missing final 'e')
   - ✅ `"Region"`
   - ✅ `"Division"`

#### **Sample Data Structure:**
```sql
-- Expected table structure
CREATE TABLE offices (
  "Office name" TEXT,              -- e.g., "Alandurai SO"
  "Reporting Office Nam" TEXT,     -- e.g., "Chennai RO" (note: missing final 'e')
  "Region" TEXT,                   -- e.g., "South"
  "Division" TEXT,                 -- e.g., "Tamil Nadu"
  "Facility ID" TEXT               -- e.g., "TN001"
);

-- Sample data
INSERT INTO offices VALUES
('Alandurai SO', 'Chennai RO', 'South', 'Tamil Nadu', 'TN001'),
('Tambaram SO', 'Chennai RO', 'South', 'Tamil Nadu', 'TN002'),
('Velachery SO', 'Chennai RO', 'South', 'Tamil Nadu', 'TN003'),
('Chennai RO', 'South Regional Office', 'South', 'Tamil Nadu', 'TN000');
```

### **Step 3: Verify User Data**

#### **Check Firebase User Document:**

1. **Login to Firebase Console**
2. **Navigate to Firestore Database**
3. **Open 'employees' collection**
4. **Find user document**
5. **Verify `officeName` field matches Supabase data**

#### **Example User Document:**
```javascript
// Firebase employees/[userId]
{
  uid: "user123",
  name: "John Doe",
  officeName: "Alandurai SO",  // Must match Supabase "Office name" exactly
  email: "john@example.com",
  designation: "Officer"
}
```

### **Step 4: Common Issues and Solutions**

#### **Issue 1: Office Name Mismatch**
- **Problem:** User's `officeName` in Firebase doesn't match Supabase `"Office name"`
- **Example:** Firebase has "Alandurai" but Supabase has "Alandurai SO"
- **Solution:** Update either Firebase or Supabase to match exactly

#### **Issue 2: Missing "Reporting Office Name" Column**
- **Problem:** Supabase table doesn't have "Reporting Office Name" column
- **Solution:** Add the column to Supabase table:
```sql
ALTER TABLE offices ADD COLUMN "Reporting Office Name" TEXT;
```

#### **Issue 3: Null Reporting Office Data**
- **Problem:** "Reporting Office Name" column exists but values are null
- **Solution:** Update records with proper reporting office names:
```sql
UPDATE offices 
SET "Reporting Office Name" = 'Chennai RO' 
WHERE "Office name" IN ('Alandurai SO', 'Tambaram SO', 'Velachery SO');
```

#### **Issue 4: Column Name Case Sensitivity**
- **Problem:** Column names have different casing
- **Solution:** Ensure exact match including spaces and case:
  - ✅ `"Office name"` (lowercase 'n')
  - ❌ `"Office Name"` (uppercase 'N')

#### **Issue 5: No Sibling Offices**
- **Problem:** User's office is the only one under that reporting office
- **Expected:** This is normal behavior - dropdown will show user office + reporting office only

### **Step 5: Manual Testing**

#### **Test Database Queries Manually:**

1. **Test User Office Query:**
```sql
SELECT * FROM offices WHERE "Office name" = 'Alandurai SO';
```
Expected: 1 record with "Reporting Office Name" populated

2. **Test Sibling Offices Query:**
```sql
SELECT "Office name" FROM offices WHERE "Reporting Office Name" = 'Chennai RO';
```
Expected: Multiple records including user's office

#### **Test in Supabase SQL Editor:**
1. **Go to Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Run the queries above**
4. **Verify results match expectations**

### **Step 6: Quick Fixes**

#### **Fix 1: Add Sample Data**
If your offices table is empty or incomplete:
```sql
INSERT INTO offices ("Office name", "Reporting Office Name", "Region", "Division") VALUES 
('Alandurai SO', 'Chennai RO', 'South', 'Tamil Nadu'),
('Tambaram SO', 'Chennai RO', 'South', 'Tamil Nadu'),
('Velachery SO', 'Chennai RO', 'South', 'Tamil Nadu'),
('Anna Nagar SO', 'Chennai RO', 'South', 'Tamil Nadu'),
('Chennai RO', 'South Regional Office', 'South', 'Tamil Nadu');
```

#### **Fix 2: Update User Office Name**
If user's Firebase office name doesn't match:
1. **Go to Firebase Console**
2. **Update user's `officeName` field**
3. **Ensure exact match with Supabase data**

#### **Fix 3: Clear Cache**
Force refresh by clearing the cache:
- **Flutter:** Restart the app
- **React:** Refresh the browser page
- **Or:** Wait 30 minutes for cache to expire

## ✅ **Expected Final Result**

After fixing the issues, you should see:

### **Console Output:**
```
OfficeService: Successfully returned 5 hierarchical office names: 
[Alandurai SO, Anna Nagar SO, Chennai RO, Tambaram SO, Velachery SO]
```

### **Dropdown Options:**
- Alandurai SO (user's office)
- Anna Nagar SO (sibling office)
- Chennai RO (reporting office)
- Tambaram SO (sibling office)
- Velachery SO (sibling office)

### **User Experience:**
- **Multiple office options** available for selection
- **Organizational context** clearly visible
- **Alphabetically sorted** options
- **Fast loading** with caching

## 🔧 **Still Having Issues?**

If the problem persists:

1. **Check network connectivity** to Supabase
2. **Verify Supabase API keys** and permissions
3. **Test with different user accounts**
4. **Check browser/app console** for additional errors
5. **Verify Supabase RLS policies** allow reading offices table

The debug output will help identify exactly where the process is failing and guide you to the appropriate solution! 🎯
