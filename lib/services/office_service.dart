import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:cloud_firestore/cloud_firestore.dart';

class OfficeService {
  static final SupabaseClient _supabase = Supabase.instance.client;

  // Cache for office names to avoid repeated API calls
  static List<String>? _cachedOfficeNames;
  static DateTime? _cacheTimestamp;
  static const Duration _cacheExpiry = Duration(minutes: 30);

  // Cache for user-specific office names
  static Map<String, List<String>> _userSpecificCache = {};
  static Map<String, DateTime> _userCacheTimestamps = {};

  /// Fetches office names from Supabase database
  /// Returns a list of office names from the 'offices' table
  static Future<List<String>> fetchOfficeNames() async {
    try {
      // Check if we have valid cached data
      if (_cachedOfficeNames != null &&
          _cacheTimestamp != null &&
          DateTime.now().difference(_cacheTimestamp!) < _cacheExpiry) {
        print(
            'OfficeService: Returning cached office names (${_cachedOfficeNames!.length} items)');
        return _cachedOfficeNames!;
      }

      print('OfficeService: Fetching office names from Supabase...');

      // First, debug the table structure
      print('OfficeService: Debugging table structure...');
      final debugResponse =
          await _supabase.from('offices').select('*').limit(3);
      print('OfficeService: Sample records: $debugResponse');
      if (debugResponse.isNotEmpty) {
        print(
            'OfficeService: Available columns: ${debugResponse.first.keys.toList()}');
      }

      // Specific check for "Coimbatore division" in database
      print(
          'OfficeService: Checking for "Coimbatore division" specifically...');
      final coimbatoreDivisionCheck = await _supabase
          .from('offices')
          .select('*')
          .ilike('Office name', '%coimbatore division%');
      print(
          'OfficeService: Direct search for Coimbatore division: ${coimbatoreDivisionCheck.length} results');
      for (var office in coimbatoreDivisionCheck) {
        print('OfficeService: Found: "${office['Office name']}"');
      }

      // First, get total count to understand the scope
      print('OfficeService: Getting total record count...');
      final countResponse = await _supabase
          .from('offices')
          .select('*')
          .limit(1); // Just get one record to check if table exists
      print('OfficeService: Table accessible, proceeding with full fetch...');

      // Try different approaches to fetch ALL records (not limited to 1000)
      print(
          'OfficeService: Implementing comprehensive data fetching strategies...');

      // Approach 1: Pagination using .range() method
      print('OfficeService: Approach 1 - Pagination with .range()');
      List<dynamic> paginatedRecords = await _fetchAllRecordsWithPagination();
      print(
          'OfficeService: Approach 1 (pagination): ${paginatedRecords.length} records');

      // Approach 2: High range method
      print('OfficeService: Approach 2 - High range method');
      final response2 = await _supabase
          .from('offices')
          .select('*')
          .range(0, 49999) // Fetch first 50,000 records
          .order('"Office name"', ascending: true);
      print(
          'OfficeService: Approach 2 (range 0-49999): ${response2.length} records');

      // Approach 3: No ordering, then sort in app
      print('OfficeService: Approach 3 - No ordering, app-side sorting');
      final response3 = await _supabase
          .from('offices')
          .select('*')
          .range(0, 49999); // No ordering to avoid potential limits
      print(
          'OfficeService: Approach 3 (no order, range): ${response3.length} records');

      // Approach 4: Multiple smaller queries combined
      print('OfficeService: Approach 4 - Multiple batch queries');
      List<dynamic> batchedRecords = await _fetchAllRecordsWithBatching();
      print(
          'OfficeService: Approach 4 (batched): ${batchedRecords.length} records');

      // Approach 5: Simple query without any constraints (fallback)
      print('OfficeService: Approach 5 - Simple fallback query');
      final response5 = await _supabase
          .from('offices')
          .select('"Office name"'); // Only select the column we need
      print('OfficeService: Approach 5 (simple): ${response5.length} records');

      // Use the approach that returns the most records
      List<dynamic> response = response5; // Initialize with fallback

      // Find the approach with the maximum number of records
      int maxRecords = response5.length;
      String bestApproach = 'simple fallback';

      if (paginatedRecords.length > maxRecords) {
        maxRecords = paginatedRecords.length;
        response = paginatedRecords;
        bestApproach = 'pagination';
      }

      if (response2.length > maxRecords) {
        maxRecords = response2.length;
        response = response2;
        bestApproach = 'range method';
      }

      if (response3.length > maxRecords) {
        maxRecords = response3.length;
        response = response3;
        bestApproach = 'no order';
      }

      if (batchedRecords.length > maxRecords) {
        maxRecords = batchedRecords.length;
        response = batchedRecords;
        bestApproach = 'batched';
      }

      print(
          'OfficeService: Best approach: $bestApproach with $maxRecords records');

      print('OfficeService: Final query returned ${response.length} records');
      print(
          'OfficeService: Sample response data: ${response.take(3).toList()}');

      // Check the alphabetical range of offices to verify we're getting beyond "A"
      if (response.isNotEmpty) {
        List<String> allNames = [];
        for (var office in response) {
          String? officeName = office['Office name'] as String?;
          if (officeName != null && officeName.trim().isNotEmpty) {
            allNames.add(officeName.trim());
          }
        }
        allNames.sort();
        if (allNames.isNotEmpty) {
          print(
              'OfficeService: Alphabetical range - First: "${allNames.first}"');
          print('OfficeService: Alphabetical range - Last: "${allNames.last}"');

          // Check for offices starting with different letters
          final aOffices = allNames
              .where((name) => name.toLowerCase().startsWith('a'))
              .length;
          final bOffices = allNames
              .where((name) => name.toLowerCase().startsWith('b'))
              .length;
          final cOffices = allNames
              .where((name) => name.toLowerCase().startsWith('c'))
              .length;
          final dOffices = allNames
              .where((name) => name.toLowerCase().startsWith('d'))
              .length;

          print(
              'OfficeService: Letter distribution - A: $aOffices, B: $bOffices, C: $cOffices, D: $dOffices');
        }
      }

      if (response.isEmpty) {
        print('OfficeService: No offices found in database');
        return [];
      }

      // Extract office names from the response
      // Use the same approach as the working web app
      List<String> officeNames = [];

      for (var office in response) {
        // Access the column the same way as the web app: row['Office name']
        String? officeName = office['Office name'] as String?;
        if (officeName != null && officeName.trim().isNotEmpty) {
          officeNames.add(officeName.trim());
          print('OfficeService: Added office: $officeName');
        } else {
          print('OfficeService: Skipped office (no valid name): $office');
        }
      }

      // Remove duplicates and sort
      officeNames = officeNames.toSet().toList();
      officeNames.sort();

      // Cache the results
      _cachedOfficeNames = officeNames;
      _cacheTimestamp = DateTime.now();

      print(
          'OfficeService: Successfully fetched ${officeNames.length} office names');

      // Check specifically for Coimbatore offices
      final coimbatoreOffices = officeNames
          .where((office) => office.toLowerCase().contains('coimbatore'))
          .toList();
      print('OfficeService: Coimbatore offices found: $coimbatoreOffices');

      // Check for any offices containing "division"
      final divisionOffices = officeNames
          .where((office) => office.toLowerCase().contains('division'))
          .toList();
      print('OfficeService: Division offices found: $divisionOffices');

      // Specific check for "Coimbatore division"
      final hasCoimbatoreDivision = officeNames
          .any((office) => office.toLowerCase() == 'coimbatore division');
      print(
          'OfficeService: Contains "Coimbatore division": $hasCoimbatoreDivision');

      // Check raw response for "Coimbatore division" before processing
      print('OfficeService: Checking raw response for Coimbatore division...');
      for (var office in response) {
        String? officeName = office['Office name'] as String?;
        if (officeName != null &&
            officeName.toLowerCase().contains('coimbatore division')) {
          print('OfficeService: Found in raw data: "$officeName"');
        }
      }

      return officeNames;
    } catch (e) {
      print('OfficeService: Error fetching office names: $e');

      // Return cached data if available, even if expired
      if (_cachedOfficeNames != null) {
        print('OfficeService: Returning expired cached data due to error');
        return _cachedOfficeNames!;
      }

      // If no cached data, rethrow the error
      rethrow;
    }
  }

