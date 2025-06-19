import { supabase } from '../config/supabaseClient';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface OfficeData {
  'Office name': string;
  Region?: string;
  Division?: string;
}

class OfficeService {
  private static cachedOfficeNames: string[] | null = null;
  private static cacheTimestamp: Date | null = null;
  private static readonly CACHE_EXPIRY_MINUTES = 30;

  // Cache for user-specific office names
  private static userSpecificCache: Map<string, string[]> = new Map();
  private static userCacheTimestamps: Map<string, Date> = new Map();

  /**
   * Fetches office names from Supabase database with comprehensive pagination
   * Returns a list of office names from the 'offices' table (ALL records, not just first 1000)
   */
  static async fetchOfficeNames(): Promise<string[]> {
    try {
      // Check if we have valid cached data
      if (this.isCacheValid()) {
        console.log('OfficeService: Returning cached office names', this.cachedOfficeNames?.length, 'items');
        return this.cachedOfficeNames!;
      }

      console.log('🏢 OfficeService: Fetching office names with comprehensive pagination...');

      // Use comprehensive pagination to get ALL records
      const result = await this.fetchAllOfficesWithPagination();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch offices');
      }

      // Extract office names from the comprehensive result
      const officeNames: string[] = [];
      for (const office of result.data) {
        const officeName = office['Office name'];
        if (officeName && typeof officeName === 'string' && officeName.trim()) {
          officeNames.push(officeName.trim());
        }
      }

      // Remove duplicates and sort
      const uniqueOfficeNames = Array.from(new Set(officeNames)).sort();

      // Cache the results
      this.cachedOfficeNames = uniqueOfficeNames;
      this.cacheTimestamp = new Date();

      console.log(`✅ OfficeService: Successfully fetched ${uniqueOfficeNames.length} office names using ${result.approach} approach`);

      // Log statistics
      this.logOfficeStatistics(uniqueOfficeNames);

      return uniqueOfficeNames;

    } catch (error) {
      console.error('❌ OfficeService: Error fetching office names:', error);

      // Return cached data if available, even if expired
      if (this.cachedOfficeNames) {
        console.log('OfficeService: Returning expired cached data due to error');
        return this.cachedOfficeNames;
      }

      // If no cached data, rethrow the error
      throw error;
    }
  }

  /**
   * Clears the cached office names
   * Useful when you want to force a fresh fetch
   */
  static clearCache(): void {
    this.cachedOfficeNames = null;
    this.cacheTimestamp = null;
    console.log('OfficeService: Cache cleared');
  }

  /**
   * Checks if the cache is valid
   */
  static isCacheValid(): boolean {
    if (!this.cachedOfficeNames || !this.cacheTimestamp) {
      return false;
    }

    const now = new Date();
    const diffMinutes = (now.getTime() - this.cacheTimestamp.getTime()) / (1000 * 60);
    return diffMinutes < this.CACHE_EXPIRY_MINUTES;
  }

  /**
   * Gets cached office names without making a network request
   * Returns null if no valid cache exists
   */
  static getCachedOfficeNames(): string[] | null {
    if (this.isCacheValid()) {
      return this.cachedOfficeNames;
    }
    return null;
  }

  /**
   * Refreshes the cache by fetching fresh data
   */
  static async refreshOfficeNames(): Promise<string[]> {
    this.clearCache();
    return await this.fetchOfficeNames();
  }

  /**
   * Fetches office names for the current user using hierarchical filtering
   * Returns user's office + all offices that report TO the user's office
   */
  static async fetchUserSpecificOfficeNames(): Promise<string[]> {
    try {
      // Get current user's office name
      const userOfficeData = await this.getCurrentUserOfficeData();
      const userOfficeName = userOfficeData.officeName;

      if (!userOfficeName) {
        // If no user office found, return empty array
        console.log('OfficeService: No user office found, returning empty array');
        return [];
      }

      // Check cache for user-specific data
      const cacheKey = userOfficeName;
      if (this.userSpecificCache.has(cacheKey) && this.userCacheTimestamps.has(cacheKey)) {
        const cacheTime = this.userCacheTimestamps.get(cacheKey)!;
        const diffMinutes = (new Date().getTime() - cacheTime.getTime()) / (1000 * 60);
        if (diffMinutes < this.CACHE_EXPIRY_MINUTES) {
          console.log('OfficeService: Returning cached hierarchical office names', this.userSpecificCache.get(cacheKey)?.length, 'items');
          return this.userSpecificCache.get(cacheKey)!;
        }
      }

      console.log('OfficeService: Building hierarchical office list for user:', userOfficeName);

      // Query Supabase to find all offices that report TO the user's office
      console.log('OfficeService: Querying offices that report to user office:', userOfficeName);

      const { data: reportingOfficesData, error: reportingOfficesError } = await supabase
        .from('offices')
        .select('"Office name"')
        .eq('"Reporting Office Nam"', userOfficeName)
        .order('"Office name"', { ascending: true });

      console.log('OfficeService: Found', reportingOfficesData?.length || 0, 'offices reporting to:', userOfficeName);

      if (reportingOfficesError) {
        console.error('OfficeService: Error querying reporting offices:', reportingOfficesError);
        throw reportingOfficesError;
      }

      // Build list of offices to show
      const officeList: string[] = [];

      // Add user's own office
      officeList.push(userOfficeName);
      console.log('OfficeService: Added user office:', userOfficeName);

      // Add all offices that report to the user's office
      if (reportingOfficesData) {
        for (const office of reportingOfficesData) {
          const officeName = (office as any)['Office name'];
          if (officeName && typeof officeName === 'string' && officeName.trim()) {
            officeList.push(officeName.trim());
            console.log('OfficeService: Added reporting office:', officeName);
          }
        }
      }

      if (!reportingOfficesData || reportingOfficesData.length === 0) {
        console.log('OfficeService: No offices report to user office, showing user office only');
      }

      // Remove duplicates and sort
      const uniqueOfficeList = Array.from(new Set(officeList)).sort();

      // Cache the user-specific result
      this.userSpecificCache.set(cacheKey, uniqueOfficeList);
      this.userCacheTimestamps.set(cacheKey, new Date());

      console.log('OfficeService: Successfully returned', uniqueOfficeList.length, 'hierarchical office names:', uniqueOfficeList);
      return uniqueOfficeList;

    } catch (error) {
      console.error('OfficeService: Error fetching hierarchical office names:', error);

      // Fallback to cached user-specific data if available
      const userOfficeData = await this.getCurrentUserOfficeData();
      const userOfficeName = userOfficeData.officeName;
      if (userOfficeName && this.userSpecificCache.has(userOfficeName)) {
        console.log('OfficeService: Returning expired cached office names due to error');
        return this.userSpecificCache.get(userOfficeName)!;
      }

      // Final fallback to user office only if we can get it
      if (userOfficeName && userOfficeName.trim()) {
        console.log('OfficeService: Returning user office as final fallback');
        return [userOfficeName];
      }

      // Ultimate fallback to empty array
      console.log('OfficeService: Returning empty array due to error');
      return [];
    }
  }

  /**
   * Gets the current user's office data from Firebase
   * Returns both officeName and reportingOfficeName if available
   */
  private static async getCurrentUserOfficeData(): Promise<{officeName: string | null, reportingOfficeName: string | null}> {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('OfficeService: No user logged in');
        return { officeName: null, reportingOfficeName: null };
      }

      const userDoc = await getDoc(doc(db, 'employees', user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const officeName = userData?.officeName || null;
        const reportingOfficeName = userData?.reportingOfficeName || null;

        console.log('OfficeService: User office:', officeName);
        console.log('OfficeService: User reporting office:', reportingOfficeName);

        return { officeName, reportingOfficeName };
      } else {
        console.log('OfficeService: User document not found');
        return { officeName: null, reportingOfficeName: null };
      }
    } catch (error) {
      console.error('OfficeService: Error getting user office data:', error);
      return { officeName: null, reportingOfficeName: null };
    }
  }

  /**
   * Determines reporting office from organizational hierarchy
   * For now, returns null - can be enhanced with actual hierarchy logic
   */
  private static async getReportingOfficeFromHierarchy(userOfficeName: string): Promise<string | null> {
    try {
      // This is a placeholder for hierarchy-based reporting office determination
      // You can implement actual logic here based on your organizational structure

      // For example, you might:
      // 1. Query Supabase to find the user's office details
      // 2. Determine the regional or divisional head office
      // 3. Return that as the reporting office

      console.log('OfficeService: Hierarchy-based reporting office lookup not implemented yet');
      return null;

      // Example implementation (commented out):
      /*
      const { data: userOfficeData, error: userOfficeError } = await supabase
        .from('offices')
        .select('*')
        .eq('Office name', userOfficeName)
        .limit(1);

      if (userOfficeError || !userOfficeData || userOfficeData.length === 0) {
        return null;
      }

      const userOffice = userOfficeData[0] as any;
      const userRegion = userOffice.Region;
      const userDivision = userOffice.Division;

      // Find the divisional head office or regional office
      const { data: reportingOfficeData, error: reportingOfficeError } = await supabase
        .from('offices')
        .select('*')
        .eq('Region', userRegion)
        .eq('Division', userDivision)
        .ilike('Office name', '%Head Office%') // Example logic
        .limit(1);

      if (reportingOfficeError || !reportingOfficeData || reportingOfficeData.length === 0) {
        return null;
      }

      return (reportingOfficeData[0] as any)['Office name'] || null;
      */
    } catch (error) {
      console.error('OfficeService: Error determining hierarchy reporting office:', error);
      return null;
    }
  }

  /**
   * Comprehensive office fetching with multiple approaches (mirrors Flutter implementation)
   * Returns detailed result with approach used and statistics
   */
  private static async fetchAllOfficesWithPagination(): Promise<{
    success: boolean;
    data: any[];
    totalRecords: number;
    approach: string;
    error?: string;
  }> {
    console.log('🏢 OfficeService: Starting comprehensive office fetching...');

    try {
      // Approach 1: Pagination with .range() method
      console.log('🔍 OfficeService: Approach 1 - Pagination with .range()');
      const paginatedResult = await this.fetchWithPagination();
      console.log(`📊 OfficeService: Approach 1 returned ${paginatedResult.length} records`);

      // Approach 2: High range method
      console.log('🔍 OfficeService: Approach 2 - High range method');
      const highRangeResult = await this.fetchWithHighRange();
      console.log(`📊 OfficeService: Approach 2 returned ${highRangeResult.length} records`);

      // Approach 3: No ordering, app-side sorting
      console.log('🔍 OfficeService: Approach 3 - No ordering, app-side sorting');
      const noOrderResult = await this.fetchWithoutOrdering();
      console.log(`📊 OfficeService: Approach 3 returned ${noOrderResult.length} records`);

      // Approach 4: Multiple smaller batch queries
      console.log('🔍 OfficeService: Approach 4 - Multiple batch queries');
      const batchedResult = await this.fetchWithBatching();
      console.log(`📊 OfficeService: Approach 4 returned ${batchedResult.length} records`);

      // Approach 5: Simple fallback query
      console.log('🔍 OfficeService: Approach 5 - Simple fallback query');
      const fallbackResult = await this.fetchSimpleFallback();
      console.log(`📊 OfficeService: Approach 5 returned ${fallbackResult.length} records`);

      // Select the approach with the most records
      const approaches = [
        { name: 'pagination', data: paginatedResult },
        { name: 'high-range', data: highRangeResult },
        { name: 'no-ordering', data: noOrderResult },
        { name: 'batched', data: batchedResult },
        { name: 'fallback', data: fallbackResult }
      ];

      const bestApproach = approaches.reduce((best, current) =>
        current.data.length > best.data.length ? current : best
      );

      console.log(`🎯 OfficeService: Best approach: ${bestApproach.name} with ${bestApproach.data.length} records`);

      return {
        success: true,
        data: bestApproach.data,
        totalRecords: bestApproach.data.length,
        approach: bestApproach.name
      };

    } catch (error) {
      console.error('❌ OfficeService: Error in comprehensive fetching:', error);
      return {
        success: false,
        data: [],
        totalRecords: 0,
        approach: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Approach 1: Pagination with .range() method
   */
  private static async fetchWithPagination(): Promise<any[]> {
    const allRecords: any[] = [];
    const batchSize = 1000;
    let start = 0;

    try {
      while (true) {
        console.log(`📄 OfficeService: Fetching batch ${start}-${start + batchSize - 1}`);

        const { data, error } = await supabase
          .from('offices')
          .select('*')
          .range(start, start + batchSize - 1)
          .order('"Office name"', { ascending: true });

        if (error) throw error;

        console.log(`📄 OfficeService: Batch returned ${data?.length || 0} records`);

        if (!data || data.length === 0) {
          console.log('📄 OfficeService: No more records, pagination complete');
          break;
        }

        allRecords.push(...data);

        // If we got fewer records than requested, we've reached the end
        if (data.length < batchSize) {
          console.log(`📄 OfficeService: Last batch (${data.length} < ${batchSize}), pagination complete`);
          break;
        }

        start += batchSize;

        // Safety check to prevent infinite loops
        if (start > 100000) {
          console.log('📄 OfficeService: Safety limit reached, stopping pagination');
          break;
        }
      }

      console.log(`✅ OfficeService: Pagination complete - Total records: ${allRecords.length}`);
      return allRecords;
    } catch (error) {
      console.error('❌ OfficeService: Error in pagination:', error);
      return allRecords; // Return what we have so far
    }
  }

  /**
   * Approach 2: High range method
   */
  private static async fetchWithHighRange(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('offices')
        .select('*')
        .range(0, 49999) // Fetch up to 50,000 records
        .order('"Office name"', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ OfficeService: Error in high range method:', error);
      return [];
    }
  }

  /**
   * Approach 3: No ordering, app-side sorting
   */
  private static async fetchWithoutOrdering(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('offices')
        .select('*')
        .range(0, 49999); // No ordering to avoid potential limits

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ OfficeService: Error in no ordering method:', error);
      return [];
    }
  }

  /**
   * Approach 4: Multiple smaller batch queries
   */
  private static async fetchWithBatching(): Promise<any[]> {
    const allRecords: any[] = [];
    const batchSize = 500; // Smaller batches
    const maxBatches = 20; // Limit number of batches for safety

    try {
      for (let i = 0; i < maxBatches; i++) {
        const start = i * batchSize;
        const end = start + batchSize - 1;

        console.log(`🔄 OfficeService: Batch ${i} - fetching records ${start} to ${end}`);

        const { data, error } = await supabase
          .from('offices')
          .select('*')
          .range(start, end);

        if (error) throw error;

        console.log(`🔄 OfficeService: Batch ${i} returned ${data?.length || 0} records`);

        if (!data || data.length === 0) {
          console.log('🔄 OfficeService: Empty batch, stopping');
          break;
        }

        allRecords.push(...data);

        // If we got fewer records than requested, we've reached the end
        if (data.length < batchSize) {
          console.log('🔄 OfficeService: Partial batch, reached end of data');
          break;
        }
      }

      console.log(`✅ OfficeService: Batching complete - Total records: ${allRecords.length}`);
      return allRecords;
    } catch (error) {
      console.error('❌ OfficeService: Error in batching:', error);
      return allRecords; // Return what we have so far
    }
  }

  /**
   * Approach 5: Simple fallback query
   */
  private static async fetchSimpleFallback(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('offices')
        .select('"Office name", Region, Division, "Facility ID", "Reporting Office Nam"'); // Only select needed columns

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ OfficeService: Error in simple fallback:', error);
      return [];
    }
  }

  /**
   * Log comprehensive statistics about the fetched offices
   */
  private static logOfficeStatistics(offices: string[]): void {
    console.log('📊 OfficeService: === OFFICE STATISTICS ===');
    console.log(`📊 OfficeService: Total offices: ${offices.length}`);

    if (offices.length > 0) {
      // Alphabetical range
      const sortedNames = [...offices].sort();
      console.log(`📊 OfficeService: Alphabetical range - First: "${sortedNames[0]}"`);
      console.log(`📊 OfficeService: Alphabetical range - Last: "${sortedNames[sortedNames.length - 1]}"`);

      // Letter distribution
      const letterCounts: { [key: string]: number } = {};
      offices.forEach(office => {
        const firstLetter = office.charAt(0).toUpperCase();
        letterCounts[firstLetter] = (letterCounts[firstLetter] || 0) + 1;
      });

      console.log('📊 OfficeService: Letter distribution:');
      Object.keys(letterCounts).sort().forEach(letter => {
        console.log(`📊 OfficeService: ${letter}: ${letterCounts[letter]} offices`);
      });

      // Check for specific offices
      const tirupurDivision = offices.find(o => o.toLowerCase().includes('tirupur division'));
      const coimbatoreDivision = offices.find(o => o.toLowerCase().includes('coimbatore division'));

      console.log(`📊 OfficeService: Contains "Tirupur division": ${!!tirupurDivision}`);
      console.log(`📊 OfficeService: Contains "Coimbatore division": ${!!coimbatoreDivision}`);

      if (tirupurDivision) {
        console.log(`📊 OfficeService: Found Tirupur division: "${tirupurDivision}"`);
      }
      if (coimbatoreDivision) {
        console.log(`📊 OfficeService: Found Coimbatore division: "${coimbatoreDivision}"`);
      }
    }

    console.log('📊 OfficeService: === END STATISTICS ===');
  }

  /**
   * Fetches all office data (including region and division)
   * Useful for more complex filtering scenarios
   */
  static async fetchAllOfficeData(): Promise<OfficeData[]> {
    try {
      console.log('🏢 OfficeService: Fetching all office data with comprehensive pagination...');

      // Use comprehensive pagination to get ALL records
      const result = await this.fetchAllOfficesWithPagination();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch offices');
      }

      // Filter out invalid entries and map to OfficeData format
      const validOffices: OfficeData[] = result.data
        .filter(office => office['Office name'] && typeof office['Office name'] === 'string')
        .map(office => ({
          'Office name': office['Office name'].trim(),
          Region: office.Region || undefined,
          Division: office.Division || undefined,
        }));

      console.log(`✅ OfficeService: Successfully fetched ${validOffices.length} office records using ${result.approach} approach`);
      return validOffices;

    } catch (error) {
      console.error('❌ OfficeService: Error fetching office data:', error);
      throw error;
    }
  }

  /**
   * Converts office names to FormFieldOption format for dropdowns
   */
  static officeNamesToOptions(officeNames: string[]): Array<{label: string, value: string}> {
    return officeNames.map(name => ({
      label: name,
      value: name
    }));
  }

  /**
   * Checks if a user has access to a form based on office targeting
   * @param userOfficeName - The user's office name
   * @param formOfficeTargeting - Array of office names that can access the form
   * @returns true if user has access, false otherwise
   */
  static checkFormAccess(userOfficeName: string | null, formOfficeTargeting: string[] | null): boolean {
    try {
      // If user has no office assigned, deny access
      if (!userOfficeName || userOfficeName.trim() === '') {
        console.log('OfficeService: User has no office assigned, denying access');
        return false;
      }

      // If form has no office restrictions, allow access to everyone
      if (!formOfficeTargeting || formOfficeTargeting.length === 0) {
        console.log('OfficeService: Form has no office restrictions, allowing access');
        return true;
      }

      // Check if user's office is in the form's target offices (case-insensitive)
      const userOfficeNormalized = userOfficeName.trim().toLowerCase();
      const hasAccess = formOfficeTargeting.some(targetOffice =>
        targetOffice && targetOffice.trim().toLowerCase() === userOfficeNormalized
      );

      console.log(`OfficeService: User office "${userOfficeName}" ${hasAccess ? 'HAS' : 'DOES NOT HAVE'} access to form with targeting:`, formOfficeTargeting);
      return hasAccess;

    } catch (error) {
      console.error('OfficeService: Error checking form access:', error);
      // On error, deny access for security
      return false;
    }
  }

  /**
   * Filters forms based on user's office access
   * @param forms - Array of form configurations
   * @param userOfficeName - The user's office name
   * @returns Filtered array of forms the user can access
   */
  static filterFormsByOfficeAccess<T extends { selectedOffices?: string[] }>(
    forms: T[],
    userOfficeName: string | null
  ): T[] {
    try {
      console.log(`OfficeService: Filtering ${forms.length} forms for user office: "${userOfficeName}"`);

      const filteredForms = forms.filter(form =>
        this.checkFormAccess(userOfficeName, form.selectedOffices || null)
      );

      console.log(`OfficeService: User has access to ${filteredForms.length} out of ${forms.length} forms`);
      return filteredForms;

    } catch (error) {
      console.error('OfficeService: Error filtering forms by office access:', error);
      // On error, return empty array for security
      return [];
    }
  }
}

export default OfficeService;
