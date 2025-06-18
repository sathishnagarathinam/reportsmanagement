# Facility ID Integration & Hierarchy Fix

## Overview
Updated the Supabase integration to use 'Facility ID' as the primary key and improved the hierarchical data flow for the region → division → office cascade.

## Changes Made

### 1. Database Schema Update

#### New Table Structure
```sql
CREATE TABLE offices (
  "Facility ID" TEXT PRIMARY KEY,
  "Region" TEXT NOT NULL,
  "Division" TEXT NOT NULL,
  "Office name" TEXT NOT NULL
);
```

#### Sample Data
```sql
INSERT INTO offices ("Facility ID", "Region", "Division", "Office name") VALUES
('FAC001', 'North', 'North Division 1', 'North D1 Office 1'),
('FAC002', 'North', 'North Division 1', 'North D1 Office 2'),
('FAC003', 'North', 'North Division 2', 'North D2 Office 1'),
('FAC004', 'South', 'South Division 1', 'South D1 Office 1'),
('FAC005', 'South', 'South Division 2', 'South D2 Office 1');
```

### 2. Code Updates

#### Updated Query (`useOfficeData.ts`)
```typescript
// Before
.select('Region, Division, "Office name"')

// After  
.select('"Facility ID", Region, Division, "Office name"')
```

#### Updated Office ID Generation
```typescript
// Before
id: `${record.Region}-${record.Division}-${record['Office name']}`.toLowerCase().replace(/\s+/g, '-'),

// After
id: record['Facility ID'], // Use Facility ID directly
```

#### Enhanced Data Processing
- **Consistent sorting** for regions and divisions
- **Improved ID generation** for regions and divisions
- **Direct use of Facility ID** for offices
- **Better error handling** and logging

### 3. Hierarchy Flow Improvements

#### Cascading Logic
1. **Region Selection** → Filters divisions by region name
2. **Division Selection** → Filters offices by region + division
3. **Automatic Reset** → Child dropdowns reset when parent changes

#### Debug Logging Added
```typescript
console.log('Hierarchy Debug:', {
  selectedRegion,
  selectedRegionName,
  selectedDivision, 
  selectedDivisionName,
  selectedOffice,
  availableDivisions: availableDivisions.length,
  availableOffices: availableOffices.length
});
```

### 4. Enhanced Debug Tools

#### New SupabaseDebug Features
- **Test Connection** - Basic connectivity test
- **Check Table Structure** - Verify column names
- **Test Hierarchy Query** - Test exact query used by component

#### Debug Component Usage
```tsx
import SupabaseDebug from './components/SupabaseDebug';

// Add temporarily to test
<SupabaseDebug />
```

### 5. Updated Documentation

#### Files Updated
- `TROUBLESHOOTING.md` - Updated for Facility ID structure
- `SUPABASE_INTEGRATION.md` - Updated query examples
- `FACILITY_ID_UPDATE.md` - This documentation

## Data Flow

### 1. Database Query
```sql
SELECT "Facility ID", Region, Division, "Office name" 
FROM offices 
ORDER BY Region, Division, "Office name"
```

### 2. Data Processing
```typescript
// Extract unique regions
const uniqueRegions = new Set<string>();

// Map divisions to regions  
const uniqueDivisions = new Map<string, string>();

// Process offices with Facility ID
processedOffices.push({
  id: record['Facility ID'],
  name: record['Office name'],
  region: record.Region,
  division: record.Division,
});
```

### 3. Frontend Filtering
```typescript
// Filter divisions by selected region
const selectedRegionName = regions.find(r => r.id === selectedRegion)?.name || '';
const availableDivisions = divisions.filter(division => division.region === selectedRegionName);

// Filter offices by selected region + division
const selectedDivisionName = availableDivisions.find(d => d.id === selectedDivision)?.name || '';
const availableOffices = offices.filter(office => 
  office.region === selectedRegionName && office.division === selectedDivisionName
);
```

## Expected Results

### Dropdown Behavior
1. **Region Dropdown** - Shows all unique regions from database
2. **Division Dropdown** - Shows divisions for selected region only
3. **Office Dropdown** - Shows offices for selected region + division
4. **Frequency Dropdown** - Independent selection (Daily/Weekly/Monthly)

### Data Persistence
- Selected values saved with page configuration
- Facility ID used as office identifier
- Values restored when editing existing pages

## Troubleshooting

### Common Issues

#### 1. Facility ID Column Missing
**Error:** `column "Facility ID" does not exist`
**Solution:** Add the column to your table:
```sql
ALTER TABLE offices ADD COLUMN "Facility ID" TEXT;
UPDATE offices SET "Facility ID" = 'FAC' || row_number() OVER ();
ALTER TABLE offices ADD PRIMARY KEY ("Facility ID");
```

#### 2. Empty Dropdowns
**Check:** Browser console for hierarchy debug logs
**Verify:** Database has data with correct column names
**Test:** Use SupabaseDebug component

#### 3. Hierarchy Not Cascading
**Debug:** Check console logs for filtering results
**Verify:** Region and division names match exactly
**Test:** Manual database queries

### Debug Steps
1. Open browser DevTools → Console
2. Look for "Hierarchy Debug" logs
3. Verify data counts and selections
4. Use SupabaseDebug component for testing
5. Check network tab for API calls

## Benefits

### Performance
- **Single query** fetches all data
- **Client-side filtering** for fast interactions
- **Efficient data structure** with proper IDs

### Maintainability  
- **Clear separation** of concerns
- **Comprehensive logging** for debugging
- **Type-safe** interfaces
- **Reusable components**

### User Experience
- **Fast cascading** dropdowns
- **Proper loading states** 
- **Error handling** with retry
- **Data persistence** across sessions

## Next Steps

### Recommended Actions
1. **Test the integration** with your actual data
2. **Verify hierarchy flow** works correctly
3. **Check console logs** for any issues
4. **Use debug tools** if problems occur
5. **Update database** if Facility ID column missing

### Future Enhancements
- **Search functionality** within dropdowns
- **Bulk data management** tools
- **Real-time updates** with Supabase subscriptions
- **Role-based filtering** by user permissions

The integration now properly uses 'Facility ID' as the primary key and should provide correct hierarchical filtering for your office data!
