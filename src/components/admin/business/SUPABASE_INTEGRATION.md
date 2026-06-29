# Supabase Integration for Report Configuration

## Overview
The Report Configuration feature now integrates with Supabase database to fetch real-time data for regions, divisions, and offices from the 'offices' table.

## Database Schema

### Table: `offices`
The integration expects the following columns in the Supabase 'offices' table:

| Column Name | Type | Description |
|-------------|------|-------------|
| `id` | integer/serial | Primary key (optional) |
| `Region` | text | Region name (e.g., "North", "South") |
| `Division` | text | Division name within the region |
| `Office name` | text | Office name within the division |

### Example Data Structure
```sql
CREATE TABLE offices (
  id SERIAL PRIMARY KEY,
  "Region" TEXT NOT NULL,
  "Division" TEXT NOT NULL,
  "Office name" TEXT NOT NULL
);

-- Sample data
INSERT INTO offices ("Region", "Division", "Office name") VALUES
('North', 'North Division 1', 'North D1 Office 1'),
('North', 'North Division 1', 'North D1 Office 2'),
('North', 'North Division 2', 'North D2 Office 1'),
('South', 'South Division 1', 'South D1 Office 1'),
('South', 'South Division 2', 'South D2 Office 1');
```

## Technical Implementation

### Files Modified/Created

#### New Hook: `useOfficeData.ts`
- Custom React hook for fetching and managing office data
- Handles loading states, error handling, and data transformation
- Provides refetch functionality for retry operations

#### Updated Component: `ReportConfiguration.tsx`
- Replaced mock data with real Supabase data
- Added loading and error states
- Implemented cascading dropdown logic based on real data

#### Updated Types: `PageBuilderTypes.ts`
- Added `SupabaseOfficeRecord` interface
- Updated existing interfaces to match database structure

### Data Flow

1. **Component Mount**: `useOfficeData` hook automatically fetches data
2. **Data Processing**: Raw Supabase data is transformed into structured arrays
3. **State Management**: Regions, divisions, and offices are stored in component state
4. **Cascading Logic**: Dropdowns filter based on parent selections
5. **Error Handling**: Failed requests show error messages with retry option

### Query Details

```typescript
const { data: officeRecords, error: fetchError } = await supabase
  .from('offices')
  .select('id, Region, Division, "Office name"')
  .order('Region', { ascending: true })
  .order('Division', { ascending: true })
  .order('"Office name"', { ascending: true });
```

**Features:**
- Fetches all necessary columns
- Orders results hierarchically (Region → Division → Office)
- Uses double quotes for column names with spaces

### Data Transformation

The raw Supabase data is processed to create three separate arrays:

1. **Regions**: Unique region names with generated IDs
2. **Divisions**: Unique divisions with their parent region
3. **Offices**: All offices with region and division references

```typescript
// Example transformation
const regionsArray: Region[] = Array.from(uniqueRegions).map(regionName => ({
  id: regionName.toLowerCase().replace(/\s+/g, '-'),
  name: regionName,
}));
```

## Configuration

### Environment Variables
Ensure these are set in your `.env.local` file:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Client
The integration uses the existing Supabase client configuration:

```typescript
// web-app/src/config/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## User Experience

### Loading States
- Shows spinner and "Loading office data..." message
- Disables all dropdowns during loading
- Provides visual feedback for data fetching

### Error Handling
- Displays clear error messages
- Provides retry button for failed requests
- Gracefully handles empty datasets

### Cascading Behavior
- Division dropdown enables after region selection
- Office dropdown enables after division selection
- Selections reset when parent changes
- Real-time filtering based on database relationships

## Performance Considerations

### Optimization Features
- Single query fetches all data at once
- Data is cached in component state
- Minimal re-renders with proper state management
- Efficient filtering using JavaScript arrays

### Potential Improvements
1. **Caching**: Implement React Query or SWR for better caching
2. **Pagination**: Add pagination for large datasets
3. **Search**: Add search functionality within dropdowns
4. **Lazy Loading**: Load divisions/offices on-demand

## Error Scenarios

### Common Issues and Solutions

1. **Network Errors**
   - Shows retry button
   - Logs detailed error information
   - Maintains previous state if available

2. **Empty Database**
   - Shows empty dropdowns with appropriate messages
   - Doesn't break the UI flow

3. **Invalid Data Structure**
   - Handles missing columns gracefully
   - Provides fallback values for missing data

## Testing

### Manual Testing Checklist
- [ ] Data loads correctly on component mount
- [ ] Loading state displays properly
- [ ] Error state shows with retry functionality
- [ ] Cascading dropdowns work correctly
- [ ] Data persists when saved
- [ ] Retry button works after errors

### Database Testing
- [ ] Verify table structure matches expected schema
- [ ] Test with various data combinations
- [ ] Test with empty table
- [ ] Test with special characters in names

## Future Enhancements

### Planned Improvements
1. **Real-time Updates**: Use Supabase real-time subscriptions
2. **Role-based Filtering**: Filter data based on user permissions
3. **Bulk Operations**: Support for bulk data management
4. **Advanced Search**: Full-text search across all fields
5. **Data Validation**: Client-side validation for data integrity

### Integration Opportunities
- Connect with employee management system
- Integrate with organizational hierarchy
- Support for multi-tenant configurations
- API endpoints for external integrations

## Conclusion

The Supabase integration successfully replaces mock data with real database connectivity while maintaining excellent user experience and performance. The implementation is scalable, maintainable, and ready for production use.
