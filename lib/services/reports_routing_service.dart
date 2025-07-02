import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

/// Service to determine which type of reports screen to show based on user's office
class ReportsRoutingService {
  static final FirebaseAuth _auth = FirebaseAuth.instance;
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Cache for user office type to avoid repeated Firebase calls
  static String? _cachedUserOffice;
  static bool? _cachedIsDivisionUser;
  static DateTime? _cacheTimestamp;
  static const Duration _cacheExpiry = Duration(minutes: 30);

  /// Determines if the current user should see the comprehensive reports (Division users)
  /// or the simple office-only reports (non-Division users)
  static Future<bool> shouldShowComprehensiveReports() async {
    try {
      // Check cache first
      if (_isCacheValid()) {
        print(
            '📋 ReportsRoutingService: Using cached result: isDivision=$_cachedIsDivisionUser');
        return _cachedIsDivisionUser ?? false;
      }

      print(
          '📋 ReportsRoutingService: Determining report type for current user...');
      print('📋 ReportsRoutingService: Cache valid: ${_isCacheValid()}');

      final user = _auth.currentUser;
      if (user == null) {
        print('❌ ReportsRoutingService: No user logged in');
        return false;
      }

      print('📋 ReportsRoutingService: Current user UID: ${user.uid}');

      // Get user's office from Firebase
      final userDoc =
          await _firestore.collection('employees').doc(user.uid).get();

      if (!userDoc.exists) {
        print('❌ ReportsRoutingService: User document not found');
        return false;
      }

      final userData = userDoc.data() as Map<String, dynamic>;
      final officeName = userData['officeName'] as String?;

      if (officeName == null || officeName.trim().isEmpty) {
        print('❌ ReportsRoutingService: User office name not found');
        return false;
      }

      print('📋 ReportsRoutingService: User office: "$officeName"');

      // Check if office name ends with 'Division' or contains 'Region' (case-insensitive)
      final trimmedLower = officeName.trim().toLowerCase();
      final isDivisionUser = trimmedLower.endsWith('division');
      final isRegionUser =
          trimmedLower.contains('region') && !trimmedLower.endsWith('division');
      final isComprehensiveUser = isDivisionUser || isRegionUser;

      print('📋 ReportsRoutingService: Office name: "$officeName"');
      print('📋 ReportsRoutingService: Trimmed lowercase: "$trimmedLower"');
      print('📋 ReportsRoutingService: Ends with "division": $isDivisionUser');
      print('📋 ReportsRoutingService: Contains "region": $isRegionUser');
      print(
          '📋 ReportsRoutingService: Comprehensive user (division OR region): $isComprehensiveUser');

      String officeType;
      if (isDivisionUser) {
        officeType = "DIVISION (Report Screen 1)";
      } else if (isRegionUser) {
        officeType = "REGION (Report Screen 1)";
      } else {
        officeType = "OFFICE (Report Screen 2)";
      }
      print('📋 ReportsRoutingService: Office type: $officeType');

      // Cache the results
      _cachedUserOffice = officeName;
      _cachedIsDivisionUser =
          isComprehensiveUser; // Cache comprehensive user flag
      _cacheTimestamp = DateTime.now();

      if (isComprehensiveUser) {
        if (isDivisionUser) {
          print(
              '✅ ReportsRoutingService: User is Division-level → Report Screen 1 (Comprehensive)');
        } else if (isRegionUser) {
          print(
              '✅ ReportsRoutingService: User is Region-level → Report Screen 1 (Comprehensive)');
        }
      } else {
        print(
            '✅ ReportsRoutingService: User is Office-level → Report Screen 2 (Table View Only)');
      }

      return isComprehensiveUser;
    } catch (error) {
      print('❌ ReportsRoutingService: Error determining report type: $error');
      return false; // Default to simple reports on error
    }
  }

  /// Gets the current user's office name
  static Future<String?> getCurrentUserOfficeName() async {
    try {
      // Use cached value if available and valid
      if (_isCacheValid() && _cachedUserOffice != null) {
        return _cachedUserOffice;
      }

      final user = _auth.currentUser;
      if (user == null) {
        return null;
      }

      final userDoc =
          await _firestore.collection('employees').doc(user.uid).get();

      if (!userDoc.exists) {
        return null;
      }

      final userData = userDoc.data() as Map<String, dynamic>;
      final officeName = userData['officeName'] as String?;

      // Update cache
      _cachedUserOffice = officeName;
      _cacheTimestamp = DateTime.now();

      return officeName;
    } catch (error) {
      print('❌ ReportsRoutingService: Error getting user office: $error');
      return null;
    }
  }