  /// Clears the cached office names
  /// Useful when you want to force a fresh fetch
  static void clearCache() {
    _cachedOfficeNames = null;
    _cacheTimestamp = null;
    print('OfficeService: Cache cleared');
  }

  /// Checks if the cache is valid
  static bool isCacheValid() {
    return _cachedOfficeNames != null &&
        _cacheTimestamp != null &&
        DateTime.now().difference(_cacheTimestamp!) < _cacheExpiry;
  }

  /// Gets cached office names without making a network request
  /// Returns null if no valid cache exists
  static List<String>? getCachedOfficeNames() {
    if (isCacheValid()) {
      return _cachedOfficeNames;
    }
    return null;
  }

  /// Refreshes the cache by fetching fresh data
  static Future<List<String>> refreshOfficeNames() async {
    clearCache();
    return await fetchOfficeNames();
  }

  /// Fetches office names for the current user using hierarchical filtering
  /// - Division users: See all offices under their division
  /// - Region users: See all offices under their region
  /// - Office users: See offices under their reporting office
  static Future<List<String>> fetchUserSpecificOfficeNames() async {
    try {
      // Get current user's office name
      Map<String, String?> userOfficeData = await _getCurrentUserOfficeData();
      String? userOfficeName = userOfficeData['officeName'];

      if (userOfficeName == null || userOfficeName.isEmpty) {
        // If no user office found, return empty list
        print('OfficeService: No user office found, returning empty list');
        return [];
      }

      // Check cache for user-specific data
      String cacheKey = userOfficeName;
      if (_userSpecificCache.containsKey(cacheKey) &&
          _userCacheTimestamps.containsKey(cacheKey)) {
        DateTime? cacheTime = _userCacheTimestamps[cacheKey];
        if (cacheTime != null &&
            DateTime.now().difference(cacheTime) < _cacheExpiry) {
          print(
              'OfficeService: Returning cached hierarchical office names (${_userSpecificCache[cacheKey]!.length} items)');
          return _userSpecificCache[cacheKey]!;
        }
      }

      print(
          'OfficeService: Building hierarchical office list for user: $userOfficeName');

      // Determine user level and get appropriate office list
      List<String> officeList = await _getOfficesByUserLevel(userOfficeName);

      // Remove duplicates and sort
      officeList = officeList.toSet().toList();
      officeList.sort();

      // Cache the user-specific result
      _userSpecificCache[cacheKey] = officeList;
      _userCacheTimestamps[cacheKey] = DateTime.now();

      print(
          'OfficeService: Successfully returned ${officeList.length} hierarchical office names: $officeList');
      return officeList;
    } catch (e) {
      print('OfficeService: Error fetching hierarchical office names: $e');

      // Fallback to cached user-specific data if available
      Map<String, String?> userOfficeData = await _getCurrentUserOfficeData();
      String? userOfficeName = userOfficeData['officeName'];
      if (userOfficeName != null &&
          _userSpecificCache.containsKey(userOfficeName)) {
        print(
            'OfficeService: Returning expired cached office names due to error');
        return _userSpecificCache[userOfficeName]!;
      }

      // Final fallback to user office only if we can get it
      if (userOfficeName != null && userOfficeName.isNotEmpty) {
        print('OfficeService: Returning user office as final fallback');
        return [userOfficeName];
      }

      // Ultimate fallback to empty list
      print('OfficeService: Returning empty list due to error');
      return [];
    }
  }

