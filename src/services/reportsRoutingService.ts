import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Service to determine which type of reports screen to show based on user's office
 */
export class ReportsRoutingService {
  private static cachedUserOffice: string | null = null;
  private static cachedIsDivisionUser: boolean | null = null;
  private static cacheTimestamp: Date | null = null;
  private static readonly CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

  /**
   * Determines if the current user should see the comprehensive reports (Division users)
   * or the simple office-only reports (non-Division users)
   */
  static async shouldShowComprehensiveReports(): Promise<boolean> {
    try {
      // For debugging: always log cache status
      console.log('📋 ReportsRoutingService: shouldShowComprehensiveReports called');
      console.log('📋 ReportsRoutingService: Cache valid:', this.isCacheValid());
      console.log('📋 ReportsRoutingService: Cached isDivisionUser:', this.cachedIsDivisionUser);
      console.log('📋 ReportsRoutingService: Cached office:', this.cachedUserOffice);

      // Check cache first
      if (this.isCacheValid() && this.cachedIsDivisionUser !== null) {
        console.log('📋 ReportsRoutingService: Using cached result: isDivision=', this.cachedIsDivisionUser);
        return this.cachedIsDivisionUser;
      }

      console.log('📋 ReportsRoutingService: Cache invalid or empty, determining fresh report type...');

      const user = auth.currentUser;
      if (!user) {
        console.log('❌ ReportsRoutingService: No user logged in');
        return false;
      }

      console.log('📋 ReportsRoutingService: Current user UID:', user.uid);

      // Get user's office from Firebase
      const userDoc = await getDoc(doc(db, 'employees', user.uid));

      if (!userDoc.exists()) {
        console.log('❌ ReportsRoutingService: User document not found');
        return false;
      }

      const userData = userDoc.data();
      const officeName = userData?.officeName as string | undefined;

      if (!officeName || officeName.trim() === '') {
        console.log('❌ ReportsRoutingService: User office name not found');
        return false;
      }

      console.log('📋 ReportsRoutingService: User office:', `"${officeName}"`);

      // Check if office name ends with 'Division' (case-insensitive)
      const trimmed = officeName.trim();
      const lowercase = trimmed.toLowerCase();
      const isDivisionUser = lowercase.endsWith('division');

      console.log('📋 ReportsRoutingService: Office name:', `"${officeName}"`);
      console.log('📋 ReportsRoutingService: Trimmed:', `"${trimmed}"`);
      console.log('📋 ReportsRoutingService: Lowercase:', `"${lowercase}"`);
      console.log('📋 ReportsRoutingService: Ends with "division":', isDivisionUser);
      console.log('📋 ReportsRoutingService: Office type:', isDivisionUser ? 'DIVISION (Comprehensive Reports)' : 'OFFICE (Simple Reports)');

      // Cache the results
      this.cachedUserOffice = officeName;
      this.cachedIsDivisionUser = isDivisionUser;
      this.cacheTimestamp = new Date();

      console.log('📋 ReportsRoutingService: Cached results - Office:', this.cachedUserOffice);
      console.log('📋 ReportsRoutingService: Cached results - isDivision:', this.cachedIsDivisionUser);

      if (isDivisionUser) {
        console.log('✅ ReportsRoutingService: User is Division-level → Report Screen 1 (Comprehensive)');
      } else {
        console.log('✅ ReportsRoutingService: User is Office-level → Report Screen 2 (Table View Only)');
      }

      return isDivisionUser;

    } catch (error) {
      console.error('❌ ReportsRoutingService: Error determining report type:', error);
      return false; // Default to simple reports on error
    }
  }

