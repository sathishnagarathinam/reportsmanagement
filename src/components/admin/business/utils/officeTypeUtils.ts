import { OfficeType, OFFICE_TYPES } from '../types/PageBuilderTypes';

/**
 * Extracts office type from office name based on common patterns
 * @param officeName - The full office name (e.g., "Coimbatore SO", "Chennai RO")
 * @returns The office type abbreviation (e.g., "SO", "RO") or "Other" if not found
 */
export const extractOfficeType = (officeName: string): string => {
  if (!officeName || typeof officeName !== 'string') {
    return 'other';
  }

  const name = officeName.trim().toLowerCase();

  // Check for division pattern
  if (name.endsWith('division')) {
    return 'division';
  }

  // Check for common office type patterns
  const patterns = [
    { pattern: /\bso\b/, type: 'so' },           // Sub Office
    { pattern: /\bro\b/, type: 'ro' },           // Regional Office
    { pattern: /\bbo\b/, type: 'bo' },           // Branch Office
    { pattern: /\bho\b/, type: 'ho' },           // Head Office
    { pattern: /\bdo\b/, type: 'do' },           // Divisional Office
    { pattern: /\bco\b/, type: 'co' },           // Circle Office
    { pattern: /sub office/i, type: 'so' },      // Full name patterns
    { pattern: /regional office/i, type: 'ro' },
    { pattern: /branch office/i, type: 'bo' },
    { pattern: /head office/i, type: 'ho' },
    { pattern: /divisional office/i, type: 'do' },
    { pattern: /circle office/i, type: 'co' },
  ];

  // Find matching pattern
  for (const { pattern, type } of patterns) {
    if (pattern.test(name)) {
      return type;
    }
  }

  return 'other';
};

/**
 * Gets the full office type information from abbreviation
 * @param abbreviation - Office type abbreviation (e.g., "SO", "RO")
 * @returns OfficeType object with full information
 */
export const getOfficeTypeInfo = (abbreviation: string): OfficeType => {
  const officeType = OFFICE_TYPES.find(type => type.id === abbreviation.toLowerCase());
  return officeType || OFFICE_TYPES.find(type => type.id === 'other')!;
};

/**
 * Gets all unique office types from a list of offices
 * @param offices - Array of office names
 * @returns Array of unique OfficeType objects found in the offices
 */
export const getUniqueOfficeTypes = (offices: string[]): OfficeType[] => {
  const uniqueTypes = new Set<string>();
  
  offices.forEach(officeName => {
    const type = extractOfficeType(officeName);
    uniqueTypes.add(type);
  });

  return Array.from(uniqueTypes)
    .map(type => getOfficeTypeInfo(type))
    .sort((a, b) => {
      // Sort with 'Other' at the end
      if (a.id === 'other') return 1;
      if (b.id === 'other') return -1;
      return a.name.localeCompare(b.name);
    });
};

/**
 * Filters offices by office type
 * @param offices - Array of office objects with names
 * @param selectedOfficeTypes - Array of office type IDs to filter by
 * @returns Filtered array of offices
 */
export const filterOfficesByType = <T extends { name: string }>(
  offices: T[],
  selectedOfficeTypes: string[]
): T[] => {
  if (!selectedOfficeTypes || selectedOfficeTypes.length === 0) {
    return offices;
  }

  return offices.filter(office => {
    const officeType = extractOfficeType(office.name);
    return selectedOfficeTypes.includes(officeType);
  });
};

/**
 * Adds office type information to office objects
 * @param offices - Array of office objects
 * @returns Array of office objects with officeType property added
 */
export const addOfficeTypeToOffices = <T extends { name: string }>(
  offices: T[]
): (T & { officeType: string })[] => {
  return offices.map(office => ({
    ...office,
    officeType: extractOfficeType(office.name)
  }));
};

/**
 * Gets office type statistics from a list of offices
 * @param offices - Array of office names
 * @returns Object with office type counts
 */
export const getOfficeTypeStats = (offices: string[]): Record<string, number> => {
  const stats: Record<string, number> = {};
  
  offices.forEach(officeName => {
    const type = extractOfficeType(officeName);
    stats[type] = (stats[type] || 0) + 1;
  });

  return stats;
};