  /// Determines user level and returns appropriate office list
  static Future<List<String>> _getOfficesByUserLevel(
      String userOfficeName) async {
    try {
      // Get user's office details from Supabase
      final userOfficeDetails = await getOfficeDetails(userOfficeName);

      if (userOfficeDetails == null) {
        print(
            'OfficeService: Could not find office details for: $userOfficeName');
        return [userOfficeName];
      }

      final userRegion = userOfficeDetails['region'] as String?;
      final userDivision = userOfficeDetails['division'] as String?;

      print(
          'OfficeService: User office details - Region: $userRegion, Division: $userDivision');

      // Check if user is at division level
      if (_isDivisionLevel(userOfficeName)) {
        print(
            'OfficeService: User is at division level, fetching all offices in division: $userOfficeName');
        return await _getOfficesByDivision(userOfficeName);
      }

      // Check if user is at region level
      if (_isRegionLevel(userOfficeName)) {
        print(
            'OfficeService: User is at region level, fetching all offices in region: $userRegion');
        return await _getOfficesByRegion(userRegion);
      }

      // Default: office level - get offices under same reporting office
      print(
          'OfficeService: User is at office level, fetching hierarchical offices');
      return await _getOfficesUnderReportingOffice(userOfficeName);
    } catch (e) {
      print('OfficeService: Error determining user level: $e');
      return [userOfficeName];
    }
  }

