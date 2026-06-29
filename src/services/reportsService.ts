import { supabase } from '../config/supabaseClient';
import { db } from '../config/firebaseClient';
import { collection, getDocs, query as firestoreQuery, where, orderBy, limit, QueryConstraint, QuerySnapshot, DocumentData, Timestamp } from 'firebase/firestore';

export interface FormSubmission {
  id: string;
  form_identifier: string;
  user_id: string | null;
  employee_id?: string | null; // New field for employee ID
  submission_data: Record<string, any>;
  submitted_at: string;
  created_at?: string;
}

export interface ReportsFilter {
  formIdentifier?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  officeName?: string;
  limit?: number;
  offset?: number;
}

export interface ReportsSummary {
  totalSubmissions: number;
  uniqueForms: number;
  uniqueUsers: number;
  submissionsToday: number;
  submissionsThisWeek: number;
  submissionsThisMonth: number;
}

export interface FormSubmissionWithUserData extends FormSubmission {
  user_name?: string;
  user_email?: string;
  user_office?: string;
}

class ReportsService {
  private static readonly CACHE_EXPIRY_MINUTES = 5;
  private static cache = new Map<string, { data: any; timestamp: Date }>();
  private static useFirebase = true; // Default to Firebase now that the app migrated
  private static firebaseInitialized = false;

  /**
   * Converts a Firestore Timestamp, Date, or string to an ISO string.
   */
  private static toISOString(value: any): string {
    if (!value) return new Date().toISOString();
    if (value instanceof Timestamp) return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    return new Date().toISOString();
  }

  /**
   * Extracts the most likely office name from submission data by searching
   * all fields for office-like values.
   */
  private static extractOfficeFromSubmissionData(submissionData: any): string | null {
    if (!submissionData || typeof submissionData !== 'object') return null;

    const officeKeyPatterns = [
      'officeName', 'office_name', 'office', 'Office', 'OFFICE',
      'selectedOffice', 'selected_office', 'assignedOffice', 'assigned_office',
      'userOffice', 'user_office'
    ];

    for (const key of officeKeyPatterns) {
      if (submissionData[key] && typeof submissionData[key] === 'string') {
        const value = submissionData[key].trim();
        if (value) return value;
      }
    }

    for (const [key, value] of Object.entries(submissionData)) {
      if (typeof value === 'string' && value.trim()) {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('office') || lowerKey.includes('branch') ||
            lowerKey.includes('division') || lowerKey.includes('department')) {
          return value.trim();
        }
      }
    }

    for (const value of Object.values(submissionData)) {
      if (typeof value === 'string' && value.trim()) {
        const lowerValue = value.toLowerCase();
        if (lowerValue.includes(' so') || lowerValue.includes(' bo') ||
            lowerValue.includes(' ro') || lowerValue.includes(' ho') ||
            lowerValue.includes('office') || lowerValue.includes('branch')) {
          return value.trim();
        }
      }
    }

