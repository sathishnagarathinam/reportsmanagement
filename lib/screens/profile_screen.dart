import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:dropdown_search/dropdown_search.dart';
import '../services/office_service.dart';

// Wave painter for custom app bar (same as dashboard)
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

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  // User data states
  String _employeeName = 'Loading...';
  String _employeeId = 'Loading...';
  String _email = 'Loading...';
  String _officeName = 'Loading...';
  String _divisionName = '';
  String _designation = '';
  String _mobileNumber = '';

  // Selected values for editing
  String _selectedOfficeName = '';
  String _selectedDivisionName = '';
  String _selectedDesignation = '';
  String _selectedMobileNumber = '';

  // Office dropdown states
  List<String> _officeOptions = [];
  bool _officeLoading = false;
  String? _officeError;

  // Form states
  bool _isEditing = false;
  bool _isSaving = false;
  final _formKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    // Clear cache to ensure fresh data (same as Registration screen)
    OfficeService.clearCache();
    _fetchUserData();
    _fetchOfficeOptions();
  }

  // Fetch user data from Firebase
  Future<void> _fetchUserData() async {
    try {
      print('🔍 Profile: Fetching user data...');
      firebase_auth.User? user =
          firebase_auth.FirebaseAuth.instance.currentUser;
      if (user != null) {
        DocumentSnapshot userDoc = await FirebaseFirestore.instance
            .collection('employees')
            .doc(user.uid)
            .get();

        if (userDoc.exists) {
          final userData = userDoc.data() as Map<String, dynamic>;
          if (mounted) {
            setState(() {
              _employeeName = userData['name'] ?? 'N/A';
              _employeeId = userData['employeeId'] ?? 'N/A';
              _email = userData['email'] ?? user.email ?? 'N/A';
              _officeName = userData['officeName'] ?? 'N/A';
              _divisionName = userData['divisionName'] ?? '';
              _designation = userData['designation'] ?? '';
              _mobileNumber = userData['mobileNumber'] ?? '';

              // Set selected values for editing
              _selectedOfficeName = _officeName;
              _selectedDivisionName = _divisionName;
              _selectedDesignation = _designation;
              _selectedMobileNumber = _mobileNumber;
            });
          }
          print('✅ Profile: User data loaded successfully');
        } else {
          print('❌ Profile: User document not found');
          if (mounted) {
            setState(() {
              _employeeName = 'Employee data not found';
              _email = user.email ?? 'N/A';
            });
          }
        }
      } else {
        print('❌ Profile: User not logged in');
        if (mounted) {
          setState(() {
            _employeeName = 'User not logged in';
          });
        }
      }
    } catch (e) {
      print('❌ Profile: Error fetching user data: $e');
      if (mounted) {
        setState(() {
          _employeeName = 'Error loading data';
        });
      }
    }
  }

  // Fetch office options - Enhanced with comprehensive pagination solution
  Future<void> _fetchOfficeOptions() async {
    setState(() {
      _officeLoading = true;
      _officeError = null;
    });

    try {
      print(
          '🏢 Profile: Fetching office options using enhanced OfficeService...');

      // First try using OfficeService (which includes the 5-approach pagination solution)
      try {
        print('🔍 Profile: Trying OfficeService.fetchOfficeNames()...');
        final officeNames = await OfficeService.fetchOfficeNames();

        if (officeNames.isNotEmpty) {
          print(
              '✅ Profile: OfficeService returned ${officeNames.length} offices');
          print('🔍 Profile: Sample offices: ${officeNames.take(5).toList()}');

          // Check alphabetical range to verify we got all offices
          if (officeNames.isNotEmpty) {
            print(
                '🔍 Profile: Alphabetical range - First: "${officeNames.first}"');
            print(
                '🔍 Profile: Alphabetical range - Last: "${officeNames.last}"');

            // Check for offices starting with different letters
            final aOffices = officeNames
                .where((name) => name.toLowerCase().startsWith('a'))
                .length;
            final bOffices = officeNames
                .where((name) => name.toLowerCase().startsWith('b'))
                .length;
            final cOffices = officeNames
                .where((name) => name.toLowerCase().startsWith('c'))
                .length;
            final dOffices = officeNames
                .where((name) => name.toLowerCase().startsWith('d'))
                .length;

            print(
                '🔍 Profile: Letter distribution - A: $aOffices, B: $bOffices, C: $cOffices, D: $dOffices');
          }

          // Check if "Coimbatore division" is in the list
          final coimbatoreOffices = officeNames
              .where((office) => office.toLowerCase().contains('coimbatore'))
              .toList();
          print('🔍 Profile: Coimbatore offices found: $coimbatoreOffices');

          // Check specifically for "Coimbatore division"
          final hasCoimbatoreDivision = officeNames
              .any((office) => office.toLowerCase() == 'coimbatore division');
          print(
              '🔍 Profile: Contains "Coimbatore division": $hasCoimbatoreDivision');

          if (mounted) {
            setState(() {
              _officeOptions = officeNames;
              _officeLoading = false;
            });
          }
          return; // Success, exit early
        } else {
          print(
              '⚠️ Profile: OfficeService returned empty list, trying fallback...');
        }
      } catch (officeServiceError) {
        print('❌ Profile: OfficeService failed: $officeServiceError');
        print('🔍 Profile: Falling back to direct database query...');
      }

      // Fallback: Direct database query (same as old implementation)
      print('🔍 Profile: Using fallback direct query...');
      final supabase = Supabase.instance.client;
      final response = await supabase
          .from('offices')
          .select('"Office name"')
          .range(0, 49999); // High range to get all records

      print('🏢 Profile: Fallback response length: ${response.length}');
      print('🏢 Profile: Sample data: ${response.take(3).toList()}');

      // Process data
      List<String> validOffices = [];
      for (var item in response) {
        if (item is Map<String, dynamic> &&
            item.containsKey('Office name') &&
            item['Office name'] is String &&
            (item['Office name'] as String).trim().isNotEmpty) {
          validOffices.add((item['Office name'] as String).trim());
        }
      }

      // Sort the offices alphabetically
      validOffices.sort();

      print(
          '🏢 Profile: Fallback - Valid offices found: ${validOffices.length}');
      print(
          '🏢 Profile: Fallback - First few offices: ${validOffices.take(5).toList()}');

      if (mounted) {
        setState(() {
          _officeOptions = validOffices;
          _officeLoading = false;
        });
      }
    } catch (error) {
      print('❌ Profile: Error fetching office names: $error');
      print('❌ Profile: Error type: ${error.runtimeType}');
      print('❌ Profile: Error details: ${error.toString()}');

      if (mounted) {
        setState(() {
          _officeLoading = false;
          _officeError = 'Failed to load office names: $error';
        });
      }
    }
  }

  // Save updated profile data to both Firebase and Supabase
  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isSaving = true;
    });

    try {
      print('💾 Profile: Saving profile data...');
      firebase_auth.User? user =
          firebase_auth.FirebaseAuth.instance.currentUser;
      if (user == null) {
        throw Exception('User not logged in');
      }

      // Prepare update data for both databases
      final updateData = {
        'name':
            _employeeName, // Keep current name (not editable in this version)
        'officeName': _selectedOfficeName,
        'divisionName': _selectedDivisionName,
        'designation': _selectedDesignation,
        'mobileNumber': _selectedMobileNumber,
        'updatedAt': FieldValue.serverTimestamp(),
      };

      // Update Firebase Firestore (employees collection)
      await FirebaseFirestore.instance
          .collection('employees')
          .doc(user.uid)
          .update(updateData);
      print('✅ Profile: Firebase updated successfully');

      // Update Supabase user_profiles table (same fields as Registration screen)
      final supabase = Supabase.instance.client;

      print('🔍 Profile: Attempting Supabase update...');
      print('🔍 Profile: Employee ID for update: $_employeeId');
      print('🔍 Profile: Update data: {');
      print('  name: $_employeeName');
      print('  officeName: $_selectedOfficeName');
      print('  divisionName: $_selectedDivisionName');
      print('  designation: $_selectedDesignation');
      print('  mobileNumber: $_selectedMobileNumber');
      print('}');

      // First, check if the record exists
      try {
        final existingRecord = await supabase
            .from('user_profiles')
            .select('*')
            .eq('employeeId', _employeeId)
            .single();

        print('🔍 Profile: Existing record found: $existingRecord');
      } catch (checkError) {
        print('❌ Profile: Error checking existing record: $checkError');

        // Try alternative lookup by Firebase UID
        print('🔄 Profile: Trying alternative lookup by Firebase UID...');
        try {
          final altRecord = await supabase
              .from('user_profiles')
              .select('*')
              .eq('uid', user.uid)
              .single();

          print('✅ Profile: Found record using Firebase UID: $altRecord');
          // Update _employeeId with the correct value for the update
          _employeeId = altRecord['employeeId'] as String;
        } catch (altError) {
          print('❌ Profile: Alternative lookup also failed: $altError');
          print(
              '🔄 Profile: User record not found in Supabase. Creating new record...');

          // Create the missing user record in Supabase
          try {
            final newUserRecord = {
              'uid': user.uid,
              'employeeId': _employeeId,
              'name': _employeeName,
              'email': _email,
              'officeName': _officeName,
              'divisionName': _divisionName,
              'designation': _designation,
              'mobileNumber': _mobileNumber,
              'role': 'user'
            };

            print('🔄 Profile: Creating user record with data: $newUserRecord');

            final createdRecord = await supabase
                .from('user_profiles')
                .insert(newUserRecord)
                .select()
                .single();

            print(
                '✅ Profile: Successfully created user record: $createdRecord');
          } catch (createError) {
            print('❌ Profile: Error creating user record: $createError');

            // Check for RLS error
            if (createError.toString().contains('42501') ||
                createError.toString().contains('row-level security')) {
              throw Exception(
                  'Database security settings are blocking profile creation. Please contact your administrator to disable Row Level Security for the user_profiles table.');
            }

            throw Exception(
                'Unable to create user profile. Please contact support. Error: $checkError');
          }
        }
      }

      // Perform the update
      try {
        final updateResult = await supabase
            .from('user_profiles')
            .update({
              'name': _employeeName, // Keep current name
              'officeName': _selectedOfficeName,
              'divisionName': _selectedDivisionName,
              'designation': _selectedDesignation,
              'mobileNumber': _selectedMobileNumber,
              // Note: No updated_at field - table only has columns from Registration
            })
            .eq('employeeId', _employeeId)
            .select(); // Add select to get updated record

        print('✅ Profile: Supabase updated successfully');
        print('✅ Profile: Updated record: $updateResult');
      } catch (updateError) {
        print('❌ Profile: Supabase update error: $updateError');

        // Check for RLS error
        if (updateError.toString().contains('42501') ||
            updateError.toString().contains('row-level security')) {
          throw Exception(
              'Database security settings are blocking profile updates. Please contact your administrator to disable Row Level Security for the user_profiles table.');
        }

        throw Exception('Supabase update failed: $updateError');
      }

      // Update local state with all updated fields
      if (mounted) {
        setState(() {
          _officeName = _selectedOfficeName;
          _divisionName = _selectedDivisionName;
          _designation = _selectedDesignation;
          _mobileNumber = _selectedMobileNumber;
          _isEditing = false;
          _isSaving = false;
        });
      }

      // Show success message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile updated successfully!'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      print('❌ Profile: Error saving profile: $e');
      if (mounted) {
        setState(() {
          _isSaving = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error updating profile: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).primaryColor,
      body: Column(
        children: [
          // Custom App Bar with Dashboard Theme
          _buildCustomAppBar(context),
          // Content Area
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(top: 8.0),
              decoration: BoxDecoration(
                color: Theme.of(context).scaffoldBackgroundColor,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(30),
                  topRight: Radius.circular(30),
                ),
              ),
              child: ClipRRect(
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(30),
                  topRight: Radius.circular(30),
                ),
                child: _buildProfileContent(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Custom App Bar with Dashboard Theme
  Widget _buildCustomAppBar(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: <Widget>[
        // Background with a curve (main solid color)
        Container(
          height: 160,
          decoration: BoxDecoration(
            color: Theme.of(context).primaryColor,
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
              painter: _WavePainter(color: Colors.white),
              child: Container(),
            ),
          ),
        ),
        // Profile title and India Post Logo
        Positioned(
          top: 40,
          left: 0,
          right: 0,
          child: Center(
            child: Column(
              children: [
                Image.asset(
                  'assets/images/Indiapost_Logo.png',
                  height: 60,
                  width: 60,
                ),
                const SizedBox(height: 8),
                const Text(
                  'Profile',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // Profile content with user information and editable fields
  Widget _buildProfileContent() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Profile Header with Avatar
            _buildProfileHeader(),
            const SizedBox(height: 30),

            // User Information Section
            _buildUserInfoSection(),
            const SizedBox(height: 30),

            // Editable Office Section
            _buildEditableOfficeSection(),
            const SizedBox(height: 40),

            // Action Buttons
            _buildActionButtons(),
          ],
        ),
      ),
    );
  }

  // Profile header with flat avatar
  Widget _buildProfileHeader() {
    return Center(
      child: Column(
        children: [
          // Flat Avatar (same as reports screen)
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: Theme.of(context).primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.zero, // Completely flat
              border: Border.all(
                color: Theme.of(context).primaryColor,
                width: 2,
              ),
            ),
            child: Center(
              child: Text(
                _employeeName.isNotEmpty ? _employeeName[0].toUpperCase() : '?',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).primaryColor,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            _employeeName,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Theme.of(context).primaryColor,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Employee ID: $_employeeId',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  // User information section (read-only)
  Widget _buildUserInfoSection() {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Personal Information',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).primaryColor,
              ),
            ),
            const SizedBox(height: 16),
            _buildInfoRow('Name', _employeeName, Icons.person),
            const SizedBox(height: 12),
            _buildInfoRow('Employee ID', _employeeId, Icons.badge),
            const SizedBox(height: 12),
            _buildInfoRow('Email', _email, Icons.email),
            const SizedBox(height: 12),
            _buildInfoRow(
                'Division',
                _divisionName.isEmpty ? 'Not specified' : _divisionName,
                Icons.business_center),
            const SizedBox(height: 12),
            _buildInfoRow(
                'Designation',
                _designation.isEmpty ? 'Not specified' : _designation,
                Icons.work),
            const SizedBox(height: 12),
            _buildInfoRow(
                'Mobile Number',
                _mobileNumber.isEmpty ? 'Not specified' : _mobileNumber,
                Icons.phone),
          ],
        ),
      ),
    );
  }

  // Helper method to build info rows
  Widget _buildInfoRow(String label, String value, IconData icon) {
    return Row(
      children: [
        Icon(
          icon,
          size: 20,
          color: Theme.of(context).primaryColor,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // Editable office section
  Widget _buildEditableOfficeSection() {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Editable Information',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).primaryColor,
                  ),
                ),
                if (!_isEditing)
                  IconButton(
                    icon: const Icon(Icons.edit),
                    onPressed: () {
                      setState(() {
                        _isEditing = true;
                      });
                    },
                  ),
              ],
            ),
            const SizedBox(height: 16),
            if (_isEditing)
              _buildEditableFields()
            else
              _buildEditableFieldsDisplay(),
          ],
        ),
      ),
    );
  }

  // Editable fields display (read-only)
  Widget _buildEditableFieldsDisplay() {
    return Column(
      children: [
        _buildInfoRow(
            'Division',
            _divisionName.isEmpty ? 'Not specified' : _divisionName,
            Icons.business_center),
        const SizedBox(height: 12),
        _buildInfoRow('Designation',
            _designation.isEmpty ? 'Not specified' : _designation, Icons.work),
        const SizedBox(height: 12),
        _buildInfoRow(
            'Mobile Number',
            _mobileNumber.isEmpty ? 'Not specified' : _mobileNumber,
            Icons.phone),
        const SizedBox(height: 12),
        _buildInfoRow('Office Name', _officeName, Icons.business),
      ],
    );
  }

  // Editable fields (form inputs)
  Widget _buildEditableFields() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Division field
        TextFormField(
          initialValue: _selectedDivisionName,
          decoration: InputDecoration(
            labelText: 'Division',
            border: const OutlineInputBorder(),
            prefixIcon: Icon(
              Icons.business_center,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
          onChanged: (value) {
            setState(() {
              _selectedDivisionName = value;
            });
          },
        ),
        const SizedBox(height: 16),

        // Designation field
        TextFormField(
          initialValue: _selectedDesignation,
          decoration: InputDecoration(
            labelText: 'Designation',
            border: const OutlineInputBorder(),
            prefixIcon: Icon(
              Icons.work,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
          onChanged: (value) {
            setState(() {
              _selectedDesignation = value;
            });
          },
        ),
        const SizedBox(height: 16),

        // Mobile Number field
        TextFormField(
          initialValue: _selectedMobileNumber,
          decoration: InputDecoration(
            labelText: 'Mobile Number',
            border: const OutlineInputBorder(),
            prefixIcon: Icon(
              Icons.phone,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
          keyboardType: TextInputType.phone,
          onChanged: (value) {
            setState(() {
              _selectedMobileNumber = value;
            });
          },
        ),
        const SizedBox(height: 16),

        // Office dropdown
        DropdownSearch<String>(
          popupProps: const PopupProps.menu(
            showSelectedItems: true,
            showSearchBox: true,
          ),
          items: _officeOptions,
          dropdownDecoratorProps: DropDownDecoratorProps(
            dropdownSearchDecoration: InputDecoration(
              labelText: 'Office Name',
              border: const OutlineInputBorder(),
              prefixIcon: Icon(
                Icons.business_outlined,
                color: Theme.of(context).colorScheme.primary,
              ),
              labelStyle: TextStyle(
                color: Theme.of(context).colorScheme.onSurface,
              ),
              focusedBorder: OutlineInputBorder(
                borderSide: BorderSide(
                  color: Theme.of(context).colorScheme.primary,
                  width: 2.0,
                ),
              ),
            ),
          ),
          selectedItem:
              _selectedOfficeName.isNotEmpty ? _selectedOfficeName : null,
          onChanged: _officeLoading
              ? null
              : (String? newValue) {
                  setState(() {
                    _selectedOfficeName = newValue ?? '';
                  });
                },
          enabled: !_officeLoading,
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'Please select an office';
            }
            return null;
          },
        ),
        if (_officeLoading)
          const Padding(
            padding: EdgeInsets.only(top: 8.0),
            child: Row(
              children: [
                SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                SizedBox(width: 8),
                Text(
                  'Loading office options...',
                  style: TextStyle(
                    color: Colors.grey,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        if (_officeError != null)
          Padding(
            padding: const EdgeInsets.only(top: 8.0),
            child: Text(
              _officeError!,
              style: const TextStyle(
                color: Colors.red,
                fontSize: 12,
              ),
            ),
          ),
      ],
    );
  }

  // Action buttons
  Widget _buildActionButtons() {
    if (!_isEditing) {
      return const SizedBox.shrink();
    }

    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: _isSaving
                ? null
                : () {
                    setState(() {
                      _isEditing = false;
                      // Reset all fields to original values
                      _selectedOfficeName = _officeName;
                      _selectedDivisionName = _divisionName;
                      _selectedDesignation = _designation;
                      _selectedMobileNumber = _mobileNumber;
                    });
                  },
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text('Cancel'),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: ElevatedButton(
            onPressed: _isSaving ? null : _saveProfile,
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).primaryColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: _isSaving
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : const Text('Save'),
          ),
        ),
      ],
    );
  }
}
