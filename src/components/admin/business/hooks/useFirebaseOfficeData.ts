import { useState, useEffect } from 'react';
import FirebaseOfficeService from '../../../../services/firebaseOfficeService';
import { Region, Division, Office } from '../types/PageBuilderTypes';

interface UseFirebaseOfficeDataReturn {
  regions: Region[];
  divisions: Division[];
  offices: Office[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useFirebaseOfficeData = (): UseFirebaseOfficeDataReturn => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOfficeData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🏢 useFirebaseOfficeData: Fetching office data from Firebase...');

      // Fetch all offices from Firebase
      const allOffices = await FirebaseOfficeService.fetchAllOffices();
      console.log(`✅ useFirebaseOfficeData: Fetched ${allOffices.length} offices`);

      // Extract unique regions
      const uniqueRegions = Array.from(
        new Set(allOffices.map(o => o.region).filter(Boolean))
      ).sort();

      const regionsData: Region[] = uniqueRegions.map(region => ({
        id: region,
        name: region,
      }));

      setRegions(regionsData);
      console.log(`✅ useFirebaseOfficeData: Found ${regionsData.length} regions`);

      // Extract divisions by region
      const divisionsData: Division[] = [];
      const divisionsSet = new Map<string, Set<string>>();

      allOffices.forEach(office => {
        if (!divisionsSet.has(office.region)) {
          divisionsSet.set(office.region, new Set());
        }
        if (office.division) {
          divisionsSet.get(office.region)?.add(office.division);
        }
      });

      divisionsSet.forEach((divSet, region) => {
        Array.from(divSet).sort().forEach(division => {
          divisionsData.push({
            id: `${region}-${division}`,
            name: division,
            region: region,
          });
        });
      });

      setDivisions(divisionsData);
      console.log(`✅ useFirebaseOfficeData: Found ${divisionsData.length} divisions`);

      // Convert offices to display format
      // Use officeName as the id/value so selectedOffices contains office names,
      // which matches the mobile app's employee officeName comparison.
      const officesData: Office[] = allOffices.map(office => ({
        id: office.officeName || '',
        name: office.officeName || '',
        region: office.region || '',
        division: office.division || '',
        facilityId: office.facilityId || '', // Keep facility ID for reference if needed
      })).sort((a, b) => a.name.localeCompare(b.name));

      setOffices(officesData);
      console.log(`✅ useFirebaseOfficeData: Processed ${officesData.length} offices`);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch office data';
      console.error('❌ useFirebaseOfficeData error:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

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