  /**
   * Gets the current user's office name
   */
  static async getCurrentUserOfficeName(): Promise<string | null> {
    try {
      console.log('🔍 ReportsRoutingService: getCurrentUserOfficeName() called');

      // Use cached value if available and valid
      if (this.isCacheValid() && this.cachedUserOffice !== null) {
        console.log('📋 ReportsRoutingService: Using cached office name:', this.cachedUserOffice);
        return this.cachedUserOffice;
      }

      console.log('🔍 ReportsRoutingService: Cache invalid or empty, fetching fresh data');
      console.log('🔍 ReportsRoutingService: Cache valid:', this.isCacheValid());
      console.log('🔍 ReportsRoutingService: Cached office:', this.cachedUserOffice);

      const user = auth.currentUser;
      if (!user) {
        console.log('❌ ReportsRoutingService: No user logged in');
        return null;
      }

      console.log('🔍 ReportsRoutingService: Current user UID:', user.uid);
      console.log('🔍 ReportsRoutingService: Current user email:', user.email);

      console.log('🔍 ReportsRoutingService: Fetching user document from Firebase...');
      const userDoc = await getDoc(doc(db, 'employees', user.uid));

      if (!userDoc.exists()) {
        console.log('❌ ReportsRoutingService: User document does not exist in employees collection');
        console.log('🔍 ReportsRoutingService: Document path:', `employees/${user.uid}`);
        return null;
      }

      console.log('✅ ReportsRoutingService: User document found');
      const userData = userDoc.data();
      console.log('🔍 ReportsRoutingService: Raw user data:', userData);

      const officeName = userData?.officeName as string | undefined;
      console.log('🔍 ReportsRoutingService: Extracted officeName:', officeName);
      console.log('🔍 ReportsRoutingService: officeName type:', typeof officeName);
      console.log('🔍 ReportsRoutingService: officeName is null/undefined:', officeName == null);

      // Check all possible office-related fields
      console.log('🔍 ReportsRoutingService: All user data keys:', Object.keys(userData || {}));
      console.log('🔍 ReportsRoutingService: userData.officeName:', userData?.officeName);
      console.log('🔍 ReportsRoutingService: userData.office_name:', userData?.office_name);
      console.log('🔍 ReportsRoutingService: userData.office:', userData?.office);
      console.log('🔍 ReportsRoutingService: userData.Office:', userData?.Office);

      // Update cache
      this.cachedUserOffice = officeName || null;
      this.cacheTimestamp = new Date();

      console.log('🔍 ReportsRoutingService: Final office name result:', officeName || 'NULL');
      return officeName || null;

    } catch (error) {
      console.error('❌ ReportsRoutingService: Error getting user office:', error);
      console.error('❌ ReportsRoutingService: Error details:', error);
      return null;
    }
  }

  /**
   * Gets detailed information about the user's office type and access level
   */
  static async getUserOfficeInfo(): Promise<{
    officeName: string | null;
    isDivisionUser: boolean;
    accessLevel: string;
    reportType: string;
    description: string;
  }> {
    try {
      console.log('🔍 getUserOfficeInfo: Starting fresh analysis...');

      // Clear cache to ensure fresh data
      this.clearCache();

      const officeName = await this.getCurrentUserOfficeName();
      console.log('🔍 getUserOfficeInfo: Got office name:', officeName);

      // Use direct division logic test instead of cached shouldShowComprehensiveReports
      let isDivisionUser = false;
      if (officeName && officeName.trim() !== '') {
        isDivisionUser = officeName.trim().toLowerCase().endsWith('division');
        console.log('🔍 getUserOfficeInfo: Direct division check:', isDivisionUser);
        console.log('🔍 getUserOfficeInfo: Office trimmed lowercase:', `"${officeName.trim().toLowerCase()}"`);
        console.log('🔍 getUserOfficeInfo: Ends with "division":', isDivisionUser);
      }

      if (!officeName) {
        return {
          officeName: null,
          isDivisionUser: false,
          accessLevel: 'none',
          reportType: 'none',
          description: 'No office information available',
        };
      }

      let accessLevel: string;
      let reportType: string;
      let description: string;

      if (isDivisionUser) {
        accessLevel = 'division';
        reportType = 'comprehensive';
        description = 'Report Screen 1: Summary + Submissions + Table View tabs with multi-level office hierarchy data';
      } else {
        accessLevel = 'office';
        reportType = 'simple';
        description = 'Report Screen 2: Table View only with office-specific data';
      }

      console.log('🔍 getUserOfficeInfo: Final result:', {
        officeName,
        isDivisionUser,
        accessLevel,
        reportType
      });

      return {
        officeName,
        isDivisionUser,
        accessLevel,
        reportType,
        description,
      };

    } catch (error) {
      console.error('❌ ReportsRoutingService: Error getting office info:', error);
      return {
        officeName: null,
        isDivisionUser: false,
        accessLevel: 'error',
        reportType: 'simple',
        description: 'Error loading office information',
      };
    }
  }

  /**
   * Forces a fresh check bypassing all cache (for debugging)
   */
  static async forceRefreshDivisionStatus(): Promise<boolean> {
    console.log('🔄 ReportsRoutingService: Force refresh - bypassing all cache');

    // Clear cache completely
    this.clearCache();

    // Force fresh check
    const result = await this.shouldShowComprehensiveReports();

    console.log('🔄 ReportsRoutingService: Force refresh result:', result);
    return result;
  }

