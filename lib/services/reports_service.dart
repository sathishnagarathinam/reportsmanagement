import 'package:supabase_flutter/supabase_flutter.dart';

// Simple implementation without complex filtering for now
// This avoids the API compatibility issues

class FormSubmission {
  final String id;
  final String formIdentifier;
  final String userId;
  final String? employeeId; // New field for employee ID
  final Map<String, dynamic> submissionData;
  final DateTime submittedAt;
  final DateTime? createdAt;

  // Enhanced fields
  final String? userName;
  final String? userEmail;
  final String? userOffice;

  FormSubmission({
    required this.id,
    required this.formIdentifier,
    required this.userId,
    this.employeeId,
    required this.submissionData,
    required this.submittedAt,
    this.createdAt,
    this.userName,
    this.userEmail,
    this.userOffice,
  });

  factory FormSubmission.fromJson(Map<String, dynamic> json) {
    return FormSubmission(
      id: json['id'].toString(),
      formIdentifier: json['form_identifier'] ?? '',
      userId: json['user_id'] ?? '',
      employeeId: json['employee_id'], // Include employee_id from database
      submissionData: json['submission_data'] ?? {},
      submittedAt: DateTime.parse(json['submitted_at']),
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : null,
      userName: json['user_name'],
      userEmail: json['user_email'],
      userOffice: json['user_office'] ?? json['submission_data']?['officeName'],
    );
  }
}

class ReportsFilter {
  final String? formIdentifier;
  final String? userId;
  final DateTime? startDate;
  final DateTime? endDate;
  final String? officeName;
  final int? limit;
  final int? offset;

  ReportsFilter({
    this.formIdentifier,
    this.userId,
    this.startDate,
    this.endDate,
    this.officeName,
    this.limit = 50,
    this.offset = 0,
  });

  ReportsFilter copyWith({
    String? formIdentifier,
    String? userId,
    DateTime? startDate,
    DateTime? endDate,
    String? officeName,
    int? limit,
    int? offset,
  }) {
    return ReportsFilter(
      formIdentifier: formIdentifier ?? this.formIdentifier,
      userId: userId ?? this.userId,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      officeName: officeName ?? this.officeName,
      limit: limit ?? this.limit,
      offset: offset ?? this.offset,
    );
  }
}

class ReportsSummary {
  final int totalSubmissions;
  final int uniqueForms;
  final int uniqueUsers;
  final int submissionsToday;
  final int submissionsThisWeek;
  final int submissionsThisMonth;

  ReportsSummary({
    required this.totalSubmissions,
    required this.uniqueForms,
    required this.uniqueUsers,
    required this.submissionsToday,
    required this.submissionsThisWeek,
    required this.submissionsThisMonth,
  });
}

class ReportsService {
  static final SupabaseClient _supabase = Supabase.instance.client;
  static const Duration _cacheExpiry = Duration(minutes: 5);
  static final Map<String, dynamic> _cache = {};
  static final Map<String, DateTime> _cacheTimestamps = {};

