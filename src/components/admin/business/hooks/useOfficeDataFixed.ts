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
  rawData: SupabaseOfficeRecord[];
}

export const useOfficeDataFixed = (): UseOfficeDataReturn => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [rawData, setRawData] = useState<SupabaseOfficeRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOfficeData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 FIXED: Starting data fetch with enhanced pagination...');

      // Use enhanced OfficeService with comprehensive pagination
      const allOfficeData = await OfficeService.fetchAllOfficeData();

      console.log('✅ FIXED: Raw data fetched:', {
        totalRecords: allOfficeData.length,
        sampleRecord: allOfficeData[0]
      });

      // Convert to expected format for processing
      const officeRecords = allOfficeData.map(office => ({
        'Facility ID': office['Office name'], // Use office name as ID
        'Region': office.Region || '',
        'Division': office.Division || '',
        'Office name': office['Office name']
      }));

      if (!officeRecords || officeRecords.length === 0) {
        console.warn('⚠️ FIXED: No records returned from database');
        setRegions([]);
        setDivisions([]);
        setOffices([]);
        setRawData([]);
        return;
      }

      // Store raw data for debugging
      setRawData(officeRecords);

      // Process regions with detailed logging
      console.log('🔄 FIXED: Processing regions...');
      const regionNames = new Set<string>();
      
      officeRecords.forEach((record, index) => {
        const regionValue = record.Region;
        console.log(`📍 FIXED: Record ${index + 1} - Region: "${regionValue}" (type: ${typeof regionValue})`);
        
        if (regionValue && typeof regionValue === 'string' && regionValue.trim()) {
          const cleanRegion = regionValue.trim();
          regionNames.add(cleanRegion);
          console.log(`✅ FIXED: Added region "${cleanRegion}" - Set size: ${regionNames.size}`);
        } else {
          console.warn(`⚠️ FIXED: Skipped invalid region in record ${index + 1}:`, regionValue);
        }
      });

      console.log('📊 FIXED: Final unique regions:', Array.from(regionNames));

      // Convert to regions array
      const regionsArray: Region[] = Array.from(regionNames)
        .sort()
        .map(regionName => {
          const id = regionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          console.log(`🏷️ FIXED: Region "${regionName}" -> ID "${id}"`);
          return {
            id,
            name: regionName,
          };
        });

      console.log('✅ FIXED: Regions array created:', regionsArray);

      // Process divisions
      console.log('🔄 FIXED: Processing divisions...');
      const divisionMap = new Map<string, string>();
      
      officeRecords.forEach((record, index) => {
        const regionValue = record.Region;
        const divisionValue = record.Division;
        
        if (regionValue && divisionValue && 
            typeof regionValue === 'string' && typeof divisionValue === 'string' &&
            regionValue.trim() && divisionValue.trim()) {
          
          const cleanRegion = regionValue.trim();
          const cleanDivision = divisionValue.trim();
          divisionMap.set(cleanDivision, cleanRegion);
          
          console.log(`📍 FIXED: Division "${cleanDivision}" -> Region "${cleanRegion}"`);
        }
      });

      const divisionsArray: Division[] = Array.from(divisionMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([divisionName, regionName]) => ({
          id: divisionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          name: divisionName,
          region: regionName,
        }));

      console.log('✅ FIXED: Divisions array created:', divisionsArray);

      // Process offices
      console.log('🔄 FIXED: Processing offices...');
      const officesArray: Office[] = [];
      
      officeRecords.forEach((record, index) => {
        const facilityId = record['Facility ID'];
        const regionValue = record.Region;
        const divisionValue = record.Division;
        const officeName = record['Office name'];
        
        if (facilityId && regionValue && divisionValue && officeName &&
            typeof regionValue === 'string' && typeof divisionValue === 'string' &&
            regionValue.trim() && divisionValue.trim()) {
          
          officesArray.push({
            id: facilityId,
            name: officeName,
            region: regionValue.trim(),
            division: divisionValue.trim(),
          });
        } else {
          console.warn(`⚠️ FIXED: Skipped invalid office record ${index + 1}:`, record);
        }
      });

      console.log('✅ FIXED: Offices array created:', {
        totalOffices: officesArray.length,
        sampleOffice: officesArray[0]
      });

      // Set final state
      setRegions(regionsArray);
      setDivisions(divisionsArray);
      setOffices(officesArray);

      console.log('🎉 FIXED: Data processing completed successfully!', {
        regions: regionsArray.length,
        divisions: divisionsArray.length,
        offices: officesArray.length
      });

    } catch (err) {
      console.error('🚨 FIXED: Error in fetchOfficeData:', err);
      setError('Failed to load office data. Please try again.');
      setRegions([]);
      setDivisions([]);
      setOffices([]);
      setRawData([]);
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
    rawData,
  };
};