  /// Checks if user is at division level
  static bool _isDivisionLevel(String officeName) {
    return officeName.trim().toLowerCase().endsWith('division');
  }

  /// Checks if user is at region level (contains "region" but not "division")
  static bool _isRegionLevel(String officeName) {
    final lowerName = officeName.trim().toLowerCase();
    return lowerName.contains('region') && !lowerName.endsWith('division');
  }

  /// Gets all offices under a specific division
  /// For divisional offices like "Coimbatore division", finds all offices
  /// by querying the Division column directly
  static Future<List<String>> _getOfficesByDivision(String? division) async {
    if (division == null || division.trim().isEmpty) {
      return [];
    }

    try {
      print('🔍 OfficeService: Starting division lookup for: $division');

      // Extract the division area name (e.g., "Coimbatore" from "Coimbatore division")
      String extractedDivision =
          division.toLowerCase().replaceAll(' division', '').trim();
      print('🔍 OfficeService: Extracted division area: $extractedDivision');

      // Query all offices where Division column matches the extracted division name
      print(
          '🔍 OfficeService: Querying offices where "Division" = "$extractedDivision"');
      final response = await _supabase
          .from('offices')
          .select('"Office name"')
          .eq('"Division"', extractedDivision)
          .order('"Office name"', ascending: true);

      List<String> offices = [];
      for (var office in response) {
        String officeName = office['Office name'] as String;
        offices.add(officeName);
      }

      print(
          '🔍 OfficeService: Found ${offices.length} offices in Division "$extractedDivision"');
      print('📋 OfficeService: Offices: $offices');

      // Always include the division office itself if not already in the list
      if (!offices.contains(division)) {
        print('➕ OfficeService: Adding division office to list: $division');
        offices.add(division);
        offices.sort();
      }

      print(
          '✅ OfficeService: Final result - ${offices.length} offices under division: $division');
      return offices;
    } catch (e) {
      print('❌ OfficeService: Error fetching offices by division: $e');
      return [division]; // Return at least the division office itself
    }
  }

  /// Gets all offices under a specific region
  static Future<List<String>> _getOfficesByRegion(String? region) async {
    if (region == null || region.trim().isEmpty) {
      return [];
    }

    try {
      final response = await _supabase
          .from('offices')
          .select('"Office name"')
          .eq('Region', region)
          .order('"Office name"', ascending: true);

      List<String> offices = [];
      for (var office in response) {
        offices.add(office['Office name'] as String);
      }

      print(
          'OfficeService: Found ${offices.length} offices in region: $region');
      return offices;
    } catch (e) {
      print('OfficeService: Error fetching offices by region: $e');
      return [];
    }
  }

  /// Gets offices under the same reporting office (original logic)
  static Future<List<String>> _getOfficesUnderReportingOffice(
      String userOfficeName) async {
    try {
      // Query Supabase to find all offices that report TO the user's office
      print(
          'OfficeService: Querying offices that report to user office: $userOfficeName');

      final reportingOfficesResponse = await _supabase
          .from('offices')
          .select('"Office name"')
          .eq('"Reporting Office Nam"', userOfficeName)
          .order('"Office name"', ascending: true);

      print(
          'OfficeService: Found ${reportingOfficesResponse.length} offices reporting to: $userOfficeName');

      // Build list of offices to show
      List<String> officeList = [];

      // Add user's own office
      officeList.add(userOfficeName);
      print('OfficeService: Added user office: $userOfficeName');

      // Add all offices that report to the user's office
      for (var office in reportingOfficesResponse) {
        String? officeName = office['Office name'] as String?;
        if (officeName != null && officeName.trim().isNotEmpty) {
          officeList.add(officeName.trim());
          print('OfficeService: Added reporting office: $officeName');
        }
      }

      if (reportingOfficesResponse.isEmpty) {
        print(
            'OfficeService: No offices report to user office, showing user office only');
      }

      return officeList;
    } catch (e) {
      print('OfficeService: Error fetching offices under reporting office: $e');
      return [userOfficeName];
    }
  }

