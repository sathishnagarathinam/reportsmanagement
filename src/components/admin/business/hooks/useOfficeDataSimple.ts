import { useState, useEffect } from 'react';
import { supabase } from '../../../../config/supabaseClient';
import { Region, Division, Office } from '../types/PageBuilderTypes';
import OfficeService from '../../../../services/officeService';

interface UseOfficeDataReturn {
  regions: Region[];
  divisions: Division[];
  offices: Office[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useOfficeDataSimple = (): UseOfficeDataReturn => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOfficeData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🏢 useOfficeDataSimple: Fetching with enhanced pagination...');

      // Use enhanced OfficeService with comprehensive pagination
      const allData = await OfficeService.fetchAllOfficeData();

      console.log('✅ useOfficeDataSimple: Fetched', allData.length, 'office records');

      // Process regions exactly like SQL: SELECT DISTINCT "Region" FROM offices ORDER BY "Region"
      const distinctRegions = allData
        ?.map(row => row.Region)
        .filter((region, index, array) => array.indexOf(region) === index)
        .filter((region): region is string => region != null && region.trim() !== '') // Type guard to ensure string
        .sort();

      // Process regions successfully

      const regionsArray: Region[] = distinctRegions?.map(regionName => ({
        id: regionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        name: regionName,
      })) || [];

      // Process divisions exactly like SQL: SELECT DISTINCT "Region", "Division" FROM offices ORDER BY "Region", "Division"
      const distinctDivisions = allData
        ?.map(row => ({ region: row.Region, division: row.Division }))
        .filter((item, index, array) =>
          array.findIndex(x => x.region === item.region && x.division === item.division) === index
        )
        .filter((item): item is { region: string; division: string } =>
          item.region != null && item.division != null &&
          item.region.trim() !== '' && item.division.trim() !== ''
        )
        .sort((a, b) => a.region.localeCompare(b.region) || a.division.localeCompare(b.division));

      const divisionsArray: Division[] = distinctDivisions?.map(item => ({
        id: item.division.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        name: item.division,
        region: item.region,
      })) || [];

      // Process all offices - USE OFFICE NAME AS ID instead of Facility ID
      const officesArray: Office[] = allData
        ?.filter(row => row['Office name'] && row.Region && row.Division)
        .map(row => ({
          id: row['Office name'], // ✅ FIXED: Use office name as ID for form targeting
          name: row['Office name'],
          region: row.Region || '',
          division: row.Division || '',
          facilityId: row['Office name'], // Use office name as facility ID for consistency
        })) || [];

      // Data processing completed successfully

      setRegions(regionsArray);
      setDivisions(divisionsArray);
      setOffices(officesArray);

    } catch (err) {
      console.error('🚨 SIMPLE: Error:', err);
      setError('Failed to load office data. Please try again.');
      setRegions([]);
      setDivisions([]);
      setOffices([]);
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
  };
};
