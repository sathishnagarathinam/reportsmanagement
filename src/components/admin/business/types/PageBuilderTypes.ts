// Interfaces for PageBuilder component

export interface FormFieldOption {
  label: string;
  value: string;
}

// NOTE: This FormField interface is for the PageBuilder's internal state
// and represents the configuration being built for a specific 'page'.
// It's slightly different from the DynamicFormField used by the DynamicForm component.
export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'dropdown' | 'radio' | 'checkbox' | 'checkbox-group' | 'section' | 'button' | 'file' | 'switch' | 'calculated';
  label: string;
  placeholder?: string;
  region?: string;
  division?: string;
  office?: string;
  options?: FormFieldOption[]; // For dropdown, radio, checkbox
  required?: boolean;
  value?: any; // Current value of the field (might not be used in builder, but kept for consistency)
  // For section type
  sectionTitle?: string;
  columns?: number; // Number of columns for fields within the section
  // For button type
  buttonText?: string;
  buttonType?: string;
  onClickAction?: string;
  defaultValue?: any;
  min?: number;
  max?: number;
  // For calculated fields
  calculationType?: 'sum' | 'subtract' | 'multiply' | 'divide' | 'average' | 'percentage' | 'custom';
  sourceFields?: string[]; // Array of field IDs to use in calculation
  customFormula?: string; // Custom JavaScript formula for advanced calculations
  decimalPlaces?: number; // Number of decimal places to show
  prefix?: string; // Prefix for display (e.g., "$", "₹")
  suffix?: string; // Suffix for display (e.g., "%", "kg")
  [key: string]: any; // Add this index signature
}

export interface PageConfig {
  id: string;
  title: string;
  fields: FormField[];
  lastUpdated: string;
  isPage?: boolean; // New field
  pageId?: string;
  // Report configuration - updated to support both old single values and new arrays
  selectedRegion?: string; // Keep for backward compatibility
  selectedDivision?: string; // Keep for backward compatibility
  selectedOffice?: string; // Keep for backward compatibility
  selectedRegions?: string[]; // New array-based selections
  selectedDivisions?: string[]; // New array-based selections
  selectedOffices?: string[]; // New array-based selections
  selectedFrequency?: string;
}

export interface Category {
  id: string;
  title: string;
  path: string; // e.g., /categories/parent-id/child-id
  parentId: string | null;
  children?: Category[];
  icon?: string; // Icon name (e.g., 'FaFolder')
  color?: string; // Color for the icon/card
  fields?: FormField[]; // If storing form fields directly on category for some reason
  lastUpdated?: string;
  isPage: boolean; // New field
  pageId: string; 
}

export interface PageBuilderState {
  categories: Category[];
  selectedCard: string;
  pageConfig: PageConfig | null;
  fields: FormField[];
  availableDynamicFields: any[];
  isLoading: boolean;
  loading: boolean;
  error: string | null;
  success: string | null;
  isAddingNewCard: boolean;
  newCardId: string;
  newCardTitle: string;
  showConfirmModal: boolean;
  editingCard: Category | null;
  showEditModal: boolean;
  cardToDelete: string | null;
  showDeleteConfirmModal: boolean;
  actionType: string;
  isPreviewOpen: boolean;
  previewContent: string;
  // New dropdown states - updated to arrays for multiple selections
  selectedRegions: string[];
  selectedDivisions: string[];
  selectedOffices: string[];
  selectedFrequency: string;
}

// Report frequency options
export interface ReportFrequency {
  value: string;
  label: string;
}

export const REPORT_FREQUENCIES: ReportFrequency[] = [
  { value: 'onetime', label: 'One Time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
];

// Location hierarchy interfaces - matching Supabase table structure
export interface Region {
  id: string;
  name: string;
}

export interface Division {
  id: string;
  name: string;
  region: string; // matches the Region column in Supabase
}

export interface Office {
  id: string; // Now uses office name instead of facility ID
  name: string;
  region: string; // matches the Region column in Supabase
  division: string; // matches the Division column in Supabase
  facilityId?: string; // Keep facility ID for reference/mapping
  officeType?: string; // Extracted office type (SO, RO, BO, HO, etc.)
}

// Office type interface for filtering
export interface OfficeType {
  id: string;
  name: string;
  abbreviation: string;
}

// Common office types based on naming patterns
export const OFFICE_TYPES: OfficeType[] = [
  { id: 'so', name: 'Sub Office', abbreviation: 'SO' },
  { id: 'ro', name: 'Regional Office', abbreviation: 'RO' },
  { id: 'bo', name: 'Branch Office', abbreviation: 'BO' },
  { id: 'ho', name: 'Head Office', abbreviation: 'HO' },
  { id: 'do', name: 'Divisional Office', abbreviation: 'DO' },
  { id: 'co', name: 'Circle Office', abbreviation: 'CO' },
  { id: 'division', name: 'Division', abbreviation: 'Division' },
  { id: 'other', name: 'Other', abbreviation: 'Other' }
];

// Supabase office record interface (matches actual table structure)
export interface SupabaseOfficeRecord {
  'Facility ID': string;
  Region: string;
  Division: string;
  'Office name': string;
}
