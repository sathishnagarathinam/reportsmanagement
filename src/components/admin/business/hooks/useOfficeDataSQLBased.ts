import { useState, useEffect } from 'react';
import { supabase } from '../../../../config/supabaseClient';
import { Region, Division, Office } from '../types/PageBuilderTypes';

interface UseOfficeDataReturn {
  regions: Region[];
  divisions: Division[];
  offices: Office[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useOfficeDataSQLBased = (): UseOfficeDataReturn => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOfficeData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🚀 SQL-BASED: Starting data fetch using SQL-like approach...');

      // Step 1: Get unique regions using SQL-like query
      console.log('📊 SQL-BASED: Fetching unique regions...');
      const { data: regionData, error: regionError } = await supabase
        .from('offices')
        .select('Region')
        .order('Region', { ascending: true });

      if (regionError) {
        console.error('🚨 SQL-BASED: Region query error:', regionError);
        throw regionError;
      }

      console.log('✅ SQL-BASED: Raw region data:', regionData);

      // Process regions exactly like SQL DISTINCT
      const uniqueRegionNames = new Set<string>();
      regionData?.forEach(row => {
        if (row.Region) {
          uniqueRegionNames.add(row.Region);
        }
      });

      const regionsArray: Region[] = Array.from(uniqueRegionNames)
        .sort()
        .map(regionName => ({
          id: regionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          name: regionName,
        }));

      console.log('✅ SQL-BASED: Processed regions:', regionsArray);

      // Step 2: Get unique divisions with their regions
      console.log('📊 SQL-BASED: Fetching divisions...');
      const { data: divisionData, error: divisionError } = await supabase
        .from('offices')
        .select('Region, Division')
        .order('Region', { ascending: true })
        .order('Division', { ascending: true });

      if (divisionError) {
        console.error('🚨 SQL-BASED: Division query error:', divisionError);
        throw divisionError;
      }

      // Process divisions like SQL DISTINCT
      const uniqueDivisions = new Map<string, string>();
      divisionData?.forEach(row => {
        if (row.Region && row.Division) {
          uniqueDivisions.set(row.Division, row.Region);
        }
      });

      const divisionsArray: Division[] = Array.from(uniqueDivisions.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([divisionName, regionName]) => ({
          id: divisionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          name: divisionName,
          region: regionName,
        }));

      console.log('✅ SQL-BASED: Processed divisions:', divisionsArray);

      // Step 3: Get all offices
      console.log('📊 SQL-BASED: Fetching offices...');
      const { data: officeData, error: officeError } = await supabase
        .from('offices')
        .select('"Facility ID", Region, Division, "Office name"')
        .order('Region', { ascending: true })
        .order('Division', { ascending: true })
        .order('"Office name"', { ascending: true });

      if (officeError) {
        console.error('🚨 SQL-BASED: Office query error:', officeError);
        throw officeError;
      }

      const officesArray: Office[] = officeData?.map(row => ({
        id: row['Facility ID'],
        name: row['Office name'],
        region: row.Region,
        division: row.Division,
      })) || [];

      console.log('✅ SQL-BASED: Processed offices:', officesArray.length);

      // Set final state
      setRegions(regionsArray);
      setDivisions(divisionsArray);
      setOffices(officesArray);

      console.log('🎉 SQL-BASED: Data processing completed successfully!', {
        regions: regionsArray.length,
        divisions: divisionsArray.length,
        offices: officesArray.length
      });

    } catch (err) {
      console.error('🚨 SQL-BASED: Error in fetchOfficeData:', err);
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
