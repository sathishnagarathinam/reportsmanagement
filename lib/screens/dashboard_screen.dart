import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import './data_entry_screen.dart'; // Import the new screen
import './reports_wrapper_screen.dart'; // Import the reports wrapper screen

import './file_upload_screen.dart'; // Import the file upload screen
import './favorites_screen.dart'; // Import the favorites screen
import './search_results_screen.dart'; // Import the search results screen
import './status_screen.dart'; // Import the status screen
import './pending_forms_screen.dart'; // Import the pending forms screen
import './notifications_screen.dart'; // Import the notifications screen
import '../services/notification_service.dart'; // Import notification service
import '../services/reports_routing_service.dart'; // Import reports routing service
import 'package:cloud_firestore/cloud_firestore.dart'; // Add this import
import 'package:intl/intl.dart'; // Add this import for DateFormat
import 'package:supabase_flutter/supabase_flutter.dart'; // Add this import
import 'package:firebase_auth/firebase_auth.dart'
    as firebase_auth; // Add this import
import 'package:mobile_app_flutter/screens/calendar_todo_screen.dart'; // Import the new calendar screen
import 'dart:io';

class DashboardScreen extends StatefulWidget {
  final VoidCallback? onNavigateToDataEntry; // Add this line

  const DashboardScreen(
      {super.key, this.onNavigateToDataEntry}); // Modify this line

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}
// Add this import

// Add this class after _DashboardScreenState or in a separate file
class _WavePainter extends CustomPainter {
  final Color color;

  _WavePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    // First wave (larger, lighter)
    final path1 = Path();
    path1.moveTo(0, size.height * 0.5);
    path1.quadraticBezierTo(size.width * 0.15, size.height * 0.3,
        size.width * 0.4, size.height * 0.55);
    path1.quadraticBezierTo(
        size.width * 0.7, size.height * 0.85, size.width, size.height * 0.6);
    path1.lineTo(size.width, 0);
    path1.lineTo(0, 0);
    path1.close();
    canvas.drawPath(
        path1, paint..color = color.withOpacity(0.3)); // Lighter shade

    // Second wave (smaller, darker)
    final path2 = Path();
    path2.moveTo(0, size.height * 0.65);
    path2.quadraticBezierTo(size.width * 0.25, size.height * 0.5,
        size.width * 0.55, size.height * 0.7);
    path2.quadraticBezierTo(
        size.width * 0.85, size.height * 0.95, size.width, size.height * 0.75);
    path2.lineTo(size.width, 0);
    path2.lineTo(0, 0);
    path2.close();
    canvas.drawPath(
        path2, paint..color = color.withOpacity(0.6)); // Darker shade
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) {
    return false;
  }
}

class _DashboardScreenState extends State<DashboardScreen> {
  String _employeeName = 'Loading...'; // Initialize with loading state
  String _officeName = 'Loading...'; // Add state variable for office name
  int _selectedIndex = 0; // Add state variable for selected index
  int _pendingFormsCount = 0;
  bool _loadingPendingForms = true;

  @override
  void initState() {
    super.initState();
    _fetchUserData(); // Call the fetch method
    _loadPendingFormsCount(); // Load pending forms count
  }

  Future<void> _fetchUserData() async {
    try {
      firebase_auth.User? user =
          firebase_auth.FirebaseAuth.instance.currentUser;
      if (user != null) {
        DocumentSnapshot userDoc = await FirebaseFirestore.instance
            .collection('employees') // Using the 'employees' collection
            .doc(user.uid)
            .get();

        if (userDoc.exists) {
          setState(() {
            _employeeName = userDoc['name'] ??
                'N/A'; // Using 'name' field for employee name
            _officeName = userDoc['officeName'] ??
                'N/A'; // Changed from 'Office name' to 'officeName'
          });
        } else {
          setState(() {
            _employeeName = 'Employee data not found';
            _officeName = 'N/A';
          });
        }
      } else {
        setState(() {
          _employeeName = 'User not logged in';
          _officeName = 'N/A';
        });
      }
    } catch (e) {
      print('Error fetching employee data: $e');
      setState(() {
        _employeeName = 'Error loading name';
        _officeName = 'Error loading office';
      });
    }
  }

  // Remove _onItemTapped method as it's now managed by MainScreen
  // void _onItemTapped(int index) { ... }