  /// Gets the current user's office data from Firebase (public method)
  /// Returns both officeName and reportingOfficeName if available
  static Future<Map<String, String?>> getCurrentUserOfficeData() async {
    return _getCurrentUserOfficeData();
  }

  /// Gets the current user's office data from Firebase
  /// Returns both officeName and reportingOfficeName if available
  static Future<Map<String, String?>> _getCurrentUserOfficeData() async {
    try {
      firebase_auth.User? user =
          firebase_auth.FirebaseAuth.instance.currentUser;
      if (user == null) {
        print('OfficeService: No user logged in');
        return {'officeName': null, 'reportingOfficeName': null};
      }

      DocumentSnapshot userDoc = await FirebaseFirestore.instance
          .collection('employees')
          .doc(user.uid)
          .get();

      if (userDoc.exists) {
        Map<String, dynamic> userData = userDoc.data() as Map<String, dynamic>;
        String? officeName = userData['officeName'] as String?;
        String? reportingOfficeName =
            userData['reportingOfficeName'] as String?;

        print('OfficeService: User office: $officeName');
        print('OfficeService: User reporting office: $reportingOfficeName');

        return {
          'officeName': officeName,
          'reportingOfficeName': reportingOfficeName
        };
      } else {
        print('OfficeService: User document not found');
        return {'officeName': null, 'reportingOfficeName': null};
      }
    } catch (e) {
      print('OfficeService: Error getting user office data: $e');
      return {'officeName': null, 'reportingOfficeName': null};
    }
  }

  /// Determines reporting office from organizational hierarchy
  /// For now, returns null - can be enhanced with actual hierarchy logic
  static Future<String?> _getReportingOfficeFromHierarchy(
      String userOfficeName) async {
    try {
      // This is a placeholder for hierarchy-based reporting office determination
      // You can implement actual logic here based on your organizational structure

      // For example, you might:
      // 1. Query Supabase to find the user's office details
      // 2. Determine the regional or divisional head office
      // 3. Return that as the reporting office

      print(
          'OfficeService: Hierarchy-based reporting office lookup not implemented yet');
      return null;

      // Example implementation (commented out):
      /*
      final userOfficeResponse = await _supabase
          .from('offices')
          .select('*')
          .eq('Office name', userOfficeName)
          .limit(1);

      if (userOfficeResponse.isNotEmpty) {
        var userOfficeData = userOfficeResponse.first;
        String? userRegion = userOfficeData['Region'] as String?;
        String? userDivision = userOfficeData['Division'] as String?;

        // Find the divisional head office or regional office
        final reportingOfficeResponse = await _supabase
            .from('offices')
            .select('*')
            .eq('Region', userRegion)
            .eq('Division', userDivision)
            .contains('Office name', 'Head Office') // Example logic
            .limit(1);

        if (reportingOfficeResponse.isNotEmpty) {
          return reportingOfficeResponse.first['Office name'] as String?;
        }
      }
      return null;
      */
    } catch (e) {
      print('OfficeService: Error determining hierarchy reporting office: $e');
      return null;
    }
  }

  /// Get detailed office information from Supabase offices table
  static Future<Map<String, dynamic>?> getOfficeDetails(
      String officeName) async {
    try {
      print('🏢 OfficeService: Fetching details for office: $officeName');

      // Query the offices table for the specific office
      final response = await _supabase
          .from('offices')
          .select('*')
          .eq('Office name', officeName)
          .maybeSingle();

      if (response != null) {
        print('✅ OfficeService: Found office details: $response');

        // Return structured office details
        return {
          'officeName': response['Office name'] ?? officeName,
          'officeType': _extractOfficeType(response['Office name'] ?? ''),
          'division': response['Division'] ?? 'Unknown Division',
          'region': response['Region'] ?? 'Unknown Region',
          'reportingOfficeName':
              response['Reporting Office Nam'] ?? 'No Reporting Office',
          'facilityId': response['Facility ID'] ?? 'Unknown ID',
          'rawData': response, // Keep raw data for any additional fields
        };
      } else {
        print('⚠️ OfficeService: No office details found for: $officeName');

        // Return basic details with extracted office type
        return {
          'officeName': officeName,
          'officeType': _extractOfficeType(officeName),
          'division': 'Unknown Division',
          'region': 'Unknown Region',
          'reportingOfficeName': 'No Reporting Office',
          'facilityId': 'Unknown ID',
          'rawData': null,
        };
      }
    } catch (error) {
      print(
          '❌ OfficeService: Error fetching office details for $officeName: $error');

      // Return basic fallback details
      return {
        'officeName': officeName,
        'officeType': _extractOfficeType(officeName),
        'division': 'Error Loading',
        'region': 'Error Loading',
        'reportingOfficeName': 'Error Loading',
        'facilityId': 'Error Loading',
        'rawData': null,
      };
    }
  }