  /// Fetches form submissions with optional filtering
  static Future<List<FormSubmission>> getFormSubmissions({
    ReportsFilter? filters,
  }) async {
    try {
      print('🔍 ReportsService: Starting getFormSubmissions...');
      print('📋 ReportsService: Filters: $filters');

      // Find working data source
      print('🔗 ReportsService: Finding working data source...');
      final workingTable = await _findWorkingDataSource();
      print('✅ ReportsService: Using data source: $workingTable');

      // Now fetch the actual data
      print('📥 ReportsService: Fetching submissions data...');

      final response = await _supabase
          .from(workingTable)
          .select('*')
          .order('submitted_at', ascending: false)
          .limit(filters?.limit ?? 50);

      print('📦 ReportsService: Query response:');
      print('  - Data type: ${response.runtimeType}');
      print('  - Data length: ${response.length}');
      print('  - Is empty: ${response.isEmpty}');

      if (response.isEmpty) {
        print('⚠️ ReportsService: No data returned from query');
        print('🔍 ReportsService: Possible causes:');
        print('  1. Table exists but has no data matching filters');
        print('  2. All data filtered out by applied filters');
        print('  3. RLS (Row Level Security) blocking access');
        print('  4. Data exists but query conditions exclude it');
        return [];
      }

      print(
          '✅ ReportsService: Successfully fetched ${response.length} submissions');
      print('📄 ReportsService: First submission sample: ${response.first}');

      // Log all form identifiers for debugging
      final formIdentifiers =
          response.map((item) => item['form_identifier']).toSet();
      print('📋 ReportsService: Found form identifiers: $formIdentifiers');

      // Convert to FormSubmission objects
      List<FormSubmission> submissions = [];
      for (int i = 0; i < response.length; i++) {
        try {
          final json = response[i];
          print(
              '🔄 ReportsService: Processing submission ${i + 1}/${response.length}: ${json['id']}');
          final submission = FormSubmission.fromJson(json);
          submissions.add(submission);
        } catch (parseError) {
          print(
              '❌ ReportsService: Error parsing submission ${i + 1}: $parseError');
          print('📄 ReportsService: Problematic data: ${response[i]}');
          // Continue with other submissions
        }
      }

      // Use employee_id directly instead of enhancing with user data
      print(
          '📋 ReportsService: Using employee_id values directly from database');
      submissions = submissions.map((submission) {
        return FormSubmission(
          id: submission.id,
          formIdentifier: submission.formIdentifier,
          userId: submission.userId,
          employeeId: submission.employeeId ?? 'Unknown',
          submissionData: submission.submissionData,
          submittedAt: submission.submittedAt,
          createdAt: submission.createdAt,
          userName: submission.employeeId ??
              'Unknown', // Use employee_id as display name
          userEmail: 'user@example.com',
          userOffice:
              submission.submissionData['officeName'] ?? 'Unknown Office',
        );
      }).toList();

      // Apply client-side filtering
      if (filters != null) {
        if (filters.formIdentifier != null &&
            filters.formIdentifier!.isNotEmpty) {
          submissions = submissions
              .where((s) => s.formIdentifier == filters.formIdentifier)
              .toList();
        }

        if (filters.userId != null && filters.userId!.isNotEmpty) {
          submissions =
              submissions.where((s) => s.userId == filters.userId).toList();
        }

        if (filters.startDate != null) {
          submissions = submissions
              .where((s) => s.submittedAt.isAfter(filters.startDate!))
              .toList();
        }

        if (filters.endDate != null) {
          submissions = submissions
              .where((s) => s.submittedAt.isBefore(filters.endDate!))
              .toList();
        }

        if (filters.officeName != null && filters.officeName!.isNotEmpty) {
          print(
              '🔍 ReportsService: Applying office name filter: ${filters.officeName}');
          print(
              '🔍 ReportsService: Looking for office name in submission data...');

          submissions = submissions.where((submission) {
            // Check multiple possible locations for office name
            final submissionDataOffice =
                submission.submissionData['officeName'];
            final userOffice = submission.userOffice;

            // Look through all submission_data fields for office names
            String? foundOffice;
            for (final entry in submission.submissionData.entries) {
              final value = entry.value;
              if (value is String &&
                  (value.contains(' RO') ||
                      value.contains(' BO') ||
                      value.contains(' SO') ||
                      value.contains(' HO') ||
                      value.contains(' DO') ||
                      value.contains('Office'))) {
                foundOffice = value;
                break;
              }
            }

            final officeToCheck =
                foundOffice ?? submissionDataOffice ?? userOffice ?? '';
            print(
                '📋 Submission ${submission.id}: office="$officeToCheck", filter="${filters.officeName}"');

            return officeToCheck
                .toLowerCase()
                .contains(filters.officeName!.toLowerCase());
          }).toList();

          print(
              '📊 ReportsService: Office filter result: ${submissions.length} submissions');
        }
      }

      return submissions;
    } catch (error) {
      print('ReportsService: Error in getFormSubmissions: $error');
      rethrow;
    }
  }