    return null;
  }

  /**
   * Initialize Firebase fallback if Supabase fails
   */
  private static async initializeFirebaseIfNeeded(): Promise<void> {
    if (!this.firebaseInitialized) {
      try {
        // Test if we have access to Supabase first
        await this.testSupabaseAccess();
        this.useFirebase = false;
        console.log('✅ ReportsService: Using Supabase for reports');
      } catch (err) {
        console.log('⚠️ ReportsService: Supabase not available, switching to Firebase fallback');
        this.useFirebase = true;
        console.log('✅ ReportsService: Using Firebase for reports');
      }
      this.firebaseInitialized = true;
    }
  }

  /**
   * Test if Supabase is accessible
   */
  private static async testSupabaseAccess(): Promise<void> {
    const tablesToTry = ['reports_data_view', 'dynamic_form_submissions', 'reports_test_data'];

    for (const tableName of tablesToTry) {
      try {
        const result = await supabase
          .from(tableName)
          .select('count', { count: 'exact', head: true });

        if (!result.error && result.count !== null) {
          return; // Supabase is working
        }
      } catch (err) {
        // Continue to next table
      }
    }

    throw new Error('No Supabase tables accessible');
  }

  /**
   * Fetches form submissions with optional filtering
   */
  static async getFormSubmissions(filters: ReportsFilter = {}): Promise<FormSubmissionWithUserData[]> {
    try {
      await this.initializeFirebaseIfNeeded();

      if (this.useFirebase) {
        return this.getFormSubmissionsFromFirebase(filters);
      } else {
        return this.getFormSubmissionsFromSupabase(filters);
      }
    } catch (error) {
      console.error('❌ ReportsService: Error fetching submissions:', error);
      // Return empty array instead of throwing error
      return [];
    }
  }

  /**
   * Fetches form submissions from Supabase
   */
  private static async getFormSubmissionsFromSupabase(filters: ReportsFilter = {}): Promise<FormSubmissionWithUserData[]> {
    try {
      console.log('🔍 ReportsService: Starting getFormSubmissions from Supabase...');

      let workingTable = null;
      const tablesToTry = [
        'reports_data_view',      // Unified view (preferred)
        'dynamic_form_submissions', // Original table
        'reports_test_data'       // Test table fallback
      ];

      for (const tableName of tablesToTry) {
        console.log(`🧪 ReportsService: Trying table: ${tableName}`);
        try {
          const result = await supabase
            .from(tableName)
            .select('count', { count: 'exact', head: true });

          if (!result.error && result.count !== null) {
            workingTable = tableName;
            console.log(`✅ ReportsService: ${tableName} works with ${result.count} records`);
            break;
          }
        } catch (err) {
          console.log(`❌ ReportsService: ${tableName} error:`, err);
        }
      }

      if (!workingTable) {
        throw new Error('No accessible Supabase data source');
      }

      let query = supabase
        .from(workingTable)
        .select('*')
        .order('submitted_at', { ascending: false });

      // Apply filters
      if (filters.formIdentifier) {
        console.log('🔍 ReportsService: Applying form identifier filter:', filters.formIdentifier);
        query = query.eq('form_identifier', filters.formIdentifier);
      }

      if (filters.userId) {
        console.log('🔍 ReportsService: Applying user ID filter:', filters.userId);
        query = query.eq('user_id', filters.userId);
      }

      if (filters.startDate) {
        console.log('🔍 ReportsService: Applying start date filter:', filters.startDate);
        query = query.gte('submitted_at', filters.startDate);
      }

      if (filters.endDate) {
        console.log('🔍 ReportsService: Applying end date filter:', filters.endDate);
        query = query.lte('submitted_at', filters.endDate);
      }

      if (filters.limit) {
        console.log('🔍 ReportsService: Applying limit:', filters.limit);
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        console.log('🔍 ReportsService: Applying offset:', filters.offset);
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;

      console.log('📦 ReportsService: Query response:', {
        dataLength: data?.length || 0,
        hasError: !!error,
        errorMessage: error?.message
      });

      if (error) {
        console.error('❌ ReportsService: Query error:', error);
        console.error('🔍 ReportsService: Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Failed to fetch form submissions: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ ReportsService: No data returned from query');
        console.log('🔍 ReportsService: Possible causes:');
        console.log('  1. Table exists but has no data matching filters');
        console.log('  2. All data filtered out by applied filters');
        console.log('  3. RLS (Row Level Security) blocking access');
        console.log('  4. Data exists but query conditions exclude it');

        // Try a simple count query to see if data exists at all
        const { count, error: countError } = await supabase
          .from('dynamic_form_submissions')
          .select('*', { count: 'exact', head: true });

        console.log('📊 ReportsService: Total records in table:', count);
        if (countError) {
          console.error('❌ ReportsService: Count query error:', countError);
        }

        return [];
      }

      console.log('✅ ReportsService: Successfully fetched', data.length, 'submissions');
      console.log('📄 ReportsService: First submission sample:', JSON.stringify(data[0], null, 2));
      console.log('📋 ReportsService: All form identifiers:', data.map(d => d.form_identifier));

      // Use employee_id directly instead of enhancing with user data
      console.log('📋 ReportsService: Using employee_id values directly from database');
      const enhancedData = (data || []).map((submission: any) => ({
        ...submission,
        user_name: submission.employee_id || 'Unknown',
        user_email: 'user@example.com',
        user_office: submission.submission_data?.officeName || 'Unknown Office'
      }));

      // Apply office filter if specified (after user data enhancement)
      if (filters.officeName) {
        console.log('🔍 ReportsService: Applying office name filter:', filters.officeName);
        console.log('🔍 ReportsService: Looking for office name in submission_data...');

        const filteredData = enhancedData.filter(submission => {
          // Check multiple possible locations for office name
          const submissionDataOffice = submission.submission_data?.officeName;
          const userOffice = submission.user_office;

          // Look through all submission_data fields for office names
          let foundOffice = null;
          if (submission.submission_data) {
            for (const [key, value] of Object.entries(submission.submission_data)) {
              if (typeof value === 'string' && (
                value.includes(' RO') || value.includes(' BO') || value.includes(' SO') ||
                value.includes(' HO') || value.includes(' DO') || value.includes('Office')
              )) {
                foundOffice = value;
                break;
              }
            }
          }

          const officeToCheck = foundOffice || submissionDataOffice || userOffice || '';
          console.log(`📋 Submission ${submission.id}: office="${officeToCheck}", filter="${filters.officeName}"`);

          return officeToCheck.toLowerCase().includes(filters.officeName!.toLowerCase());
        });

        console.log('📊 ReportsService: Office filter result:', filteredData.length, 'submissions');
        return filteredData;
      }

      console.log('🎉 ReportsService: Returning', enhancedData.length, 'enhanced submissions');
      return enhancedData;

    } catch (error) {
      console.error('💥 ReportsService: Fatal error in getFormSubmissions:', error);
      console.error('🔍 ReportsService: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  /**
   * Fetches form submissions from Firebase (primary data source)
   */
  private static async getFormSubmissionsFromFirebase(filters: ReportsFilter = {}): Promise<FormSubmissionWithUserData[]> {
    try {
      console.log('🔥 ReportsService: Fetching submissions from Firebase...');

      // The mobile app saves submissions using camelCase fields:
      // formIdentifier, userId, employeeId, submissionData, createdAt, updatedAt
      // Build Firestore query constraints. Note: ordering/filtering by createdAt may
      // require a Firestore index; if that fails, we fall back to a full scan.
      let snapshot: QuerySnapshot<DocumentData, DocumentData>;
      try {
        const constraints: QueryConstraint[] = [
          orderBy('createdAt', 'desc')
        ];

        if (filters.formIdentifier) {
          constraints.push(where('formIdentifier', '==', filters.formIdentifier));
        }

        if (filters.userId) {
          constraints.push(where('userId', '==', filters.userId));
        }

        if (filters.startDate) {
          constraints.push(where('createdAt', '>=', filters.startDate));
        }

        if (filters.endDate) {
          constraints.push(where('createdAt', '<=', filters.endDate));
        }

        if (filters.limit) {
          constraints.push(limit(filters.limit));
        }

        const q = firestoreQuery(
          collection(db, 'form_submissions'),
          ...constraints
        );

        snapshot = await getDocs(q);
      } catch (queryError) {
        console.warn('⚠️ ReportsService: Indexed query failed, falling back to full scan:', queryError);
        const q = firestoreQuery(collection(db, 'form_submissions'));
        snapshot = await getDocs(q);
      }

      const submissions = snapshot.docs.map(doc => {
        const data = doc.data();
        const submissionData = data.submissionData || data.submission_data || {};
        const submittedAt = data.createdAt || data.submitted_at || data.created_at;
        const createdAt = data.createdAt || data.created_at;
        const extractedOffice = this.extractOfficeFromSubmissionData(submissionData);

        return {
          id: doc.id,
          form_identifier: data.formIdentifier || data.form_identifier || '',
          user_id: data.userId || data.user_id || null,
          employee_id: data.employeeId || data.employee_id || null,
          submission_data: submissionData,
          submitted_at: this.toISOString(submittedAt),
          created_at: this.toISOString(createdAt),
          user_name: data.employeeId || data.employee_id || data.userName || data.user_name || 'Unknown',
          user_email: data.userEmail || data.user_email || 'user@example.com',
          user_office: data.userOffice || data.user_office || extractedOffice || 'Unknown Office'
        };
      });

      console.log(`✅ ReportsService: Fetched ${submissions.length} submissions from Firebase`);

      // Apply client-side filters for safety (and fallback mode)
      let filteredSubmissions = submissions;

      if (filters.formIdentifier) {
        filteredSubmissions = filteredSubmissions.filter(
          s => s.form_identifier === filters.formIdentifier
        );
      }

      if (filters.userId) {
        filteredSubmissions = filteredSubmissions.filter(
          s => s.user_id === filters.userId
        );
      }

      if (filters.startDate) {
        filteredSubmissions = filteredSubmissions.filter(
          s => s.submitted_at >= filters.startDate!
        );
      }

      if (filters.endDate) {
        filteredSubmissions = filteredSubmissions.filter(
          s => s.submitted_at <= filters.endDate!
        );
      }

      if (filters.officeName) {
        const filterName = filters.officeName!.toLowerCase().trim();
        filteredSubmissions = filteredSubmissions.filter(submission => {
          // Primary: check mapped user_office
          const userOffice = submission.user_office?.toLowerCase().trim() || '';
          if (userOffice.includes(filterName)) return true;

          // Fallback: search all submissionData values for the office name
          if (submission.submission_data) {
            for (const [key, value] of Object.entries(submission.submission_data)) {
              if (typeof value === 'string') {
                const stringValue = value.toLowerCase().trim();
                if (stringValue.includes(filterName)) return true;
              }
            }
          }

          return false;
        });
      }

      if (filters.limit) {
        filteredSubmissions = filteredSubmissions.slice(0, filters.limit);
      }

      return filteredSubmissions;
    } catch (error) {
      console.error('❌ ReportsService: Error fetching from Firebase:', error);
      return [];
    }
  }

  /**
   * Gets summary statistics for reports dashboard
   */
  static async getReportsSummary(): Promise<ReportsSummary> {
    try {
      await this.initializeFirebaseIfNeeded();

      console.log('ReportsService: Fetching reports summary...');

      // Check cache first
      const cacheKey = 'reports_summary';
      const cached = this.cache.get(cacheKey);
      if (cached && this.isCacheValid(cached.timestamp)) {
        console.log('ReportsService: Returning cached summary');
        return cached.data;
      }

      if (this.useFirebase) {
        return this.getReportsSummaryFromFirebase();
      } else {
        return this.getReportsSummaryFromSupabase();
      }
    } catch (error) {
      console.error('❌ ReportsService: Error fetching summary:', error);
      return {
        totalSubmissions: 0,
        uniqueForms: 0,
        uniqueUsers: 0,
        submissionsToday: 0,
        submissionsThisWeek: 0,
        submissionsThisMonth: 0
      };
    }
  }

  /**
   * Gets summary statistics from Supabase
   */
  private static async getReportsSummaryFromSupabase(): Promise<ReportsSummary> {
    try {
      // Check cache first
      const cacheKey = 'reportsSummary';
      const cachedData = this.cache.get(cacheKey);

      if (cachedData) {
        const cacheAgeMinutes = (new Date().getTime() - cachedData.timestamp.getTime()) / (1000 * 60);
        if (cacheAgeMinutes < this.CACHE_EXPIRY_MINUTES) {
          console.log('📊 ReportsService: Returning cached summary');
          return cachedData.data;
        }
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Find working data source
      const workingTable = await this.findWorkingDataSource();

      // Get total submissions
      const { count: totalSubmissions, error: totalError } = await supabase
        .from(workingTable)
        .select('*', { count: 'exact', head: true });

      if (totalError) {
        console.error('ReportsService: Error getting total count:', totalError);
        throw totalError;
      }

      console.log('ReportsService: Total submissions count:', totalSubmissions);

      // Get unique forms
      const { data: formsData, error: formsError } = await supabase
        .from(workingTable)
        .select('form_identifier');

      if (formsError) {
        console.error('ReportsService: Error getting forms:', formsError);
        throw formsError;
      }

      const uniqueForms = new Set(formsData?.map((item: any) => item.form_identifier)).size;
      console.log('ReportsService: Unique forms count:', uniqueForms);

      // Get unique users
      const { data: usersData, error: usersError } = await supabase
        .from(workingTable)
        .select('user_id');

      if (usersError) {
        console.error('ReportsService: Error getting users:', usersError);
        throw usersError;
      }

      const uniqueUsers = new Set(usersData?.map((item: any) => item.user_id)).size;
      console.log('ReportsService: Unique users count:', uniqueUsers);

      // Get submissions today
      const { count: submissionsToday, error: todayError } = await supabase
        .from(workingTable)
        .select('*', { count: 'exact', head: true })
        .gte('submitted_at', today);

      if (todayError) {
        console.error('ReportsService: Error getting today count:', todayError);
        throw todayError;
      }

      // Get submissions this week
      const { count: submissionsThisWeek, error: weekError } = await supabase
        .from(workingTable)
        .select('*', { count: 'exact', head: true })
        .gte('submitted_at', weekAgo);

      if (weekError) {
        console.error('ReportsService: Error getting week count:', weekError);
        throw weekError;
      }

      // Get submissions this month
      const { count: submissionsThisMonth, error: monthError } = await supabase
        .from(workingTable)
        .select('*', { count: 'exact', head: true })
        .gte('submitted_at', monthAgo);

      if (monthError) {
        console.error('ReportsService: Error getting month count:', monthError);
        throw monthError;
      }

      const summary: ReportsSummary = {
        totalSubmissions: totalSubmissions || 0,
        uniqueForms,
        uniqueUsers,
        submissionsToday: submissionsToday || 0,
        submissionsThisWeek: submissionsThisWeek || 0,
        submissionsThisMonth: submissionsThisMonth || 0,
      };

      // Cache the result
      this.cache.set(cacheKey, { data: summary, timestamp: new Date() });

      console.log('ReportsService: Successfully generated summary:', summary);
      return summary;

    } catch (error) {
      console.error('ReportsService: Error in getReportsSummaryFromSupabase:', error);
      throw error;
    }
  }

  /**
   * Gets summary statistics from Firebase (fallback)
   */
  private static async getReportsSummaryFromFirebase(): Promise<ReportsSummary> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Fetch all submissions from Firebase
      const allSubmissions = await this.getFormSubmissionsFromFirebase();

      const totalSubmissions = allSubmissions.length;
      const uniqueForms = new Set(allSubmissions.map(s => s.form_identifier)).size;
      const uniqueUsers = new Set(allSubmissions.map(s => s.user_id)).size;
      const submissionsToday = allSubmissions.filter(s => s.submitted_at >= today).length;
      const submissionsThisWeek = allSubmissions.filter(s => s.submitted_at >= weekAgo).length;
      const submissionsThisMonth = allSubmissions.filter(s => s.submitted_at >= monthAgo).length;

      const summary: ReportsSummary = {
        totalSubmissions,
        uniqueForms,
        uniqueUsers,
        submissionsToday,
        submissionsThisWeek,
        submissionsThisMonth
      };

      console.log('✅ ReportsService: Firebase summary generated:', summary);
      return summary;
    } catch (error) {
      console.error('❌ ReportsService: Error generating Firebase summary:', error);
      throw error;
    }
  }

  /**
   * Gets list of unique form identifiers
   */
  static async getFormIdentifiers(): Promise<string[]> {
    try {
      await this.initializeFirebaseIfNeeded();

      console.log('ReportsService: Fetching form identifiers...');

      if (this.useFirebase) {
        const submissions = await this.getFormSubmissionsFromFirebase();
        const uniqueIdentifiers = Array.from(
          new Set(submissions.map(s => s.form_identifier))
        ).sort();
        return uniqueIdentifiers;
      } else {
        const workingTable = await this.findWorkingDataSource();

        const { data, error } = await supabase
          .from(workingTable)
          .select('form_identifier');

        if (error) {
          console.error('ReportsService: Error fetching form identifiers:', error);
          throw error;
        }

        const uniqueIdentifiers = Array.from(
          new Set(data?.map((item: any) => item.form_identifier as string) || [])
        ).sort() as string[];

        console.log('ReportsService: Found', uniqueIdentifiers.length, 'unique form identifiers:', uniqueIdentifiers);
        return uniqueIdentifiers;
      }

    } catch (error) {
      console.error('ReportsService: Error fetching form identifiers:', error);
      return [];
    }
  }

  /**
   * Enhances submission data with user information from user_profile table
   */
  private static async enhanceWithUserData(submissions: any[]): Promise<FormSubmissionWithUserData[]> {
    try {
      console.log('🔍 ReportsService: Enhancing submissions with user profile data...');

      // Get all unique employee IDs from submissions
      const employeeIds = submissions
        .map(s => s.employee_id)
        .filter(id => id && typeof id === 'string' && id.trim().length > 0);

      console.log('🔍 ReportsService: Found employee IDs to lookup:', employeeIds);

      // Fetch user profiles for these employee IDs
      let userProfiles: any[] = [];
      if (employeeIds.length > 0) {
        const { data: profiles, error } = await supabase
          .from('user_profile')
          .select('employeeId, full_name, email, office_name, designation, department')
          .in('employeeId', employeeIds);

        if (error) {
          console.error('❌ ReportsService: Error fetching user profiles:', error);
        } else {
          userProfiles = profiles || [];
          console.log('✅ ReportsService: Fetched user profiles:', userProfiles);
        }
      }

      // Create a map for quick lookup
      const profileMap = new Map();
      userProfiles.forEach(profile => {
        profileMap.set(profile.employeeId, profile);
      });

      return submissions.map(submission => {
        // Look up user profile by employee_id
        const userProfile = submission.employee_id ? profileMap.get(submission.employee_id) : null;

        console.log(`🔍 User profile for submission ${submission.id} (employee_id: ${submission.employee_id}):`, userProfile);

        // Use user_profile data if available, otherwise fall back to employee_id or defaults
        const enhancedSubmission: FormSubmissionWithUserData = {
          ...submission,
          user_name: userProfile?.full_name ||
                    submission.employee_id ||
                    (submission.user_id ? `User ${submission.user_id.substring(0, 8)}` : 'Unknown User'),
          user_email: userProfile?.email || 'user@example.com',
          user_office: userProfile?.office_name ||
                      submission.submission_data?.officeName ||
                      'Unknown Office'
        };

        console.log(`✅ Enhanced submission ${submission.id}:`, {
          user_name: enhancedSubmission.user_name,
          user_email: enhancedSubmission.user_email,
          user_office: enhancedSubmission.user_office,
          employee_id: submission.employee_id
        });

        return enhancedSubmission;
      });

    } catch (error) {
      console.error('ReportsService: Error enhancing with user data:', error);
      return submissions.map(submission => ({
        ...submission,
        user_name: submission.employee_id || 'Unknown User',
        user_email: 'user@example.com',
        user_office: 'Unknown Office'
      }));
    }
  }

  /**
   * Exports submissions to CSV format
   */
  static async exportToCSV(filters: ReportsFilter = {}): Promise<string> {
    try {
      const submissions = await this.getFormSubmissions(filters);
      
      if (submissions.length === 0) {
        throw new Error('No data to export');
      }

      // Create CSV headers
      const headers = [
        'ID',
        'Form Identifier',
        'User ID',
        'User Name',
        'User Office',
        'Submitted At',
        'Submission Data'
      ];

      // Create CSV rows
      const rows = submissions.map(submission => [
        submission.id,
        submission.form_identifier,
        submission.user_id,
        submission.user_name || '',
        submission.user_office || '',
        new Date(submission.submitted_at).toLocaleString(),
        JSON.stringify(submission.submission_data)
      ]);

      // Combine headers and rows
      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      console.log('ReportsService: Successfully generated CSV with', submissions.length, 'records');
      return csvContent;

    } catch (error) {
      console.error('ReportsService: Error exporting to CSV:', error);
      throw error;
    }
  }

  /**
   * Finds a working data source from available options
   */
  private static async findWorkingDataSource(): Promise<string> {
    const tablesToTry = [
      'reports_data_view',      // Unified view (preferred)
      'dynamic_form_submissions', // Original table
      'reports_test_data'       // Test table fallback
    ];

    for (const tableName of tablesToTry) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (!error && count !== null) {
          console.log(`✅ ReportsService: Using ${tableName} with ${count} records`);
          return tableName;
        }
      } catch (err) {
        console.log(`❌ ReportsService: ${tableName} not accessible`);
      }
    }

    throw new Error('No accessible data source found. Please run the DIRECT_QUERY_APPROACH.sql script.');
  }

  /**
   * Clears the cache
   */
  static clearCache(): void {
    this.cache.clear();
    console.log('ReportsService: Cache cleared');
  }

  /**
   * Checks if cached data is still valid
   */
  private static isCacheValid(timestamp: Date): boolean {
    const now = new Date();
    const diffMinutes = (now.getTime() - timestamp.getTime()) / (1000 * 60);
    return diffMinutes < this.CACHE_EXPIRY_MINUTES;
  }
}

export default ReportsService;