  Future<void> _loadPendingFormsCount() async {
    try {
      setState(() {
        _loadingPendingForms = true;
      });

      // Get current user's office
      final userOffice = await _getUserOffice();
      if (userOffice == null) {
        setState(() {
          _pendingFormsCount = 0;
          _loadingPendingForms = false;
        });
        return;
      }

      final supabase = Supabase.instance.client;

      // Get all form configurations from page_configurations table
      final response = await supabase
          .from('page_configurations')
          .select('id, title, selected_offices');

      final allFormConfigs = response as List<dynamic>;
      final assignedForms = <Map<String, dynamic>>[];

      // Filter forms assigned to this office
      for (final formConfig in allFormConfigs) {
        final selectedOffices =
            formConfig['selected_offices'] as List<dynamic>?;

        if (selectedOffices != null && selectedOffices.isNotEmpty) {
          // Check if this office is in the selected_offices list
          final isAssigned = selectedOffices.any((office) =>
              office.toString().toLowerCase().trim() ==
              userOffice.toLowerCase().trim());

          if (isAssigned) {
            assignedForms.add({
              'id': formConfig['id'],
              'title': formConfig['title'],
              'form_identifier': formConfig['id'],
            });
          }
        } else {
          // Forms with no office restrictions are assigned to all offices
          assignedForms.add({
            'id': formConfig['id'],
            'title': formConfig['title'],
            'form_identifier': formConfig['id'],
          });
        }
      }

      // Get completed submissions for this office
      final submissionsResponse = await supabase
          .from('dynamic_form_submissions')
          .select('form_identifier, submission_data')
          .order('created_at', ascending: false);

      final allSubmissions = submissionsResponse as List<dynamic>;
      final completedFormIds = <String>{};

      // Find completed forms for this office
      for (final submission in allSubmissions) {
        final submissionData =
            submission['submission_data'] as Map<String, dynamic>?;
        if (submissionData == null) continue;

        // Check if submission belongs to user's office using same logic as status screen
        final submissionOffice = _extractOfficeFromSubmission(submissionData);
        if (submissionOffice != null &&
            submissionOffice.toLowerCase() == userOffice.toLowerCase()) {
          // Check if submission is completed using same logic as status screen
          final isCompleted = _isSubmissionCompleted(submissionData);
          if (isCompleted) {
            completedFormIds.add(submission['form_identifier']);
          }
        }
      }

      // Calculate pending forms (assigned forms - completed forms)
      final pendingCount = assignedForms.where((form) {
        final formId = form['form_identifier'];
        return !completedFormIds.contains(formId);
      }).length;

      setState(() {
        _pendingFormsCount = pendingCount;
        _loadingPendingForms = false;
      });

      print(
          '📊 Dashboard: Pending forms count: $pendingCount (Assigned: ${assignedForms.length}, Completed: ${completedFormIds.length})');
    } catch (error) {
      print('❌ Dashboard: Error loading pending forms count: $error');
      setState(() {
        _pendingFormsCount = 0;
        _loadingPendingForms = false;
      });
    }
  }

  Future<String?> _getUserOffice() async {
    try {
      final user = firebase_auth.FirebaseAuth.instance.currentUser;
      if (user == null) return null;

      // Try to get office from Firebase first
      final firebaseDoc = await FirebaseFirestore.instance
          .collection('employees')
          .doc(user.uid)
          .get();

      if (firebaseDoc.exists) {
        final data = firebaseDoc.data();
        final officeName = data?['officeName'] as String?;
        if (officeName != null && officeName.isNotEmpty) {
          return officeName;
        }
      }

      // Fallback to Supabase
      final supabase = Supabase.instance.client;
      final response = await supabase
          .from('user_profiles')
          .select('officeName')
          .eq('id', user.uid)
          .single();

      return response['officeName'] as String?;
    } catch (error) {
      print('❌ Dashboard: Error getting user office: $error');
      return null;
    }
  }

