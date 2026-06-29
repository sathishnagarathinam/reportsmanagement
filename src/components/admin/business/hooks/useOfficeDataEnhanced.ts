import { useState, useEffect } from 'react';
import { Region, Division, Office } from '../types/PageBuilderTypes';
import OfficeService from '../../../../services/officeService';

interface UseOfficeDataEnhancedReturn {
  regions: Region[];
  divisions: Division[];
  offices: Office[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  totalRecords: number;
  approach: string;
}

/**
 * Enhanced office data hook with comprehensive pagination
 * Mirrors the successful Flutter implementation to overcome 1000-record limit
 */
export const useOfficeDataEnhanced = (): UseOfficeDataEnhancedReturn => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [approach, setApproach] = useState<string>('');

  const fetchOfficeData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🏢 useOfficeDataEnhanced: Starting comprehensive office data fetch...');

      // Use enhanced OfficeService with comprehensive pagination
      const allOfficeData = await OfficeService.fetchAllOfficeData();
      
      console.log('✅ useOfficeDataEnhanced: Fetched office records:', allOfficeData.length, 'records');
      setTotalRecords(allOfficeData.length);

      if (allOfficeData.length === 0) {
        console.log('⚠️ useOfficeDataEnhanced: No office records found');
        setRegions([]);
        setDivisions([]);
        setOffices([]);
        setApproach('no-data');
        return;
      }

      // Process regions - get unique regions
      const uniqueRegions = new Set<string>();
      allOfficeData.forEach(office => {
        if (office.Region && office.Region.trim()) {
          uniqueRegions.add(office.Region.trim());
        }
      });

      const regionsArray: Region[] = Array.from(uniqueRegions)
        .sort()
        .map(regionName => ({
          id: regionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          name: regionName,
        }));

      console.log('📊 useOfficeDataEnhanced: Processed regions:', regionsArray.length);

      // Process divisions - get unique divisions with their regions
      const uniqueDivisions = new Map<string, string>();
      allOfficeData.forEach(office => {
        if (office.Division && office.Division.trim() && office.Region && office.Region.trim()) {
          uniqueDivisions.set(office.Division.trim(), office.Region.trim());
        }
      });

      const divisionsArray: Division[] = Array.from(uniqueDivisions.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([divisionName, regionName]) => ({
          id: divisionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          name: divisionName,
          region: regionName,
        }));

      console.log('📊 useOfficeDataEnhanced: Processed divisions:', divisionsArray.length);

      // Process offices - use office name as ID for consistency
      const officesArray: Office[] = allOfficeData
        .filter(office => office['Office name'] && office['Office name'].trim())
        .map(office => ({
          id: office['Office name'], // Use office name as ID for form targeting
          name: office['Office name'],
          region: office.Region || '',
          division: office.Division || '',
          facilityId: office['Office name'], // Keep for reference
        }));

      console.log('📊 useOfficeDataEnhanced: Processed offices:', officesArray.length);

      // Log comprehensive statistics
      logOfficeStatistics(allOfficeData, regionsArray, divisionsArray, officesArray);

      // Set the processed data
      setRegions(regionsArray);
      setDivisions(divisionsArray);
      setOffices(officesArray);
      setApproach('enhanced-pagination');

      console.log('✅ useOfficeDataEnhanced: Data processing complete');

    } catch (err) {
      console.error('❌ useOfficeDataEnhanced: Error:', err);
      setError('Failed to load office data. Please try again.');
      setRegions([]);
      setDivisions([]);
      setOffices([]);
      setTotalRecords(0);
      setApproach('error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchOfficeData();
  }, []);

  return {
    regions,
    divisions,
    offices,
    loading,
    error,
    refetch: fetchOfficeData,
    totalRecords,
    approach,
  };
};

/**
 * Log comprehensive statistics about the processed office data
 */
function logOfficeStatistics(
  allOfficeData: any[],
  regions: Region[],
  divisions: Division[],
  offices: Office[]
): void {
  console.log('📊 useOfficeDataEnhanced: === COMPREHENSIVE STATISTICS ===');
  console.log(`📊 useOfficeDataEnhanced: Raw records: ${allOfficeData.length}`);
  console.log(`📊 useOfficeDataEnhanced: Processed regions: ${regions.length}`);
  console.log(`📊 useOfficeDataEnhanced: Processed divisions: ${divisions.length}`);
  console.log(`📊 useOfficeDataEnhanced: Processed offices: ${offices.length}`);

  if (offices.length > 0) {
    // Alphabetical range
    const sortedNames = offices.map(o => o.name).sort();
    console.log(`📊 useOfficeDataEnhanced: Office range - First: "${sortedNames[0]}"`);
    console.log(`📊 useOfficeDataEnhanced: Office range - Last: "${sortedNames[sortedNames.length - 1]}"`);

    // Letter distribution
    const letterCounts: { [key: string]: number } = {};
    offices.forEach(office => {
      const firstLetter = office.name.charAt(0).toUpperCase();
      letterCounts[firstLetter] = (letterCounts[firstLetter] || 0) + 1;
    });

    console.log('📊 useOfficeDataEnhanced: Letter distribution:');
    Object.keys(letterCounts).sort().forEach(letter => {
      console.log(`📊 useOfficeDataEnhanced: ${letter}: ${letterCounts[letter]} offices`);
    });

    // Check for specific offices
    const tirupurDivision = offices.find(o => o.name.toLowerCase().includes('tirupur division'));
    const coimbatoreDivision = offices.find(o => o.name.toLowerCase().includes('coimbatore division'));
    
    console.log(`📊 useOfficeDataEnhanced: Contains "Tirupur division": ${!!tirupurDivision}`);
    console.log(`📊 useOfficeDataEnhanced: Contains "Coimbatore division": ${!!coimbatoreDivision}`);

    if (tirupurDivision) {
      console.log(`📊 useOfficeDataEnhanced: Found Tirupur division: "${tirupurDivision.name}"`);
    }
    if (coimbatoreDivision) {
      console.log(`📊 useOfficeDataEnhanced: Found Coimbatore division: "${coimbatoreDivision.name}"`);
    }

    // Region breakdown
    if (regions.length > 0) {
      console.log('📊 useOfficeDataEnhanced: Regions found:');
      regions.forEach(region => {
        const regionOffices = offices.filter(o => o.region === region.name);
        console.log(`📊 useOfficeDataEnhanced: ${region.name}: ${regionOffices.length} offices`);
      });
    }

    // Division breakdown
    if (divisions.length > 0) {
      console.log('📊 useOfficeDataEnhanced: Top 10 divisions by office count:');
      const divisionCounts = divisions.map(division => ({
        name: division.name,
        count: offices.filter(o => o.division === division.name).length
      })).sort((a, b) => b.count - a.count).slice(0, 10);

      divisionCounts.forEach(division => {
        console.log(`📊 useOfficeDataEnhanced: ${division.name}: ${division.count} offices`);
      });
    }
  }

  console.log('📊 useOfficeDataEnhanced: === END STATISTICS ===');
}

export default useOfficeDataEnhanced;