  /**
   * Clears the cache (useful for testing or when user data changes)
   */
  static clearCache(): void {
    this.cachedUserOffice = null;
    this.cachedIsDivisionUser = null;
    this.cacheTimestamp = null;
    console.log('🗑️ ReportsRoutingService: Cache cleared');
  }

  /**
   * Checks if the cached data is still valid
   */
  private static isCacheValid(): boolean {
    if (!this.cacheTimestamp) {
      return false;
    }
    
    const now = new Date();
    const difference = now.getTime() - this.cacheTimestamp.getTime();
    return difference < this.CACHE_EXPIRY;
  }

  /**
   * Gets a human-readable description of the user's report access
   */
  static async getAccessDescription(): Promise<string> {
    try {
      const officeInfo = await this.getUserOfficeInfo();

      if (!officeInfo.officeName) {
        return 'No office information available';
      }

      if (officeInfo.isDivisionUser) {
        return 'Division-level access: You can view Report Screen 1 with comprehensive reports including Summary, Submissions, and Table View tabs with multi-level office hierarchy data.';
      } else {
        return `Office-level access: You can view Report Screen 2 with Table View only containing data specific to your office (${officeInfo.officeName}).`;
      }

    } catch (error) {
      return 'Error determining access level';
    }
  }

  /**
   * Direct test of division logic without cache (for debugging)
   */
  static async testDivisionLogicDirect(): Promise<{
    officeName: string | null;
    trimmed: string | null;
    lowercase: string | null;
    endsWithDivision: boolean;
    shouldShowComprehensive: boolean;
  }> {
    try {
      console.log('🧪 === DIRECT DIVISION LOGIC TEST ===');

      // Get fresh data without cache
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ Direct test: No user logged in');
        return {
          officeName: null,
          trimmed: null,
          lowercase: null,
          endsWithDivision: false,
          shouldShowComprehensive: false,
        };
      }

      const userDoc = await getDoc(doc(db, 'employees', user.uid));
      if (!userDoc.exists()) {
        console.log('❌ Direct test: User document not found');
        return {
          officeName: null,
          trimmed: null,
          lowercase: null,
          endsWithDivision: false,
          shouldShowComprehensive: false,
        };
      }

      const userData = userDoc.data();
      const officeName = userData?.officeName as string | undefined;

      console.log('🧪 Direct test: Raw office name:', officeName);

      if (!officeName) {
        console.log('❌ Direct test: Office name is null/undefined');
        return {
          officeName: null,
          trimmed: null,
          lowercase: null,
          endsWithDivision: false,
          shouldShowComprehensive: false,
        };
      }

      const trimmed = officeName.trim();
      const lowercase = trimmed.toLowerCase();
      const endsWithDivision = lowercase.endsWith('division');

      console.log('🧪 Direct test: Original:', `"${officeName}"`);
      console.log('🧪 Direct test: Trimmed:', `"${trimmed}"`);
      console.log('🧪 Direct test: Lowercase:', `"${lowercase}"`);
      console.log('🧪 Direct test: Ends with "division":', endsWithDivision);
      console.log('🧪 Direct test: Should show comprehensive:', endsWithDivision);

      console.log('🧪 === END DIRECT DIVISION LOGIC TEST ===');

      return {
        officeName,
        trimmed,
        lowercase,
        endsWithDivision,
        shouldShowComprehensive: endsWithDivision,
      };

    } catch (error) {
      console.error('❌ Direct test: Error:', error);
      return {
        officeName: null,
        trimmed: null,
        lowercase: null,
        endsWithDivision: false,
        shouldShowComprehensive: false,
      };
    }
  }

  /**
   * Logs detailed information about the user's report access (for debugging)
   */
  static async logUserAccessInfo(): Promise<void> {
    try {
      console.log('📋 === ReportsRoutingService: User Access Information ===');

      const officeInfo = await this.getUserOfficeInfo();

      console.log('📋 Office Name:', officeInfo.officeName);
      console.log('📋 Is Division User:', officeInfo.isDivisionUser);
      console.log('📋 Access Level:', officeInfo.accessLevel);
      console.log('📋 Report Type:', officeInfo.reportType);
      console.log('📋 Description:', officeInfo.description);

      const accessDescription = await this.getAccessDescription();
      console.log('📋 Access Description:', accessDescription);

      console.log('📋 === End User Access Information ===');

    } catch (error) {
      console.error('❌ ReportsRoutingService: Error logging access info:', error);
    }
  }
}

export default ReportsRoutingService;