  /// Gets summary statistics for reports dashboard
  static Future<ReportsSummary> getReportsSummary() async {
    try {
      print('ReportsService: Fetching reports summary...');

      // Check cache first
      const cacheKey = 'reports_summary';
      if (_cache.containsKey(cacheKey) && _isCacheValid(cacheKey)) {
        print('ReportsService: Returning cached summary');
        return _cache[cacheKey];
      }

      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final weekAgo = now.subtract(const Duration(days: 7));
      final monthStart = DateTime(now.year, now.month, 1);

      // Find working data source
      final workingTable = await _findWorkingDataSource();

      // Get total submissions count
      final totalResponse = await _supabase
          .from(workingTable)
          .select('id')
          .count(CountOption.exact);
      final totalSubmissions = totalResponse.count;

      // Get unique forms
      final formsResponse =
          await _supabase.from(workingTable).select('form_identifier');
      final uniqueForms =
          formsResponse.map((item) => item['form_identifier']).toSet().length;

      // Get unique users
      final usersResponse =
          await _supabase.from(workingTable).select('user_id');
      final uniqueUsers =
          usersResponse.map((item) => item['user_id']).toSet().length;

      // Get submissions today
      final todayResponse = await _supabase
          .from(workingTable)
          .select('id')
          .gte('submitted_at', today.toIso8601String())
          .count(CountOption.exact);
      final submissionsToday = todayResponse.count;

      // Get submissions this week
      final weekResponse = await _supabase
          .from(workingTable)
          .select('id')
          .gte('submitted_at', weekAgo.toIso8601String())
          .count(CountOption.exact);
      final submissionsThisWeek = weekResponse.count;

      // Get submissions this month
      final monthResponse = await _supabase
          .from(workingTable)
          .select('id')
          .gte('submitted_at', monthStart.toIso8601String())
          .count(CountOption.exact);
      final submissionsThisMonth = monthResponse.count;

      final summary = ReportsSummary(
        totalSubmissions: totalSubmissions,
        uniqueForms: uniqueForms,
        uniqueUsers: uniqueUsers,
        submissionsToday: submissionsToday,
        submissionsThisWeek: submissionsThisWeek,
        submissionsThisMonth: submissionsThisMonth,
      );

      // Cache the result
      _cache[cacheKey] = summary;
      _cacheTimestamps[cacheKey] = DateTime.now();

      print('ReportsService: Successfully generated summary: $summary');
      return summary;
    } catch (error) {
      print('ReportsService: Error in getReportsSummary: $error');
      rethrow;
    }
  }

  /// Gets list of unique form identifiers
  static Future<List<String>> getFormIdentifiers() async {
    try {
      final workingTable = await _findWorkingDataSource();

      final response =
          await _supabase.from(workingTable).select('form_identifier');

      final uniqueIdentifiers = response
          .map((item) => item['form_identifier'] as String)
          .toSet()
          .toList()
        ..sort();

      print(
          'ReportsService: Found ${uniqueIdentifiers.length} unique form identifiers');
      return uniqueIdentifiers;
    } catch (error) {
      print('ReportsService: Error fetching form identifiers: $error');
      rethrow;
    }
  }

