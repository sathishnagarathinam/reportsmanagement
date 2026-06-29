# Hierarchy Debug Guide

## Quick Debug Steps

### 1. Enable Debug Mode
1. Go to the PageBuilder component
2. Click the "🔧 Show Hierarchy Debug" button
3. This will show the HierarchyTest component with detailed debugging

### 2. Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for these log messages:
   - "Processing raw office records"
   - "Unique regions found"
   - "Unique divisions found"
   - "=== HIERARCHY DEBUG ==="

### 3. Verify Data Structure
The HierarchyTest component will show:
- Total counts of regions, divisions, offices
- Raw data structure
- Current selections
- Filtering results in real-time

## Common Hierarchy Issues

### Issue 1: Empty Division Dropdown
**Symptoms:** Region selected but no divisions appear

**Debug Steps:**
1. Check console for "Unique divisions found" log
2. Verify division data has correct region names
3. Check if region names match exactly (case-sensitive)

**Possible Causes:**
- Region names in database don't match exactly
- Extra spaces or special characters
- Case sensitivity issues

**Solution:**
```sql
-- Check for exact region names in your database
SELECT DISTINCT "Region" FROM offices ORDER BY "Region";

-- Check for divisions and their regions
SELECT DISTINCT "Region", "Division" FROM offices ORDER BY "Region", "Division";
```

### Issue 2: Empty Office Dropdown
**Symptoms:** Division selected but no offices appear

**Debug Steps:**
1. Check console for filtering debug logs
2. Verify office data has correct region AND division names
3. Check the "Office Filtering Debug" section in HierarchyTest

**Possible Causes:**
- Division names don't match exactly
- Region names don't match exactly
- Missing data relationships

### Issue 3: No Data Loading
**Symptoms:** All dropdowns empty

**Debug Steps:**
1. Check console for "Processing raw office records" log
2. Verify Supabase connection
3. Check for error messages

**Possible Causes:**
- Supabase connection issues
- Missing 'Facility ID' column
- Empty database table
- Permission issues (RLS)

## Expected Data Flow

### 1. Database Query
```sql
SELECT "Facility ID", Region, Division, "Office name" 
FROM offices 
ORDER BY Region, Division, "Office name"
```

### 2. Data Processing
```javascript
// Raw record from database
{
  "Facility ID": "FAC001",
  "Region": "North",
  "Division": "North Division 1",
  "Office name": "North D1 Office 1"
}

// Processed into separate arrays
regions: [
  { id: "north", name: "North" }
]

divisions: [
  { id: "north-division-1", name: "North Division 1", region: "North" }
]

offices: [
  { 
    id: "FAC001", 
    name: "North D1 Office 1", 
    region: "North", 
    division: "North Division 1" 
  }
]
```

### 3. Filtering Logic
```javascript
// When user selects region "north"
selectedRegionName = "North"

// Filter divisions
availableDivisions = divisions.filter(div => div.region === "North")

// When user selects division "north-division-1"  
selectedDivisionName = "North Division 1"

// Filter offices
availableOffices = offices.filter(office => 
  office.region === "North" && office.division === "North Division 1"
)
```

## Debug Checklist

### ✅ Database Level
- [ ] Table 'offices' exists
- [ ] Columns: "Facility ID", "Region", "Division", "Office name"
- [ ] Data exists in table
- [ ] No extra spaces in region/division names
- [ ] Consistent naming across records

### ✅ API Level  
- [ ] Supabase connection working
- [ ] Query returns data (check Network tab)
- [ ] No RLS blocking access
- [ ] Correct column names in query

### ✅ Processing Level
- [ ] Raw records logged in console
- [ ] Unique regions/divisions extracted correctly
- [ ] No errors in data transformation
- [ ] Final processed data looks correct

### ✅ UI Level
- [ ] Regions populate in dropdown
- [ ] Division dropdown enables after region selection
- [ ] Divisions filter correctly by region
- [ ] Office dropdown enables after division selection
- [ ] Offices filter correctly by region + division

## Manual Testing Steps

### 1. Test with HierarchyTest Component
1. Enable debug mode in PageBuilder
2. Check "Data Summary" section
3. Verify raw data in JSON format
4. Test dropdowns step by step
5. Watch "Current Selection Debug" section

### 2. Test with Browser Console
1. Select a region
2. Check console for filtering logs
3. Verify selectedRegionName matches database values
4. Check availableDivisions count

### 3. Test with Database Queries
```sql
-- Test 1: Get all unique regions
SELECT DISTINCT "Region" FROM offices;

-- Test 2: Get divisions for specific region
SELECT DISTINCT "Division" FROM offices WHERE "Region" = 'North';

-- Test 3: Get offices for specific region + division
SELECT * FROM offices 
WHERE "Region" = 'North' AND "Division" = 'North Division 1';
```

## Common Fixes

### Fix 1: Clean Region/Division Names
```sql
-- Remove extra spaces
UPDATE offices SET "Region" = TRIM("Region");
UPDATE offices SET "Division" = TRIM("Division");
UPDATE offices SET "Office name" = TRIM("Office name");
```

### Fix 2: Standardize Case
```sql
-- Make sure first letter is capitalized
UPDATE offices SET "Region" = INITCAP("Region");
UPDATE offices SET "Division" = INITCAP("Division");
```

### Fix 3: Check for Hidden Characters
```sql
-- Check for non-printable characters
SELECT "Region", LENGTH("Region"), ASCII("Region") FROM offices;
```

## Contact Information

If hierarchy still not working after these steps:
1. Share console logs from browser
2. Share sample data from database
3. Share results from HierarchyTest component
4. Include any error messages

The debug tools should help identify exactly where the hierarchy flow is breaking!
