import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import './reports_routing_service.dart';

class DivisionNotificationService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static final FirebaseAuth _auth = FirebaseAuth.instance;
  static final SupabaseClient _supabase = Supabase.instance.client;

  /// Initialize division-specific notification monitoring
  static Future<void> initialize() async {
    try {
      print('🏢 DivisionNotificationService: Initializing...');

      // Check if current user is a division user
      final isDivisionUser =
          await ReportsRoutingService.shouldShowComprehensiveReports();

      if (isDivisionUser) {
        print(
            '✅ DivisionNotificationService: User is division-level, setting up monitoring');
        await _setupDivisionMonitoring();
      } else {
        print(
            'ℹ️ DivisionNotificationService: User is not division-level, skipping setup');
      }
    } catch (error) {
      print('❌ DivisionNotificationService: Initialization error: $error');
    }
  }

  /// Set up monitoring for division users
  static Future<void> _setupDivisionMonitoring() async {
    try {
      // Monitor new form submissions from offices under this division
      _monitorFormSubmissions();

      // Monitor pending forms that need attention
      _monitorPendingForms();

      // Set up periodic checks for overdue forms
      _setupOverdueFormChecks();

      print('✅ DivisionNotificationService: Monitoring setup complete');
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error setting up monitoring: $error');
    }
  }

  /// Monitor new form submissions from offices under this division
  static void _monitorFormSubmissions() {
    try {
      print(
          '📊 DivisionNotificationService: Setting up form submission monitoring');

      // Listen to dynamic_form_submissions table for new submissions
      _supabase
          .from('dynamic_form_submissions')
          .stream(primaryKey: ['id'])
          .order('submitted_at', ascending: false)
          .listen((data) async {
            await _handleNewSubmissions(data);
          });

      print('✅ DivisionNotificationService: Form submission monitoring active');
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error setting up submission monitoring: $error');
    }
  }

  /// Handle new form submissions
  static Future<void> _handleNewSubmissions(
      List<Map<String, dynamic>> submissions) async {
    try {
      final userOfficeInfo = await ReportsRoutingService.getUserOfficeInfo();
      final userOfficeName = userOfficeInfo['officeName'] as String?;

      if (userOfficeName == null) return;

      // Get offices under this division
      final divisionOffices = await _getOfficesUnderDivision(userOfficeName);

      for (final submission in submissions) {
        final submissionOffice = submission['office_name'] as String?;
        final submissionTime = submission['submitted_at'] as String?;

        if (submissionOffice != null &&
            divisionOffices.contains(submissionOffice) &&
            _isRecentSubmission(submissionTime)) {
          await _createSubmissionNotification(submission);
        }
      }
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error handling new submissions: $error');
    }
  }

  /// Check if submission is recent (within last 5 minutes)
  static bool _isRecentSubmission(String? submissionTime) {
    if (submissionTime == null) return false;

    try {
      final submittedAt = DateTime.parse(submissionTime);
      final now = DateTime.now();
      final difference = now.difference(submittedAt);

      return difference.inMinutes <= 5;
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error parsing submission time: $error');
      return false;
    }
  }

  /// Create notification for new form submission
  static Future<void> _createSubmissionNotification(
      Map<String, dynamic> submission) async {
    try {
      final user = _auth.currentUser;
      if (user == null) return;

      final formTitle = submission['form_title'] as String? ?? 'Unknown Form';
      final officeName =
          submission['office_name'] as String? ?? 'Unknown Office';
      final employeeName =
          submission['employee_name'] as String? ?? 'Unknown Employee';

      await _firestore.collection('user_notifications').add({
        'userId': user.uid,
        'title': 'New Form Submission',
        'body': '$employeeName from $officeName submitted $formTitle',
        'data': {
          'type': 'form_submission',
          'formId': submission['form_identifier'],
          'submissionId': submission['id'],
          'officeName': officeName,
          'screen': 'reports',
        },
        'receivedAt': FieldValue.serverTimestamp(),
        'isRead': false,
        'type': 'form_submission',
        'priority': 'normal',
      });

      print(
          '✅ DivisionNotificationService: Created submission notification for $formTitle');
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error creating submission notification: $error');
    }
  }

  /// Monitor pending forms that need attention
  static void _monitorPendingForms() {
    try {
      print(
          '⏳ DivisionNotificationService: Setting up pending forms monitoring');

      // Check for pending forms every hour
      Stream.periodic(const Duration(hours: 1)).listen((_) async {
        await _checkPendingForms();
      });

      // Initial check
      _checkPendingForms();

      print('✅ DivisionNotificationService: Pending forms monitoring active');
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error setting up pending forms monitoring: $error');
    }
  }

  /// Check for pending forms and create notifications
  static Future<void> _checkPendingForms() async {
    try {
      print('🔍 DivisionNotificationService: Checking pending forms...');

      final userOfficeInfo = await ReportsRoutingService.getUserOfficeInfo();
      final userOfficeName = userOfficeInfo['officeName'] as String?;

      if (userOfficeName == null) return;

      // Get offices under this division
      final divisionOffices = await _getOfficesUnderDivision(userOfficeName);

      // Get pending forms for each office
      for (final officeName in divisionOffices) {
        final pendingCount = await _getPendingFormsCount(officeName);

        if (pendingCount > 0) {
          await _createPendingFormsNotification(officeName, pendingCount);
        }
      }

      print('✅ DivisionNotificationService: Pending forms check complete');
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error checking pending forms: $error');
    }
  }

  /// Get count of pending forms for an office
  static Future<int> _getPendingFormsCount(String officeName) async {
    try {
      // Get assigned forms for this office
      final assignedResponse = await _supabase
          .from('page_configurations')
          .select('id, title, selected_offices');

      final assignedForms = <String>[];
      for (final config in assignedResponse) {
        final selectedOffices = config['selected_offices'] as List<dynamic>?;
        if (selectedOffices != null && selectedOffices.contains(officeName)) {
          assignedForms.add(config['id'] as String);
        }
      }

      // Get completed forms for this office
      final completedResponse = await _supabase
          .from('dynamic_form_submissions')
          .select('form_identifier')
          .eq('office_name', officeName);

      final completedFormIds = completedResponse
          .map((submission) => submission['form_identifier'] as String)
          .toSet();

      // Calculate pending count
      final pendingCount = assignedForms
          .where((formId) => !completedFormIds.contains(formId))
          .length;

      return pendingCount;
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error getting pending forms count: $error');
      return 0;
    }
  }

  /// Create notification for pending forms
  static Future<void> _createPendingFormsNotification(
      String officeName, int pendingCount) async {
    try {
      final user = _auth.currentUser;
      if (user == null) return;

      // Check if we already sent a notification for this office today
      final today = DateTime.now();
      final todayStart = DateTime(today.year, today.month, today.day);

      // Use simpler query to avoid index requirements
      final existingNotification = await _firestore
          .collection('user_notifications')
          .where('userId', isEqualTo: user.uid)
          .where('type', isEqualTo: 'pending_forms')
          .get();

      // Filter by date and office name in memory
      final todayNotifications = existingNotification.docs.where((doc) {
        final data = doc.data();
        final receivedAt = data['receivedAt'] as Timestamp?;
        final dataOfficeName = data['data']?['officeName'] as String?;

        if (receivedAt == null || dataOfficeName != officeName) return false;

        final receivedDate = receivedAt.toDate();
        return receivedDate.isAfter(todayStart);
      });

      if (todayNotifications.isNotEmpty) {
        print(
            'ℹ️ DivisionNotificationService: Pending forms notification already sent today for $officeName');
        return;
      }

      await _firestore.collection('user_notifications').add({
        'userId': user.uid,
        'title': 'Pending Forms Alert',
        'body':
            '$officeName has $pendingCount pending form${pendingCount > 1 ? 's' : ''} to complete',
        'data': {
          'type': 'pending_forms',
          'officeName': officeName,
          'pendingCount': pendingCount,
          'screen': 'pending_forms',
        },
        'receivedAt': FieldValue.serverTimestamp(),
        'isRead': false,
        'type': 'pending_forms',
        'priority': 'high',
      });

      print(
          '✅ DivisionNotificationService: Created pending forms notification for $officeName');
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error creating pending forms notification: $error');
    }
  }

  /// Set up periodic checks for overdue forms
  static void _setupOverdueFormChecks() {
    try {
      print('⏰ DivisionNotificationService: Setting up overdue forms checks');

      // Check for overdue forms daily at 9 AM
      Stream.periodic(const Duration(hours: 24)).listen((_) async {
        final now = DateTime.now();
        if (now.hour == 9) {
          await _checkOverdueForms();
        }
      });

      print('✅ DivisionNotificationService: Overdue forms checks scheduled');
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error setting up overdue checks: $error');
    }
  }

  /// Check for overdue forms
  static Future<void> _checkOverdueForms() async {
    try {
      print('⏰ DivisionNotificationService: Checking overdue forms...');

      final userOfficeInfo = await ReportsRoutingService.getUserOfficeInfo();
      final userOfficeName = userOfficeInfo['officeName'] as String?;

      if (userOfficeName == null) return;

      // Get offices under this division
      final divisionOffices = await _getOfficesUnderDivision(userOfficeName);

      // Check each office for overdue forms
      for (final officeName in divisionOffices) {
        await _checkOfficeOverdueForms(officeName);
      }

      print('✅ DivisionNotificationService: Overdue forms check complete');
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error checking overdue forms: $error');
    }
  }

  /// Check overdue forms for a specific office
  static Future<void> _checkOfficeOverdueForms(String officeName) async {
    try {
      // Get forms with daily frequency that haven't been submitted today
      final today = DateTime.now();
      final todayStart = DateTime(today.year, today.month, today.day);

      final dailyFormsResponse = await _supabase
          .from('page_configurations')
          .select('id, title, selected_offices, selectedFrequency')
          .eq('selectedFrequency', 'Daily');

      final overdueForms = <String>[];

      for (final config in dailyFormsResponse) {
        final selectedOffices = config['selected_offices'] as List<dynamic>?;
        if (selectedOffices != null && selectedOffices.contains(officeName)) {
          final formId = config['id'] as String;

          // Check if this form was submitted today
          final todaySubmission = await _supabase
              .from('dynamic_form_submissions')
              .select('id')
              .eq('form_identifier', formId)
              .eq('office_name', officeName)
              .gte('submitted_at', todayStart.toIso8601String())
              .limit(1);

          if (todaySubmission.isEmpty) {
            overdueForms.add(config['title'] as String? ?? formId);
          }
        }
      }

      if (overdueForms.isNotEmpty) {
        await _createOverdueFormsNotification(officeName, overdueForms);
      }
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error checking office overdue forms: $error');
    }
  }

  /// Create notification for overdue forms
  static Future<void> _createOverdueFormsNotification(
      String officeName, List<String> overdueForms) async {
    try {
      final user = _auth.currentUser;
      if (user == null) return;

      final formsList = overdueForms.join(', ');

      await _firestore.collection('user_notifications').add({
        'userId': user.uid,
        'title': 'Overdue Forms Alert',
        'body': '$officeName has overdue forms: $formsList',
        'data': {
          'type': 'overdue_forms',
          'officeName': officeName,
          'overdueForms': overdueForms,
          'screen': 'pending_forms',
        },
        'receivedAt': FieldValue.serverTimestamp(),
        'isRead': false,
        'type': 'overdue_forms',
        'priority': 'urgent',
      });

      print(
          '✅ DivisionNotificationService: Created overdue forms notification for $officeName');
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error creating overdue forms notification: $error');
    }
  }

  /// Get offices under this division
  static Future<List<String>> _getOfficesUnderDivision(
      String divisionName) async {
    try {
      // Query Supabase offices table directly
      final response = await _supabase
          .from('offices')
          .select('Office name, Reporting Office Nam')
          .eq('Reporting Office Nam', divisionName);

      final offices = <String>[];

      for (final office in response) {
        final officeName = office['Office name'] as String?;
        if (officeName != null) {
          offices.add(officeName);
        }
      }

      print(
          '🏢 DivisionNotificationService: Found ${offices.length} offices under $divisionName');
      return offices;
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error getting division offices: $error');
      return [];
    }
  }

  /// Send system announcement to all division users
  static Future<void> sendSystemAnnouncement({
    required String title,
    required String message,
    String priority = 'normal',
  }) async {
    try {
      print('📢 DivisionNotificationService: Sending system announcement');

      // Get all division users
      final divisionUsers = await _getDivisionUsers();

      for (final userId in divisionUsers) {
        await _firestore.collection('user_notifications').add({
          'userId': userId,
          'title': title,
          'body': message,
          'data': {
            'type': 'system_announcement',
            'priority': priority,
            'screen': 'notifications',
          },
          'receivedAt': FieldValue.serverTimestamp(),
          'isRead': false,
          'type': 'system_announcement',
          'priority': priority,
        });
      }

      print(
          '✅ DivisionNotificationService: System announcement sent to ${divisionUsers.length} division users');
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error sending system announcement: $error');
    }
  }

  /// Get all division users
  static Future<List<String>> _getDivisionUsers() async {
    try {
      final snapshot = await _firestore
          .collection('employees')
          .where('officeName', isGreaterThanOrEqualTo: '')
          .get();

      final divisionUsers = <String>[];

      for (final doc in snapshot.docs) {
        final data = doc.data();
        final officeName = data['officeName'] as String?;

        if (officeName != null &&
            officeName.toLowerCase().endsWith('division')) {
          divisionUsers.add(doc.id);
        }
      }

      return divisionUsers;
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error getting division users: $error');
      return [];
    }
  }

  /// Send test notification to current user (for testing purposes)
  static Future<void> sendTestNotification() async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        print(
            '❌ DivisionNotificationService: No user logged in for test notification');
        return;
      }

      print('🧪 DivisionNotificationService: Sending test notification');

      await _firestore.collection('user_notifications').add({
        'userId': user.uid,
        'title': 'Test Notification',
        'body':
            'This is a test notification for division users. The notification service is working correctly!',
        'data': {
          'type': 'system_announcement',
          'priority': 'normal',
          'screen': 'notifications',
        },
        'receivedAt': FieldValue.serverTimestamp(),
        'isRead': false,
        'type': 'system_announcement',
        'priority': 'normal',
      });

      print(
          '✅ DivisionNotificationService: Test notification sent successfully');
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error sending test notification: $error');
    }
  }

  /// Create a sample form submission notification for testing
  static Future<void> sendTestFormSubmissionNotification() async {
    try {
      final user = _auth.currentUser;
      if (user == null) return;

      await _firestore.collection('user_notifications').add({
        'userId': user.uid,
        'title': 'New Form Submission',
        'body': 'John Doe from Test Office submitted Daily Report Form',
        'data': {
          'type': 'form_submission',
          'formId': 'test_form_123',
          'submissionId': 'test_submission_456',
          'officeName': 'Test Office',
          'screen': 'reports',
        },
        'receivedAt': FieldValue.serverTimestamp(),
        'isRead': false,
        'type': 'form_submission',
        'priority': 'normal',
      });

      print(
          '✅ DivisionNotificationService: Test form submission notification sent');
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error sending test form submission notification: $error');
    }
  }

  /// Create a sample pending forms notification for testing
  static Future<void> sendTestPendingFormsNotification() async {
    try {
      final user = _auth.currentUser;
      if (user == null) return;

      await _firestore.collection('user_notifications').add({
        'userId': user.uid,
        'title': 'Pending Forms Alert',
        'body': 'Test Office has 3 pending forms to complete',
        'data': {
          'type': 'pending_forms',
          'officeName': 'Test Office',
          'pendingCount': 3,
          'screen': 'pending_forms',
        },
        'receivedAt': FieldValue.serverTimestamp(),
        'isRead': false,
        'type': 'pending_forms',
        'priority': 'high',
      });

      print(
          '✅ DivisionNotificationService: Test pending forms notification sent');
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error sending test pending forms notification: $error');
    }
  }

  /// Send notification to all users
  static Future<void> sendNotificationToAll(
      String title, String message) async {
    try {
      print(
          '📢 DivisionNotificationService: Sending notification to all users');

      // Get all users from Firebase employees collection
      final snapshot = await _firestore.collection('employees').get();

      for (final doc in snapshot.docs) {
        await _firestore.collection('user_notifications').add({
          'userId': doc.id,
          'title': title,
          'body': message,
          'data': {
            'type': 'system_announcement',
            'priority': 'normal',
            'screen': 'notifications',
          },
          'receivedAt': FieldValue.serverTimestamp(),
          'isRead': false,
          'type': 'system_announcement',
          'priority': 'normal',
        });
      }

      print(
          '✅ DivisionNotificationService: Notification sent to ${snapshot.docs.length} users');
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error sending notification to all: $error');
    }
  }

  /// Send notification to specific office
  static Future<void> sendNotificationToOffice(
      String officeName, String title, String message) async {
    try {
      print(
          '📢 DivisionNotificationService: Sending notification to $officeName');

      // Get users from the specific office
      final snapshot = await _firestore
          .collection('employees')
          .where('officeName', isEqualTo: officeName)
          .get();

      for (final doc in snapshot.docs) {
        await _firestore.collection('user_notifications').add({
          'userId': doc.id,
          'title': title,
          'body': message,
          'data': {
            'type': 'office_announcement',
            'officeName': officeName,
            'priority': 'normal',
            'screen': 'notifications',
          },
          'receivedAt': FieldValue.serverTimestamp(),
          'isRead': false,
          'type': 'office_announcement',
          'priority': 'normal',
        });
      }

      print(
          '✅ DivisionNotificationService: Notification sent to ${snapshot.docs.length} users in $officeName');
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error sending notification to office: $error');
    }
  }

  /// Send notification to offices with pending forms
  static Future<void> sendNotificationToPendingOffices(
      String title, String message) async {
    try {
      print(
          '📢 DivisionNotificationService: Sending notification to pending offices');

      final pendingOffices = await getPendingOffices();

      for (final officeName in pendingOffices) {
        await sendNotificationToOffice(officeName, title, message);
      }

      print(
          '✅ DivisionNotificationService: Notification sent to ${pendingOffices.length} pending offices');
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error sending notification to pending offices: $error');
    }
  }

  /// Get list of offices with pending forms
  static Future<List<String>> getPendingOffices() async {
    try {
      final userOfficeInfo = await ReportsRoutingService.getUserOfficeInfo();
      final userOfficeName = userOfficeInfo['officeName'] as String?;

      if (userOfficeName == null) return [];

      // Get offices under this division
      final divisionOffices = await _getOfficesUnderDivision(userOfficeName);
      final pendingOffices = <String>[];

      // Check each office for pending forms
      for (final officeName in divisionOffices) {
        final pendingCount = await _getPendingFormsCount(officeName);
        if (pendingCount > 0) {
          pendingOffices.add(officeName);
        }
      }

      return pendingOffices;
    } catch (error) {
      print(
          '❌ DivisionNotificationService: Error getting pending offices: $error');
      return [];
    }
  }
}
