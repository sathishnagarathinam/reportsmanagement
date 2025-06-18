import { supabase } from '../config/supabaseClient';

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

  /**
   * Fetches form submissions with optional filtering
   */
  static async getFormSubmissions(filters: ReportsFilter = {}): Promise<FormSubmissionWithUserData[]> {
    try {
      console.log('🔍 ReportsService: Starting getFormSubmissions...');
      console.log('📋 ReportsService: Filters:', JSON.stringify(filters, null, 2));

      // Test multiple data sources to find working one
      console.log('🔗 ReportsService: Testing multiple data sources...');

      let workingTable = null;
      let testData = null;
      let testError = null;

      // Try different tables in order of preference
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
            testData = result.count;
            console.log(`✅ ReportsService: ${tableName} works with ${result.count} records`);
            break;
          } else {
            console.log(`❌ ReportsService: ${tableName} failed:`, result.error?.message);
          }
        } catch (err) {
          console.log(`❌ ReportsService: ${tableName} error:`, err);
        }
      }

      if (!workingTable) {
        console.error('❌ ReportsService: No working data source found');
        throw new Error('No accessible data source found. Please run the DIRECT_QUERY_APPROACH.sql script.');
      }

      console.log('✅ ReportsService: Using data source:', workingTable);
      console.log('📊 ReportsService: Found', testData, 'records');

      // Now fetch the actual data from the working table with user_profile join
      console.log('📥 ReportsService: Fetching submissions data with user profile join...');

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
   * Gets summary statistics for reports dashboard
   */
  static async getReportsSummary(): Promise<ReportsSummary> {
    try {
      console.log('ReportsService: Fetching reports summary...');

      // Check cache first
      const cacheKey = 'reports_summary';
      const cached = this.cache.get(cacheKey);
      if (cached && this.isCacheValid(cached.timestamp)) {
        console.log('ReportsService: Returning cached summary');
        return cached.data;
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
      console.error('ReportsService: Error in getReportsSummary:', error);
      throw error;
    }
  }

  /**
   * Gets list of unique form identifiers
   */
  static async getFormIdentifiers(): Promise<string[]> {
    try {
      console.log('ReportsService: Fetching form identifiers...');

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

    } catch (error) {
      console.error('ReportsService: Error fetching form identifiers:', error);
      throw error;
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
