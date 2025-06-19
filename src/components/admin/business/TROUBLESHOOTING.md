# Troubleshooting Supabase Integration

## Issue: Column 'id' does not exist

### Problem
Error message: `column offices.id does not exist`

### Solution ✅
**Fixed!** The query has been updated to remove the `id` column reference.

**Changes made:**
- Updated query to: `SELECT Region, Division, "Office name" FROM offices`
- Modified ID generation to use: `${Region}-${Division}-${Office name}`
- Updated TypeScript interfaces to match actual table structure

## Common Issues and Solutions

### 1. Table Structure Mismatch

**Symptoms:**
- Column not found errors
- Data not loading correctly

**Solution:**
Ensure your Supabase 'offices' table has exactly these columns:
- `Facility ID` (text/varchar) - Primary key
- `Region` (text)
- `Division` (text)
- `Office name` (text)

**SQL to create table:**
```sql
CREATE TABLE offices (
  "Facility ID" TEXT PRIMARY KEY,
  "Region" TEXT NOT NULL,
  "Division" TEXT NOT NULL,
  "Office name" TEXT NOT NULL
);
```

### 2. Environment Variables

**Symptoms:**
- Connection errors
- "Supabase URL or anon key is missing" error

**Solution:**
Check your `.env.local` file has:
```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Row Level Security (RLS)

**Symptoms:**
- Empty results despite having data
- Permission denied errors

**Solution:**
Either disable RLS or create appropriate policies:

**Option A: Disable RLS (for testing)**
```sql
ALTER TABLE offices DISABLE ROW LEVEL SECURITY;
```

**Option B: Create read policy**
```sql
CREATE POLICY "Allow public read access" ON offices
FOR SELECT USING (true);
```

### 4. Column Name Case Sensitivity

**Symptoms:**
- Column not found errors with correct column names

**Solution:**
Use double quotes for column names with spaces:
```sql
SELECT "Region", "Division", "Office name" FROM offices
```

### 5. Empty Database

**Symptoms:**
- Dropdowns show "-- Select --" but no options

**Solution:**
Add sample data:
```sql
INSERT INTO offices ("Facility ID", "Region", "Division", "Office name") VALUES
('FAC001', 'North', 'North Division 1', 'North D1 Office 1'),
('FAC002', 'North', 'North Division 1', 'North D1 Office 2'),
('FAC003', 'North', 'North Division 2', 'North D2 Office 1'),
('FAC004', 'South', 'South Division 1', 'South D1 Office 1'),
('FAC005', 'South', 'South Division 2', 'South D2 Office 1');
```

## Debug Tools

### Using SupabaseDebug Component

1. Import the debug component:
```tsx
import SupabaseDebug from './components/SupabaseDebug';
```

2. Add it temporarily to your page:
```tsx
<SupabaseDebug />
```

3. Use the buttons to:
   - Test connection
   - Check table structure
   - View sample data

### Browser Console Logs

The updated hook now includes console logs:
- Connection attempts
- Query results
- Data processing steps
- Error details

Open browser DevTools → Console to see detailed logs.

### Manual Database Check

1. Go to Supabase Dashboard
2. Navigate to Table Editor
3. Check 'offices' table exists
4. Verify column names match exactly
5. Ensure there's data in the table

## Verification Steps

### 1. Test Database Access
```sql
-- Run in Supabase SQL Editor
SELECT * FROM offices LIMIT 5;
```

### 2. Test Column Names
```sql
-- Check exact column names
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'offices';
```

### 3. Test API Access
```bash
# Test with curl (replace with your URL and key)
curl -X GET 'https://your-project.supabase.co/rest/v1/offices?select=*&limit=1' \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key"
```

## Expected Data Format

### Database Records
```json
[
  {
    "Facility ID": "FAC001",
    "Region": "North",
    "Division": "North Division 1",
    "Office name": "North D1 Office 1"
  },
  {
    "Facility ID": "FAC004",
    "Region": "South",
    "Division": "South Division 1",
    "Office name": "South D1 Office 1"
  }
]
```

### Processed Frontend Data
```json
{
  "regions": [
    {"id": "north", "name": "North"},
    {"id": "south", "name": "South"}
  ],
  "divisions": [
    {"id": "north-division-1", "name": "North Division 1", "region": "North"}
  ],
  "offices": [
    {
      "id": "FAC001",
      "name": "North D1 Office 1",
      "region": "North",
      "division": "North Division 1"
    }
  ]
}
```

## Performance Tips

### 1. Index Creation
```sql
-- Add indexes for better query performance
CREATE INDEX idx_offices_region ON offices("Region");
CREATE INDEX idx_offices_division ON offices("Division");
```

### 2. Data Validation
```sql
-- Add constraints to ensure data quality
ALTER TABLE offices ADD CONSTRAINT region_not_empty CHECK ("Region" != '');
ALTER TABLE offices ADD CONSTRAINT division_not_empty CHECK ("Division" != '');
ALTER TABLE offices ADD CONSTRAINT office_name_not_empty CHECK ("Office name" != '');
```

## Contact Support

If issues persist:
1. Check browser console for detailed error logs
2. Verify Supabase dashboard shows correct data
3. Test with the SupabaseDebug component
4. Review network tab in DevTools for API calls

The integration should now work correctly with your existing Supabase table structure!