  /// Enhances submission data with user information from user_profiles table
  static Future<List<FormSubmission>> _enhanceWithUserData(
      List<FormSubmission> submissions) async {
    try {
      print(
          '🔍 ReportsService: Enhancing submissions with user profile data...');

      // Get all unique Firebase UIDs from submissions (from user_id column)
      final firebaseUIDs = submissions
          .map((s) => s.userId) // Use userId which contains Firebase UID
          .where((id) => id.trim().isNotEmpty)
          .toSet()
          .toList();

      print('🔍 ReportsService: Found Firebase UIDs to lookup: $firebaseUIDs');

      // Fetch user profiles for these Firebase UIDs
      List<Map<String, dynamic>> userProfiles = [];
      if (firebaseUIDs.isNotEmpty) {
        // Try multiple approaches to find user profiles

        // Method 1: Try with 'uid' field (new registration method)
        print('🔍 ReportsService: Trying Method 1 - lookup by uid field...');
        var response = await _supabase
            .from('user_profiles') // Use correct table name (plural)
            .select(
                'uid, employeeId, name, email, officeName, designation, divisionName') // Include uid for matching
            .inFilter('uid', firebaseUIDs); // Match by Firebase UID

        if (response.isNotEmpty) {
          userProfiles = List<Map<String, dynamic>>.from(response);
          print(
              '✅ ReportsService: Method 1 successful - Found ${userProfiles.length} profiles');
        } else {
          print(
              '⚠️ ReportsService: Method 1 failed - No profiles found by uid');

          // Method 2: Try to get all profiles and match manually
          print(
              '🔍 ReportsService: Trying Method 2 - get all profiles and debug...');
          final allProfilesResponse = await _supabase
              .from('user_profiles')
              .select('uid, employeeId, name, email, officeName')
              .limit(20);

          print(
              '🔍 ReportsService: All profiles in database: $allProfilesResponse');
          print('🔍 ReportsService: Looking for UIDs: $firebaseUIDs');

          // Try to find any matching profiles manually
          for (final profile in allProfilesResponse) {
            if (firebaseUIDs.contains(profile['uid'])) {
              userProfiles.add(profile);
              print(
                  '✅ ReportsService: Found matching profile manually: $profile');
            }
          }
        }

        print('✅ ReportsService: Final user profiles found: $userProfiles');
      }

      // Create a map for quick lookup by Firebase UID
      final profileMap = <String, Map<String, dynamic>>{};
      for (final profile in userProfiles) {
        profileMap[profile['uid']] = profile; // Use Firebase UID as key
      }

      return submissions.map((submission) {
        // Look up user profile by Firebase UID (stored in user_id column)
        final userProfile = profileMap[submission.userId];

        print(
            '📋 Final user name for ${submission.userId}: "${userProfile?['name'] ?? (userProfile?['employeeId'] ?? 'Unknown User')}"');

        // Use user_profiles data if available, otherwise fall back to employeeId or Unknown User
        final userName = userProfile?[
                'name'] ?? // Use 'name' field from user_profiles
            userProfile?[
                'employeeId'] ?? // Fall back to employee ID if name not available
            'Unknown User';

        final userEmail = userProfile?['email'] ?? 'user@example.com';

        final userOffice =
            userProfile?['officeName'] ?? // Use correct column name
                submission.submissionData['officeName'] ??
                'Unknown Office';

        print(
            '✅ Enhanced submission ${submission.id}: userName=$userName, userEmail=$userEmail, userOffice=$userOffice, userId=${submission.userId}');

        return FormSubmission(
          id: submission.id,
          formIdentifier: submission.formIdentifier,
          userId: submission.userId,
          employeeId:
              submission.userId, // Set employeeId to userId for consistency
          submissionData: submission.submissionData,
          submittedAt: submission.submittedAt,
          createdAt: submission.createdAt,
          userName: userName,
          userEmail: userEmail,
          userOffice: userOffice,
        );
      }).toList();
    } catch (error) {
      print('ReportsService: Error enhancing with user data: $error');
      return submissions;
    }
  }

  /// Clears the cache
  static void clearCache() {
    _cache.clear();
    _cacheTimestamps.clear();
    print('ReportsService: Cache cleared');
  }

  /// Finds a working data source from available options
  static Future<String> _findWorkingDataSource() async {
    final tablesToTry = [
      'reports_data_view', // Unified view (preferred)
      'dynamic_form_submissions', // Original table
      'reports_test_data' // Test table fallback
    ];

    for (final tableName in tablesToTry) {
      try {
        final response = await _supabase
            .from(tableName)
            .select('id')
            .count(CountOption.exact);

        if (response.count >= 0) {
          print(
              '✅ ReportsService: Using $tableName with ${response.count} records');
          return tableName;
        }
      } catch (err) {
        print('❌ ReportsService: $tableName not accessible');
      }
    }

    throw Exception(
        'No accessible data source found. Please run the DIRECT_QUERY_APPROACH.sql script.');
  }

  /// Checks if cached data is still valid
  static bool _isCacheValid(String key) {
    if (!_cacheTimestamps.containsKey(key)) return false;
    final timestamp = _cacheTimestamps[key]!;
    final now = DateTime.now();
    return now.difference(timestamp) < _cacheExpiry;
  }

