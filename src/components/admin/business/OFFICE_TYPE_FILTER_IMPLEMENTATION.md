# Office Type Filter Implementation

## 🎯 **Overview**
Added office type filtering functionality to the admin panel's ReportConfiguration component. Users can now filter offices by type (SO, RO, BO, HO, etc.) before selecting specific offices.

## ✅ **Implementation Details**

### **1. Updated ReportConfiguration Component**
- **File**: `web-app/src/components/admin/business/components/ReportConfiguration.tsx`
- **Changes**:
  - Added `selectedOfficeTypes` and `onOfficeTypesChange` props
  - Implemented office type filtering logic using `filterOfficesByType`
  - Added office type dropdown using `CheckboxDropdown` component
  - Added automatic reset logic when parent selections change

### **2. Office Type Filtering Logic**
```typescript
// Get unique office types from available offices
const availableOfficeTypes = getUniqueOfficeTypes(preFilteredOffices.map(office => office.name));

// Apply office type filtering if office types are selected
if (selectedOfficeTypes.length > 0) {
  filteredOffices = filterOfficesByType(filteredOffices, selectedOfficeTypes);
}
```

### **3. UI Layout**
- **Office Type Filter**: Left column (col-md-6)
- **Office Selection**: Right column (col-md-6)
- Both dropdowns are positioned in the same row for better UX

### **4. Available Office Types**
Based on `OFFICE_TYPES` constant:
- **SO** - Sub Office
- **RO** - Regional Office  
- **BO** - Branch Office
- **HO** - Head Office
- **DO** - Divisional Office
- **CO** - Circle Office
- **Division** - Division
- **Other** - Other types

## 🔄 **User Flow**

1. **Select Region** → Available divisions are filtered
2. **Select Division** → Available offices are filtered by region/division
3. **Select Office Type** → Available offices are further filtered by type
4. **Select Offices** → Only offices matching all filters are available

## 🔧 **Automatic Reset Logic**

### **When Divisions Change:**
- Office types are reset to empty array
- Offices are filtered to match new division selection

### **When Office Types Change:**
- Selected offices are validated against new office type filter
- Invalid offices are automatically removed from selection

### **When Regions Change:**
- Divisions are validated and filtered
- Cascading effect applies to office types and offices

## 📋 **Props Interface**
```typescript
interface ReportConfigurationProps {
  selectedRegions: string[];
  selectedDivisions: string[];
  selectedOffices: string[];
  selectedOfficeTypes?: string[];        // NEW
  selectedFrequency: string;
  onRegionsChange: (regions: string[]) => void;
  onDivisionsChange: (divisions: string[]) => void;
  onOfficesChange: (offices: string[]) => void;
  onOfficeTypesChange?: (officeTypes: string[]) => void;  // NEW
  onFrequencyChange: (frequency: string) => void;
}
```

## 🎨 **UI Components Used**

### **CheckboxDropdown for Office Types**
```tsx
<CheckboxDropdown
  id="office-type-select"
  label="Filter by Office Type"
  options={availableOfficeTypes}
  selectedValues={selectedOfficeTypes}
  onChange={onOfficeTypesChange}
  disabled={selectedDivisions.length === 0 || loading}
  placeholder="-- Select Office Types --"
/>
```

## 🔍 **State Management**
- **State Hook**: `usePageBuilderState.ts`
- **State Variables**: 
  - `selectedOfficeTypes: string[]`
  - `setSelectedOfficeTypes: (officeTypes: string[]) => void`

## 🧪 **Testing Scenarios**

### **Scenario 1: Basic Filtering**
1. Select a region (e.g., "South")
2. Select a division (e.g., "Coimbatore")
3. Select office type (e.g., "SO" - Sub Office)
4. Verify only Sub Offices in Coimbatore division are shown

### **Scenario 2: Multiple Office Types**
1. Select multiple office types (e.g., "SO" and "BO")
2. Verify offices of both types are shown
3. Verify other office types are filtered out

### **Scenario 3: Reset Behavior**
1. Select office types and offices
2. Change division selection
3. Verify office types are reset
4. Verify office selection is updated accordingly

## 🚀 **Benefits**

1. **Improved UX**: Users can quickly filter large office lists by type
2. **Reduced Cognitive Load**: Easier to find specific office types
3. **Better Organization**: Logical grouping of offices by type
4. **Consistent Filtering**: Follows the same pattern as region/division filtering

## 📝 **Usage Example**

```typescript
// In PageBuilder.tsx
<ReportConfiguration
  selectedRegions={state.selectedRegions}
  selectedDivisions={state.selectedDivisions}
  selectedOffices={state.selectedOffices}
  selectedOfficeTypes={state.selectedOfficeTypes}  // NEW
  selectedFrequency={state.selectedFrequency}
  onRegionsChange={handleRegionsChange}
  onDivisionsChange={handleDivisionsChange}
  onOfficesChange={handleOfficesChange}
  onOfficeTypesChange={handleOfficeTypesChange}    // NEW
  onFrequencyChange={handleFrequencyChange}
/>
```

## 🔧 **Technical Notes**

- Office type extraction is based on naming patterns (SO, RO, BO, etc.)
- Filtering is case-insensitive and handles various naming conventions
- The implementation reuses existing utility functions from `officeTypeUtils.ts`
- State management follows the existing pattern used for other dropdowns

## ✅ **Verification Checklist**

- [ ] Office type dropdown appears after selecting division
- [ ] Office types are populated based on available offices
- [ ] Office filtering works correctly when office types are selected
- [ ] Reset logic works when changing parent selections
- [ ] Multiple office type selection works
- [ ] Disabled state works correctly
- [ ] Loading states are handled properly