  String? _extractOfficeFromSubmission(Map<String, dynamic> submissionData) {
    // Use the same logic as status screen
    String? foundOffice;

    for (final entry in submissionData.entries) {
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

    return foundOffice;
  }

  bool _isSubmissionCompleted(Map<String, dynamic> submissionData) {
    // Use the same logic as status screen
    final meaningfulFields = submissionData.entries.where((entry) {
      final value = entry.value;
      final key = entry.key;

      if (value == null || value.toString().trim().isEmpty) return false;

      if (key.toLowerCase().contains('timestamp') ||
          key.toLowerCase().contains('created') ||
          key.toLowerCase().contains('updated') ||
          key.toLowerCase().contains('id') ||
          key.toLowerCase().contains('user_id') ||
          key.toLowerCase().contains('form_identifier')) return false;

      if (value.toString().trim().length < 2) return false;

      return true;
    }).length;

    return meaningfulFields >= 2;
  }

  Future<void> _refreshDashboard() async {
    print('🔄 Dashboard: Starting refresh...');

    // Show loading state for pending forms
    setState(() {
      _loadingPendingForms = true;
    });

    try {
      // Refresh user data and pending forms count in parallel
      await Future.wait([
        _fetchUserData(),
        _loadPendingFormsCount(),
      ]);

      print('✅ Dashboard: Refresh completed successfully');
    } catch (error) {
      print('❌ Dashboard: Error during refresh: $error');

      // Show error message to user
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to refresh: $error'),
            backgroundColor: Colors.red,
            action: SnackBarAction(
              label: 'Retry',
              textColor: Colors.white,
              onPressed: _refreshDashboard,
            ),
            duration: const Duration(seconds: 4),
          ),
        );
      }
    }
  }

  void _showSettingsBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.4,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(20),
          ),
        ),
        child: Column(
          children: [
            // Handle bar
            Container(
              margin: const EdgeInsets.only(top: 8),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            // Title
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'Settings',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).primaryColor,
                ),
              ),
            ),

            // Settings options
            Expanded(
              child: ListView(
                children: [
                  ListTile(
                    leading: Icon(
                      Icons.info_outline,
                      color: Theme.of(context).primaryColor,
                    ),
                    title: const Text('About'),
                    subtitle: const Text('App information and version'),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () {
                      Navigator.pop(context);
                      _showAboutDialog(context);
                    },
                  ),
                  const Divider(),
                  ListTile(
                    leading: Icon(
                      Icons.help_outline,
                      color: Theme.of(context).primaryColor,
                    ),
                    title: const Text('Help & Support'),
                    subtitle: const Text('Get help and contact support'),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () {
                      Navigator.pop(context);
                      _showHelpDialog(context);
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAboutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('About'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Wester Region Report Management System'),
            SizedBox(height: 8),
            Text('Version: 1.0.0'),
            SizedBox(height: 8),
            Text('Developed for India Post Western Region'),
            SizedBox(height: 8),
            Text('© 2025 All rights reserved'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showHelpDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Help & Support'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Need help?'),
            SizedBox(height: 8),
            Text('• Feedback: sathishsat04@gmail.com'),
            Text('• Email: sathishsat04@gmail.com'),
            SizedBox(height: 8),
            Text(
                'For any changes or requirement, please contact sathishsat04@gmail.com'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context)
          .scaffoldBackgroundColor, // Add a color here, e.g., the default scaffold background color
      child: RefreshIndicator(
        onRefresh: _refreshDashboard,
        color: Theme.of(context).primaryColor,
        backgroundColor: Colors.white,
        child: SingleChildScrollView(
          physics:
              const AlwaysScrollableScrollPhysics(), // Ensure scrolling is always enabled for pull-to-refresh
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              // Section 1: Custom App Bar Area
              _buildCustomAppBar(context),

              // Section 2: Horizontal Cards (Data Entry, Reports, Status)
              _buildHorizontalCards(context), // Pass context here

              // Title: Reports Management System
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16.0, vertical: 1.0),
                child: Center(
                  child: Text(
                    'Reports Management System',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).primaryColor,
                    ),
                  ),
                ),
              ),

              // Section 3: Search Bar
              _buildSearchBar(context), // Pass context here

              // Section 4: Promotional Banner
              _buildPromotionBanner(context), // Pass context here

              // Additional spacing between search/banner and dashboard grid
              const SizedBox(
                  height:
                      24.0), // Increased spacing for better visual separation

              // Section 5: Grid of Dashboard Items
              _buildDashboardGrid(context), // Pass context here
            ],
          ),
        ),
      ),
    );
    // Remove the bottomNavigationBar property from here
  }

  Widget _buildCustomAppBar(BuildContext context) {
    return Stack(
      clipBehavior:
          Clip.none, // Allows children to overflow the Stack's bounds if needed
      children: <Widget>[
        // Background with a curve (main solid color)
        Container(
          height:
              300, // Adjusted height to make space for waves to be more visible
          decoration: BoxDecoration(
            color: Theme.of(context).primaryColor, // Your primary color
            borderRadius: const BorderRadius.only(
              bottomLeft: Radius.circular(30),
              bottomRight: Radius.circular(30),
            ),
          ),
        ),
        // Wave/Blob Shapes using CustomPainter
        Positioned.fill(
          child: ClipRRect(
            borderRadius: const BorderRadius.only(
              bottomLeft: Radius.circular(30),
              bottomRight: Radius.circular(30),
            ),
            child: CustomPaint(
              painter: _WavePainter(
                  color:
                      Colors.white), // Using white for waves, adjust as needed
              child: Container(), // CustomPaint needs a child, even if empty
            ),
          ),
        ),
        // Indiapost Logo
        Positioned(
          top: 40, // Adjust this value to move the logo up or down
          left: 0,
          right: 0,
          child: Center(
            child: Image.asset(
              'assets/images/Indiapost_Logo.png', // Path to your logo
              height: 100, // Minimum size for the logo
              width: 100, // Minimum size for the logo
            ),
          ),
        ),
        // Content (Hello, Name, Avatar)
        Positioned(
          top: 80, // Adjust top padding (status bar height + desired padding)
          left: 16,
          right: 16,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Hello,',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    _employeeName, // Display fetched employee name
                    style: TextStyle(
                      fontSize: 20,
                      color: Colors.white70,
                    ),
                  ),
                  SizedBox(height: 8), // Spacing below employee name
                  Text(
                    '${_officeName}', // Display fetched office name
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.white54,
                    ),
                  ),
                  SizedBox(height: 16), // Spacing below office name
                  SizedBox(height: 8), // Add this line to move the date down
                  InkWell(
                    // Wrap Text with InkWell to make it clickable
                    onTap: () async {
                      final DateTime? pickedDate = await showDatePicker(
                        context: context,
                        initialDate: DateTime.now(),
                        firstDate: DateTime(2000),
                        lastDate: DateTime(2101),
                      );
                      // You can optionally do something with the pickedDate here
                      // For now, it just shows the picker.
                    },
                    child: Text(
                      _getCurrentDateTime(), // Function to get formatted date
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
              CircleAvatar(
                radius: 40,
                backgroundColor: Colors.white,
                child: Text(
                  _employeeName.isNotEmpty
                      ? _employeeName[0].toUpperCase()
                      : '?',
                  style: TextStyle(
                    fontSize: 36,
                    color: Theme.of(context).primaryColor,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _getCurrentDateTime() {
    final now = DateTime.now();
    // Format only the date
    final formatter = DateFormat('EEEE, MMMM d, yyyy');
    return formatter.format(now);
  }

  // Move these methods inside the _DashboardScreenState class
  Widget _buildHorizontalCards(BuildContext context) {
    return Transform.translate(
      offset: const Offset(0, -30),
      child: Padding(
        padding: const EdgeInsets.symmetric(
            horizontal: 20.0), // Increased padding for better spacing
        child: Row(
          mainAxisAlignment: MainAxisAlignment
              .spaceBetween, // Changed from spaceAround for better distribution
          children: [
            Expanded(
              child: _buildProfessionalInfoCard(
                context,
                'Data Entry',
                Icons.edit_note_rounded, // More modern rounded icon
                Colors.blue.shade600,
                Colors.blue.shade50,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => const DataEntryScreen()),
                  );
                },
              ),
            ),
            const SizedBox(width: 12.0), // Increased spacing between cards
            Expanded(
              child: _buildProfessionalInfoCard(
                context,
                'Reports',
                Icons.analytics_rounded, // More professional analytics icon
                Colors.green.shade600,
                Colors.green.shade50,
                onTap: () async {
                  print('🔥 Dashboard: Reports card tapped');
                  print('🔥 Dashboard: Navigating to ReportsWrapperScreen');

                  Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => const ReportsWrapperScreen()),
                  );
                },
              ),
            ),
            const SizedBox(width: 12.0), // Increased spacing between cards
            Expanded(
              child: _buildProfessionalInfoCard(
                context,
                'Status',
                Icons.track_changes_rounded, // More modern status icon
                Colors.orange.shade600,
                Colors.orange.shade50,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const StatusScreen(),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfessionalInfoCard(BuildContext context, String title,
      IconData icon, Color iconColor, Color backgroundColor,
      {VoidCallback? onTap}) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        splashColor: iconColor.withOpacity(0.1),
        highlightColor: iconColor.withOpacity(0.05),
        child: Container(
          height: 110, // Fixed height for consistency
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.08),
                blurRadius: 12,
                offset: const Offset(0, 4),
                spreadRadius: 0,
              ),
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 6,
                offset: const Offset(0, 2),
                spreadRadius: 0,
              ),
            ],
            border: Border.all(
              color: Colors.grey.withOpacity(0.1),
              width: 1,
            ),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Icon container with background
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: backgroundColor,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: iconColor.withOpacity(0.2),
                      width: 1,
                    ),
                  ),
                  child: Icon(
                    icon,
                    size: 24,
                    color: iconColor,
                  ),
                ),
                const SizedBox(height: 12),
                // Title with better typography
                Flexible(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8.0),
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        title,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey.shade800,
                          letterSpacing: 0.2,
                          height: 1.2,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Keep the old method for backward compatibility if needed elsewhere
  Widget _buildInfoCard(BuildContext context, String title, IconData icon,
      {VoidCallback? onTap}) {
    return InkWell(
      onTap: onTap,
      child: Card(
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Container(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 30, color: Theme.of(context).primaryColor),
              const SizedBox(height: 8),
              Text(title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 12)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSearchBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: GestureDetector(
        onTap: () {
          // Navigate to search screen when tapped
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const SearchResultsScreen(),
            ),
          );
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
          decoration: BoxDecoration(
            color: Colors.grey[200],
            borderRadius: BorderRadius.circular(25.0),
          ),
          child: Row(
            children: [
              Icon(
                Icons.search,
                color: Colors.grey[600],
              ),
              const SizedBox(width: 12),
              Text(
                'Search forms, categories, submissions...',
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 16,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPromotionBanner(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
          horizontal: 16.0, vertical: 4.0), // Reduced vertical padding
      child: GestureDetector(
        onTap: () {
          // Navigate to pending forms screen when banner is tapped
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const PendingFormsScreen()),
          );
        },
        child: Container(
          padding: const EdgeInsets.all(16.0),
          decoration: BoxDecoration(
            color: Theme.of(context).primaryColor, // Or a custom purple
            borderRadius: BorderRadius.circular(15.0),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Text(
                          'pending reports',
                          style: TextStyle(color: Colors.white, fontSize: 16),
                        ),
                        const SizedBox(width: 8),
                        if (_loadingPendingForms)
                          const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor:
                                  AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        else
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              _pendingFormsCount.toString(),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _loadingPendingForms
                          ? 'Loading pending forms...'
                          : _pendingFormsCount == 0
                              ? 'All forms completed!'
                              : _pendingFormsCount == 1
                                  ? '1 form to be submitted'
                                  : '$_pendingFormsCount forms to be submitted',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              // Icon on the right
              Icon(
                _pendingFormsCount == 0
                    ? Icons.check_circle
                    : Icons.assignment_outlined,
                color: Colors.white,
                size: 50,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDashboardGrid(BuildContext context) {
    // Add BuildContext context
    // TODO: Implement the grid of 8 items
    // Use GridView.builder with 2 columns
    final List<Map<String, dynamic>> dashboardItems = [
      {
        'title': 'Voice',
        'icon': Icons.phone_outlined
      }, // Changed icon and title
      {
        'title': 'Fav',
        'icon': Icons.favorite_outline,
        'onTap': () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const FavoritesScreen()),
          );
        }
      },
      {
        'title': 'Search',
        'icon': Icons.search,
        'onTap': () {
          Navigator.push(
            context,
            MaterialPageRoute(
                builder: (context) => const SearchResultsScreen()),
          );
        }
      },
      {
        'title': 'Status',
        'icon': Icons.assignment_turned_in,
        'onTap': () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const StatusScreen()),
          );
        }
      },
      {
        'title': 'Calendar',
        'icon': Icons.calendar_today_outlined,
        'onTap': () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const CalendarTodoScreen()),
          );
        }
      },
      {
        'title': 'Upload',
        'icon': Icons.cloud_upload,
        'onTap': () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const FileUploadScreen()),
          );
        }
      },
      {
        'title': 'Settings',
        'icon': Icons.settings_outlined,
        'onTap': () {
          _showSettingsBottomSheet(context);
        }
      },
      {
        'title': 'Notifications',
        'icon': Icons.notifications_outlined,
        'onTap': () {
          Navigator.push(
            context,
            MaterialPageRoute(
                builder: (context) => const NotificationsScreen()),
          );
        }
      },
    ];

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Transform.translate(
        offset: const Offset(
            0.0, -50.0), // Adjust this y-offset to move the grid up/down
        child: GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4,
            crossAxisSpacing: 10.0,
            mainAxisSpacing: 10.0,
            childAspectRatio: 1.0,
          ),
          itemCount: dashboardItems.length,
          itemBuilder: (BuildContext context, int index) {
            final item = dashboardItems[index];

            // Special handling for notifications item
            if (item['title'] == 'Notifications') {
              return _buildNotificationDashboardItem(
                context,
                item['title'],
                item['icon'],
                item['onTap'] ?? () {},
              );
            }

            return _buildDashboardItem(
                context, // Pass context here
                item['title'],
                item['icon'],
                item['onTap'] ??
                    () {
                      /* Default onTap functionality */
                    });
          },
        ),
      ),
    );
  }

  Widget _buildNotificationDashboardItem(
      BuildContext context, String title, IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Card(
        elevation: 1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: ClipRect(
          // Add ClipRect to prevent overflow
          child: Container(
            constraints: BoxConstraints(
              maxHeight: !kIsWeb && Platform.isAndroid
                  ? 80
                  : 90, // Fixed height to prevent overflow
              maxWidth: !kIsWeb && Platform.isAndroid
                  ? 80
                  : 90, // Fixed width to prevent overflow
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Flexible(
                  child: StreamBuilder<int>(
                    stream: NotificationService.getUnreadCount(),
                    builder: (context, snapshot) {
                      final unreadCount = snapshot.data ?? 0;
                      return Stack(
                        clipBehavior:
                            Clip.none, // Allow badge to extend slightly
                        children: [
                          Icon(icon,
                              size: !kIsWeb && Platform.isAndroid ? 28.0 : 30.0,
                              color: Theme.of(context).primaryColor),
                          if (unreadCount > 0)
                            Positioned(
                              right:
                                  -2, // Slight adjustment for better positioning
                              top:
                                  -2, // Slight adjustment for better positioning
                              child: ClipRect(
                                child: Container(
                                  padding: EdgeInsets.all(
                                      !kIsWeb && Platform.isAndroid ? 2 : 4),
                                  decoration: BoxDecoration(
                                    color: Colors.red,
                                    borderRadius: BorderRadius.circular(
                                        !kIsWeb && Platform.isAndroid ? 8 : 10),
                                  ),
                                  constraints: BoxConstraints(
                                    minWidth:
                                        !kIsWeb && Platform.isAndroid ? 14 : 16,
                                    minHeight:
                                        !kIsWeb && Platform.isAndroid ? 14 : 16,
                                    maxWidth:
                                        !kIsWeb && Platform.isAndroid ? 20 : 24,
                                    maxHeight:
                                        !kIsWeb && Platform.isAndroid ? 20 : 24,
                                  ),
                                  child: FittedBox(
                                    fit: BoxFit.scaleDown,
                                    child: Text(
                                      unreadCount > 99 ? '99+' : '$unreadCount',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: !kIsWeb && Platform.isAndroid
                                            ? 8
                                            : 10,
                                        fontWeight: FontWeight.bold,
                                        height:
                                            1.0, // Tight line height to prevent overflow
                                      ),
                                      textAlign: TextAlign.center,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                        ],
                      );
                    },
                  ),
                ),
                SizedBox(height: !kIsWeb && Platform.isAndroid ? 6.0 : 8.0),
                Flexible(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      title,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: !kIsWeb && Platform.isAndroid ? 11.0 : 12.0,
                        height: 1.0, // Tight line height to prevent overflow
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDashboardItem(
      BuildContext context, String title, IconData icon, VoidCallback onTap) {
    // Add BuildContext context
    return InkWell(
      onTap: onTap,
      child: Card(
        elevation: 1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: ClipRect(
          // Add ClipRect to prevent overflow
          child: Container(
            constraints: BoxConstraints(
              maxHeight: !kIsWeb && Platform.isAndroid
                  ? 80
                  : 90, // Fixed height to prevent overflow
              maxWidth: !kIsWeb && Platform.isAndroid
                  ? 80
                  : 90, // Fixed width to prevent overflow
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Flexible(
                  child: Icon(icon,
                      size: !kIsWeb && Platform.isAndroid ? 28.0 : 30.0,
                      color: Theme.of(context).primaryColor),
                ),
                SizedBox(height: !kIsWeb && Platform.isAndroid ? 6.0 : 8.0),
                Flexible(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      title,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: !kIsWeb && Platform.isAndroid ? 11.0 : 12.0,
                        height: 1.0, // Tight line height to prevent overflow
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // You can remove the old _buildStatusCard if it's no longer needed
  // Widget _buildStatusCard(...) { ... }
}
