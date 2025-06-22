/**
 * Utility functions for persisting dropdown selections in localStorage
 * This helps maintain selected values across component re-renders and page refreshes
 */

interface DropdownSelections {
  selectedRegions: string[];
  selectedDivisions: string[];
  selectedOffices: string[];
  selectedFrequency: string;
}

const STORAGE_KEY = 'admin_dropdown_selections';

/**
 * Save dropdown selections to localStorage
 */
export const saveDropdownSelections = (selections: DropdownSelections): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
  } catch (error) {
    console.warn('Failed to save dropdown selections to localStorage:', error);
  }
};

/**
 * Load dropdown selections from localStorage
 */
export const loadDropdownSelections = (): DropdownSelections | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load dropdown selections from localStorage:', error);
  }
  return null;
};

/**
 * Clear dropdown selections from localStorage
 */
export const clearDropdownSelections = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear dropdown selections from localStorage:', error);
  }
};

/**
 * Check if selections have changed
 */
export const hasSelectionsChanged = (
  current: DropdownSelections,
  previous: DropdownSelections
): boolean => {
  return (
    JSON.stringify(current.selectedRegions) !== JSON.stringify(previous.selectedRegions) ||
    JSON.stringify(current.selectedDivisions) !== JSON.stringify(previous.selectedDivisions) ||
    JSON.stringify(current.selectedOffices) !== JSON.stringify(previous.selectedOffices) ||
    current.selectedFrequency !== previous.selectedFrequency
  );
};