  /// Gets detailed information about the user's office type and access level
  static Future<Map<String, dynamic>> getUserOfficeInfo() async {
    try {
      print('🔍 getUserOfficeInfo: Starting fresh analysis...');

      // Clear cache to ensure fresh data
      clearCache();

      final officeName = await getCurrentUserOfficeName();
      print('🔍 getUserOfficeInfo: Got office name: $officeName');

      // Use direct division/region logic test instead of cached shouldShowComprehensiveReports
      bool isDivisionUser = false;
      bool isRegionUser = false;
      bool isComprehensiveUser = false;

      if (officeName != null && officeName.trim().isNotEmpty) {
        final trimmedLower = officeName.trim().toLowerCase();
        isDivisionUser = trimmedLower.endsWith('division');
        isRegionUser = trimmedLower.contains('region') &&
            !trimmedLower.endsWith('division');
        isComprehensiveUser = isDivisionUser || isRegionUser;

        print('🔍 getUserOfficeInfo: Direct division check: $isDivisionUser');
        print('🔍 getUserOfficeInfo: Direct region check: $isRegionUser');
        print(
            '🔍 getUserOfficeInfo: Comprehensive user (division OR region): $isComprehensiveUser');
        print(
            '🔍 getUserOfficeInfo: Office trimmed lowercase: "$trimmedLower"');
        print('🔍 getUserOfficeInfo: Ends with "division": $isDivisionUser');
        print('🔍 getUserOfficeInfo: Contains "region": $isRegionUser');
      }

      if (officeName == null) {
        return {
          'officeName': null,
          'isDivisionUser': false,
          'accessLevel': 'none',
          'reportType': 'none',
          'description': 'No office information available',
        };
      }

      String accessLevel;
      String reportType;
      String description;

      if (isComprehensiveUser) {
        if (isDivisionUser) {
          accessLevel = 'division';
        } else if (isRegionUser) {
          accessLevel = 'region';
        } else {
          accessLevel = 'comprehensive';
        }
        reportType = 'comprehensive';
        description =
            'Report Screen 1: Summary + Submissions + Table View tabs with multi-level office hierarchy data';
      } else {
        accessLevel = 'office';
        reportType = 'simple';
        description =
            'Report Screen 2: Table View only with office-specific data';
      }

      print(
          '🔍 getUserOfficeInfo: Final result: {officeName: $officeName, isDivisionUser: $isDivisionUser, accessLevel: $accessLevel, reportType: $reportType}');

      return {
        'officeName': officeName,
        'isDivisionUser':
            isComprehensiveUser, // Changed to use comprehensive user flag
        'isRegionUser': isRegionUser,
        'isComprehensiveUser': isComprehensiveUser,
        'accessLevel': accessLevel,
        'reportType': reportType,
        'description': description,
      };
    } catch (error) {
      print('❌ ReportsRoutingService: Error getting office info: $error');
      return {
        'officeName': null,
        'isDivisionUser': false,
        'accessLevel': 'error',
        'reportType': 'simple',
        'description': 'Error loading office information',
      };
    }
  }

  /// Clears the cache (useful for testing or when user data changes)
  static void clearCache() {
    _cachedUserOffice = null;
    _cachedIsDivisionUser = null;
    _cacheTimestamp = null;
    print('🗑️ ReportsRoutingService: Cache cleared');
  }

  /// Checks if the cached data is still valid
  static bool _isCacheValid() {
    if (_cacheTimestamp == null) {
      return false;
    }

    final now = DateTime.now();
    final difference = now.difference(_cacheTimestamp!);
    return difference < _cacheExpiry;
  }

  /// Gets a human-readable description of the user's report access
  static Future<String> getAccessDescription() async {
    try {
      final officeInfo = await getUserOfficeInfo();
      final officeName = officeInfo['officeName'] as String?;
      final isDivisionUser = officeInfo['isDivisionUser'] as bool;

      if (officeName == null) {
        return 'No office information available';
      }

      if (isDivisionUser) {
        return 'Division-level access: You can view Report Screen 1 with comprehensive reports including Summary, Submissions, and Table View tabs with multi-level office hierarchy data.';
      } else {
        return 'Office-level access: You can view Report Screen 2 with Table View only containing data specific to your office ($officeName).';
      }
    } catch (error) {
      return 'Error determining access level';
    }
  }

  /// Logs detailed information about the user's report access (for debugging)
  static Future<void> logUserAccessInfo() async {
    try {
      print('📋 === ReportsRoutingService: User Access Information ===');

      final officeInfo = await getUserOfficeInfo();

      print('📋 Office Name: ${officeInfo['officeName']}');
      print('📋 Is Division User: ${officeInfo['isDivisionUser']}');
      print('📋 Access Level: ${officeInfo['accessLevel']}');
      print('📋 Report Type: ${officeInfo['reportType']}');
      print('📋 Description: ${officeInfo['description']}');

      final accessDescription = await getAccessDescription();
      print('📋 Access Description: $accessDescription');

      print('📋 === End User Access Information ===');
    } catch (error) {
      print('❌ ReportsRoutingService: Error logging access info: $error');
    }
  }
}