  /// Extract office type from office name (BO, SO, RO, HO, DO, etc.)
  static String _extractOfficeType(String officeName) {
    if (officeName.contains(' BO')) return 'Branch Office (BO)';
    if (officeName.contains(' SO')) return 'Sub Office (SO)';
    if (officeName.contains(' RO')) return 'Regional Office (RO)';
    if (officeName.contains(' HO')) return 'Head Office (HO)';
    if (officeName.contains(' DO')) return 'Divisional Office (DO)';
    if (officeName.toLowerCase().contains('office')) return 'Office';
    return 'Unknown Type';
  }

  /// Fetch all records using pagination with .range() method
  static Future<List<dynamic>> _fetchAllRecordsWithPagination() async {
    List<dynamic> allRecords = [];
    int batchSize = 1000;
    int start = 0;

    try {
      while (true) {
        print(
            'OfficeService: Fetching batch ${start}-${start + batchSize - 1}');

        final batch = await _supabase
            .from('offices')
            .select('*')
            .range(start, start + batchSize - 1)
            .order('"Office name"', ascending: true);

        print('OfficeService: Batch returned ${batch.length} records');

        if (batch.isEmpty) {
          print('OfficeService: No more records, pagination complete');
          break;
        }

        allRecords.addAll(batch);

        // If we got fewer records than requested, we've reached the end
        if (batch.length < batchSize) {
          print(
              'OfficeService: Last batch (${batch.length} < $batchSize), pagination complete');
          break;
        }

        start += batchSize;

        // Safety check to prevent infinite loops
        if (start > 100000) {
          print('OfficeService: Safety limit reached, stopping pagination');
          break;
        }
      }

      print(
          'OfficeService: Pagination complete - Total records: ${allRecords.length}');
      return allRecords;
    } catch (e) {
      print('OfficeService: Error in pagination: $e');
      return allRecords; // Return what we have so far
    }
  }

  /// Fetch all records using multiple smaller batched queries
  static Future<List<dynamic>> _fetchAllRecordsWithBatching() async {
    List<dynamic> allRecords = [];
    int batchSize = 500; // Smaller batches
    int maxBatches = 20; // Limit number of batches for safety

    try {
      for (int i = 0; i < maxBatches; i++) {
        int start = i * batchSize;
        int end = start + batchSize - 1;

        print('OfficeService: Batch $i - fetching records $start to $end');

        final batch =
            await _supabase.from('offices').select('*').range(start, end);

        print('OfficeService: Batch $i returned ${batch.length} records');

        if (batch.isEmpty) {
          print('OfficeService: Empty batch, stopping');
          break;
        }

        allRecords.addAll(batch);

        // If we got fewer records than requested, we've reached the end
        if (batch.length < batchSize) {
          print('OfficeService: Partial batch, reached end of data');
          break;
        }
      }

      print(
          'OfficeService: Batching complete - Total records: ${allRecords.length}');
      return allRecords;
    } catch (e) {
      print('OfficeService: Error in batching: $e');
      return allRecords; // Return what we have so far
    }
  }

  /// Debug method to check table structure
  static Future<void> debugTableStructure() async {
    try {
      print('OfficeService: Debugging table structure...');

      // Try to get table info
      final response = await _supabase.from('offices').select('*').limit(1);

      if (response.isNotEmpty) {
        print('OfficeService: Sample record: ${response.first}');
        print(
            'OfficeService: Available columns: ${response.first.keys.toList()}');
      } else {
        print('OfficeService: No records found in offices table');
      }
    } catch (e) {
      print('OfficeService: Debug error: $e');
    }
  }
}