  /// Extracts user name from submission data or falls back to user ID
  static String _extractUserName(Map<String, dynamic> data, String userId) {
    print('_extractUserName called with data: $data, userId: $userId');

    // Since we're dealing with dynamic fields, look for text values that might be names
    for (final entry in data.entries) {
      final key = entry.key;
      final value = entry.value;

      if (value is String && value.length > 2 && value.length < 50) {
        // Skip if it looks like a date
        if (value.contains('T') && value.contains(':')) continue;
        // Skip if it's just a number
        if (double.tryParse(value) != null) continue;
        // Skip office name field
        if (key == 'officeName') continue;
        // Skip if it looks like an office name (contains BO, SO, RO, etc.)
        if (value.contains(' BO') ||
            value.contains(' SO') ||
            value.contains(' RO') ||
            value.contains(' HO') ||
            value.contains(' DO') ||
            value.contains('Office')) continue;

        // This might be a name - use it
        print('Found potential name: $value');
        return value;
      }
    }

    // Fallback to user ID
    if (userId.isNotEmpty) {
      if (userId.length <= 8) return 'User $userId';
      return 'User ${userId.substring(0, 8)}';
    }

    return 'Form Submitter';
  }

  /// Gets readable form type display name
  static String getFormTypeDisplay(String formIdentifier) {
    const formTypes = {
      'employee-registration': 'Employee Registration',
      'leave-request': 'Leave Request',
      'expense-report': 'Expense Report',
      'performance-review': 'Performance Review',
      'it-support-request': 'IT Support Request',
      'training-registration': 'Training Registration',
      'feedback-form': 'Feedback Form',
      'inventory-request': 'Inventory Request',
    };

    return formTypes[formIdentifier] ??
        formIdentifier
            .replaceAll('-', ' ')
            .split(' ')
            .map((word) => word.isNotEmpty
                ? '${word[0].toUpperCase()}${word.substring(1)}'
                : '')
            .join(' ');
  }

  /// Formats submission data for readable display
  static String formatReadableData(Map<String, dynamic> data) {
    print('formatReadableData called with: $data');

    // Since we're dealing with dynamic form fields with generated IDs,
    // let's create a more intelligent display
    final displayFields = <String>[];

    // Filter out empty values and format nicely
    for (final entry in data.entries) {
      final key = entry.key;
      final value = entry.value;

      if (value != null && value.toString().isNotEmpty) {
        // Skip office name as it's shown separately
        if (key == 'officeName') continue;

        // Format the value based on type and content
        String formattedValue = value.toString();
        String fieldDescription = 'Data';

        if (value is String && value.contains('T') && value.contains(':')) {
          // Looks like a date
          try {
            final date = DateTime.parse(value);
            formattedValue = '${date.day}/${date.month}/${date.year}';
            fieldDescription = 'Date';
          } catch (e) {
            // Keep original value if date parsing fails
          }
        } else if (value is String &&
            (value.contains(' BO') ||
                value.contains(' SO') ||
                value.contains(' RO'))) {
          // This is an office name
          fieldDescription = 'Office';
          formattedValue = value;
        } else if (value is String &&
            value.length > 10 &&
            !value.contains(' ')) {
          // Long string without spaces might be an ID
          fieldDescription = 'ID';
          formattedValue =
              value.length > 15 ? '${value.substring(0, 15)}...' : value;
        } else if (value is num || double.tryParse(value.toString()) != null) {
          // Numeric value
          fieldDescription = 'Value';
          formattedValue = value.toString();
        } else if (value is String && value.length < 50) {
          // Short text might be a name or description
          fieldDescription = 'Text';
          formattedValue = value;
        }

        displayFields.add('$fieldDescription: $formattedValue');
      }
    }

    // Limit to first 3 fields to avoid clutter
    final limitedFields = displayFields.take(3).toList();
    final result = limitedFields.isNotEmpty
        ? '${limitedFields.join(', ')}${displayFields.length > 3 ? '...' : ''}'
        : 'Form submission data';

    print('Final result: $result');
    return result;
  }
}
