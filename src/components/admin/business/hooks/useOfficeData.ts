import { useState, useEffect } from 'react';
import { supabase } from '../../../../config/supabaseClient';
import { Region, Division, Office, SupabaseOfficeRecord } from '../types/PageBuilderTypes';
import OfficeService from '../../../../services/officeService';

interface UseOfficeDataReturn {
  regions: Region[];
  divisions: Division[];
  offices: Office[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useOfficeData = (): UseOfficeDataReturn => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOfficeData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🏢 useOfficeData: Fetching office data with comprehensive pagination...');

      // Use enhanced OfficeService with comprehensive pagination
      const allOfficeData = await OfficeService.fetchAllOfficeData();

      console.log('✅ useOfficeData: Fetched office records:', allOfficeData.length, 'records');

      // Convert OfficeData to SupabaseOfficeRecord format for processing
      const officeRecords: SupabaseOfficeRecord[] = allOfficeData.map(office => ({
        'Facility ID': office['Office name'], // Use office name as ID for consistency
        'Region': office.Region || '',
        'Division': office.Division || '',
        'Office name': office['Office name']
      }));

      if (officeRecords && officeRecords.length > 0) {
        // Process the data to extract unique regions, divisions, and offices
        const uniqueRegions = new Set<string>();
        const uniqueDivisions = new Map<string, string>(); // division -> region
        const processedOffices: Office[] = [];

        console.log('🔍 DEBUGGING: Processing raw office records:', officeRecords.length);
        console.log('🔍 DEBUGGING: First 5 raw records:', officeRecords.slice(0, 5));

        // CRITICAL FIX: Reset the Set to ensure clean state
        uniqueRegions.clear();
        uniqueDivisions.clear();
        processedOffices.length = 0;

        console.log('🔍 DEBUGGING: Starting fresh with empty collections');

        officeRecords.forEach((record: SupabaseOfficeRecord, index: number) => {
          console.log(`🔍 DEBUGGING: Processing record ${index + 1}:`, {
            facilityId: record['Facility ID'],
            region: record.Region,
            division: record.Division,
            officeName: record['Office name'],
            regionType: typeof record.Region,
            regionLength: record.Region?.length,
            regionTrimmed: record.Region?.trim(),
            regionValue: JSON.stringify(record.Region)
          });

          // CRITICAL FIX: More robust region validation
          const regionValue = record.Region;
          if (regionValue === null || regionValue === undefined || regionValue === '') {
            console.warn(`🚨 DEBUGGING: Record ${index + 1} has null/undefined/empty region:`, record);
            return; // Skip this record
          }

          // CRITICAL FIX: Convert to string and trim
          const regionString = String(regionValue).trim();
          if (regionString === '' || regionString === 'null' || regionString === 'undefined') {
            console.warn(`🚨 DEBUGGING: Record ${index + 1} has invalid region after string conversion:`, regionString);
            return; // Skip this record
          }

          // Add region to Set
          const sizeBefore = uniqueRegions.size;
          uniqueRegions.add(regionString);
          const sizeAfter = uniqueRegions.size;

          console.log(`✅ DEBUGGING: Added region "${regionString}" - Set size: ${sizeBefore} → ${sizeAfter} ${sizeAfter > sizeBefore ? '(NEW)' : '(DUPLICATE)'}`);

          // Process division
          const divisionValue = record.Division;
          if (divisionValue && String(divisionValue).trim()) {
            const cleanDivision = String(divisionValue).trim();
            uniqueDivisions.set(cleanDivision, regionString);
            console.log(`✅ DEBUGGING: Added division "${cleanDivision}" → region "${regionString}"`);
          }

          // Process office - USE OFFICE NAME AS ID instead of Facility ID
          const facilityId = record['Facility ID'];
          const officeName = record['Office name'];
          if (facilityId && officeName) {
            processedOffices.push({
              id: String(officeName), // ✅ FIXED: Use office name as ID for form targeting
              name: String(officeName),
              region: regionString,
              division: divisionValue ? String(divisionValue).trim() : '',
              facilityId: String(facilityId), // Keep facility ID for reference
            });
          }
        });

        console.log('🎉 DEBUGGING: === FINAL REGION EXTRACTION RESULTS ===');
        console.log('🎉 DEBUGGING: Unique regions Set:', uniqueRegions);
        console.log('🎉 DEBUGGING: Unique regions Array:', Array.from(uniqueRegions));
        console.log('🎉 DEBUGGING: Total unique regions:', uniqueRegions.size);
        console.log('🎉 DEBUGGING: Expected: 4, Actual:', uniqueRegions.size);
        console.log('🎉 DEBUGGING: Unique divisions found:', Array.from(uniqueDivisions.entries()));
        console.log('🎉 DEBUGGING: Total offices processed:', processedOffices.length);
        console.log('🎉 DEBUGGING: === END REGION DEBUG ===');

        // CRITICAL FIX: Convert regions Set to Array with detailed logging
        console.log('🔄 DEBUGGING: Converting Set to Array...');
        console.log('🔄 DEBUGGING: uniqueRegions Set before conversion:', uniqueRegions);
        console.log('🔄 DEBUGGING: uniqueRegions Set size:', uniqueRegions.size);

        const regionsFromSet = Array.from(uniqueRegions);
        console.log('🔄 DEBUGGING: Array.from(uniqueRegions):', regionsFromSet);

        const sortedRegions = regionsFromSet.sort();
        console.log('🔄 DEBUGGING: After sorting:', sortedRegions);

        const regionsArray: Region[] = sortedRegions.map((regionName, index) => {
          const id = regionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          console.log(`🔄 DEBUGGING: Region ${index + 1}: "${regionName}" → ID: "${id}"`);
          return {
            id,
            name: regionName,
          };
        });

        console.log('✅ DEBUGGING: Final regionsArray:', regionsArray);

        // Convert divisions to array with consistent ID generation
        const divisionsArray: Division[] = Array.from(uniqueDivisions.entries())
          .sort(([a], [b]) => a.localeCompare(b)) // Sort by division name
          .map(([divisionName, regionName]) => ({
            id: divisionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            name: divisionName,
            region: regionName,
          }));

        console.log('🎉 DEBUGGING: === FINAL PROCESSED DATA ===');
        console.log('🎉 DEBUGGING: regionsArray length:', regionsArray.length);
        console.log('🎉 DEBUGGING: regionsArray:', regionsArray);
        console.log('🎉 DEBUGGING: divisionsArray length:', divisionsArray.length);
        console.log('🎉 DEBUGGING: processedOffices length:', processedOffices.length);
        console.log('🎉 DEBUGGING: === END FINAL DATA ===');

        setRegions(regionsArray);
        setDivisions(divisionsArray);
        setOffices(processedOffices);

        console.log('Processed data:', {
          regions: regionsArray.length,
          divisions: divisionsArray.length,
          offices: processedOffices.length
        });
      } else {
        // No data found
        console.log('No office records found in database');
        setRegions([]);
        setDivisions([]);
        setOffices([]);
      }
    } catch (err) {
      console.error('Error fetching office data:', err);
      setError('Failed to load office data. Please try again.');
      // Set empty arrays on error
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
