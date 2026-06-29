import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface OfficeData {
  officeName: string;
  region?: string;
  division?: string;
  facilityId?: string;
  reportingOfficeName?: string;
}

class FirebaseOfficeService {
  private static cachedOffices: OfficeData[] | null = null;
  private static cacheTimestamp: Date | null = null;
  private static readonly CACHE_EXPIRY_MINUTES = 30;

  /**
   * Fetch all offices from Firebase Firestore
   */
  static async fetchAllOffices(): Promise<OfficeData[]> {
    try {
      console.log('🏢 FirebaseOfficeService: Fetching all offices...');

      // Check cache first
      if (this.cachedOffices && this.cacheTimestamp) {
        const now = new Date();
        const cacheAgeMinutes = (now.getTime() - this.cacheTimestamp.getTime()) / (1000 * 60);
        
        if (cacheAgeMinutes < this.CACHE_EXPIRY_MINUTES) {
          console.log(`✅ FirebaseOfficeService: Returning cached offices (${this.cachedOffices.length} items)`);
          return this.cachedOffices;
        }
      }

      // Query all documents from offices collection
      // Note: We fetch all documents and sort client-side to avoid composite index requirements
      const officesRef = collection(db, 'offices');
      const q = query(officesRef);
      const snapshot = await getDocs(q);

      const offices: OfficeData[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        offices.push({
          facilityId: doc.id,
          officeName: data.officeName || '',
          region: data.region || '',
          division: data.division || '',
          reportingOfficeName: data.reportingOfficeName || '',
        });
      });

      // Sort client-side by region, then division, then officeName
      offices.sort((a, b) => {
        // Sort by region
        const regionCompare = (a.region || '').localeCompare(b.region || '');
        if (regionCompare !== 0) return regionCompare;

        // Then by division
        const divisionCompare = (a.division || '').localeCompare(b.division || '');
        if (divisionCompare !== 0) return divisionCompare;

        // Then by office name
        return (a.officeName || '').localeCompare(b.officeName || '');
      });

      console.log(`✅ FirebaseOfficeService: Fetched ${offices.length} offices`);

      // Cache the results
      this.cachedOffices = offices;
      this.cacheTimestamp = new Date();

      return offices;
    } catch (error) {
      console.error('❌ FirebaseOfficeService: Error fetching offices:', error);
      throw error;
    }
  }

  /**
   * Get unique regions
   */
  static async getRegions(): Promise<string[]> {
    try {
      const offices = await this.fetchAllOffices();
      const regions = Array.from(new Set(offices.map(o => o.region).filter(Boolean))) as string[];
      return regions.sort();
    } catch (error) {
      console.error('❌ FirebaseOfficeService: Error getting regions:', error);
      return [];
    }
  }

  /**
   * Get divisions by region
   */
  static async getDivisionsByRegion(region: string): Promise<string[]> {
    try {
      const offices = await this.fetchAllOffices();
      const divisions = Array.from(
        new Set(offices.filter(o => o.region === region).map(o => o.division).filter(Boolean))
      ) as string[];
      return divisions.sort();
    } catch (error) {
      console.error('❌ FirebaseOfficeService: Error getting divisions:', error);
      return [];
    }
  }

  /**
   * Get offices by region and division
   */
  static async getOfficesByRegionAndDivision(region: string, division: string): Promise<OfficeData[]> {
    try {
      const offices = await this.fetchAllOffices();
      return offices.filter(o => o.region === region && o.division === division).sort((a, b) => 
        (a.officeName || '').localeCompare(b.officeName || '')
      );
    } catch (error) {
      console.error('❌ FirebaseOfficeService: Error getting offices:', error);
      return [];
    }
  }

  /**
   * Get office details by facility ID
   */
  static async getOfficeByFacilityId(facilityId: string): Promise<OfficeData | null> {
    try {
      const offices = await this.fetchAllOffices();
      return offices.find(o => o.facilityId === facilityId) || null;
    } catch (error) {
      console.error('❌ FirebaseOfficeService: Error getting office details:', error);
      return null;
    }
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.cachedOffices = null;
    this.cacheTimestamp = null;
    console.log('✅ FirebaseOfficeService: Cache cleared');
  }
}

export default FirebaseOfficeService;
