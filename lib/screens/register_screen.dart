import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart'; // Import FirebaseAuth
import 'package:cloud_firestore/cloud_firestore.dart'; // Import Firestore
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:dropdown_search/dropdown_search.dart';
import '../services/office_service.dart';
import 'login_screen.dart';
import 'package:mobile_app_flutter/themes/app_theme.dart'; // Import AppTheme

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({Key? key}) : super(key: key);

  @override
  _RegisterScreenState createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _employeeIdController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();
  final TextEditingController _mobileNumberController = TextEditingController();
  final TextEditingController _divisionNameController = TextEditingController();
  final TextEditingController _designationController = TextEditingController();

  String? _selectedOfficeName;
  List<String> _officeOptions = [];
  final _supabase = Supabase.instance.client;
  final _firestore = FirebaseFirestore.instance;

  String _errorMessage = '';
  bool _isLoading = false;

  // Office loading states
  bool _officeLoading = false;
  String? _officeError;

  @override
  void initState() {
    super.initState();
    // Clear cache to ensure fresh data
    OfficeService.clearCache();
    _fetchOfficeNames();
  }

  Future<void> _fetchOfficeNames() async {
    setState(() {
      _officeLoading = true;
      _officeError = null;
    });

    try {
      print('🏢 Registration: Fetching office options...');

      // First try using OfficeService (which should work for all offices)
      try {
        print('🔍 Registration: Trying OfficeService.fetchOfficeNames()...');
        final officeNames = await OfficeService.fetchOfficeNames();

        if (officeNames.isNotEmpty) {
          print(
              '✅ Registration: OfficeService returned ${officeNames.length} offices');
          print(
              '🔍 Registration: Sample offices: ${officeNames.take(5).toList()}');

          // Check if "Coimbatore division" is in the list
          final coimbatoreOffices = officeNames
              .where((office) => office.toLowerCase().contains('coimbatore'))
              .toList();
          print(
              '🔍 Registration: Coimbatore offices found: $coimbatoreOffices');

          setState(() {
            _officeOptions = officeNames;
            _officeLoading = false;
          });
          return; // Success, exit early
        } else {
          print(
              '⚠️ Registration: OfficeService returned empty list, trying direct query...');
        }
      } catch (officeServiceError) {
        print('❌ Registration: OfficeService failed: $officeServiceError');
        print('🔍 Registration: Falling back to direct database query...');
      }

      // Fallback: Direct database query with debugging
      print('🔍 Registration: Debugging table structure...');
      final debugResponse =
          await _supabase.from('offices').select('*').limit(3);
      print('🔍 Registration: Sample records: $debugResponse');
      if (debugResponse.isNotEmpty) {
        print(
            '🔍 Registration: Available columns: ${debugResponse.first.keys.toList()}');
      }

      // Try multiple approaches to get all office names
      print('🔍 Registration: Trying different query approaches...');

      // Approach 1: Select all columns (like OfficeService)
      final response1 = await _supabase
          .from('offices')
          .select('*')
          .order('Office name', ascending: true);
      print(
          '🔍 Registration: Approach 1 (select *): ${response1.length} records');

      // Approach 2: Select specific column with quotes
      final response2 = await _supabase
          .from('offices')
          .select('"Office name"')
          .order('"Office name"', ascending: true);
      print(
          '🔍 Registration: Approach 2 (quoted column): ${response2.length} records');

      // Approach 3: Select specific column without quotes
      final response3 = await _supabase
          .from('offices')
          .select('Office name')
          .order('Office name', ascending: true);
      print(
          '🔍 Registration: Approach 3 (unquoted column): ${response3.length} records');

      // Use the approach that returns the most data
      List<dynamic> response;
      if (response1.length >= response2.length &&
          response1.length >= response3.length) {
        response = response1;
        print('🔍 Registration: Using approach 1 (select *)');
      } else if (response2.length >= response3.length) {
        response = response2;
        print('🔍 Registration: Using approach 2 (quoted column)');
      } else {
        response = response3;
        print('🔍 Registration: Using approach 3 (unquoted column)');
      }

      print('🏢 Registration: Final response length: ${response.length}');
      print('🏢 Registration: Sample data: ${response.take(3).toList()}');

      // Process data to extract office names
      List<String> validOffices = [];
      for (var item in response) {
        if (item is Map<String, dynamic>) {
          // Try different ways to access the office name
          String? officeName;

          // Try with 'Office name' key
          if (item.containsKey('Office name') &&
              item['Office name'] is String) {
            officeName = item['Office name'] as String;
          }
          // Try with 'office_name' key (snake_case)
          else if (item.containsKey('office_name') &&
              item['office_name'] is String) {
            officeName = item['office_name'] as String;
          }
          // Try with 'officeName' key (camelCase)
          else if (item.containsKey('officeName') &&
              item['officeName'] is String) {
            officeName = item['officeName'] as String;
          }

          if (officeName != null && officeName.trim().isNotEmpty) {
            validOffices.add(officeName.trim());
            print('🔍 Registration: Added office: $officeName');
          } else {
            print(
                '🔍 Registration: Skipped item (no valid office name): $item');
          }
        }
      }

      // Remove duplicates and sort
      validOffices = validOffices.toSet().toList();
      validOffices.sort();

      print('🏢 Registration: Valid offices found: ${validOffices.length}');
      print('🏢 Registration: All offices: $validOffices');

      // Check if "Coimbatore division" is in the list
      final coimbatoreOffices = validOffices
          .where((office) => office.toLowerCase().contains('coimbatore'))
          .toList();
      print('🔍 Registration: Coimbatore offices found: $coimbatoreOffices');

      setState(() {
        _officeOptions = validOffices;
        _officeLoading = false;
      });
    } catch (e) {
      print('❌ Registration: Error fetching office names: $e');
      print('❌ Registration: Error type: ${e.runtimeType}');
      print('❌ Registration: Error details: ${e.toString()}');

      setState(() {
        _officeLoading = false;
        _officeError = 'Failed to load office names. Please try again.';
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Error fetching office names: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _registerUser() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      print('🔍 Starting registration process...');
      print('🔍 Employee ID: ${_employeeIdController.text}');

      // Construct the email from employeeId for Firebase Authentication (same as React)
      final firebaseEmail = '${_employeeIdController.text}@employee.com';
      print('🔍 Firebase Auth Email: $firebaseEmail');

      // 1. Create user with Firebase Authentication using the constructed email
      final userCredential =
          await FirebaseAuth.instance.createUserWithEmailAndPassword(
        email: firebaseEmail, // Use constructed email like React
        password: _passwordController.text,
      );

      if (userCredential.user != null) {
        print('🔍 User created successfully. UID: ${userCredential.user!.uid}');

        // Prepare user profile data (same structure as React)
        final userProfileData = {
          'uid': userCredential.user!.uid,
          'employeeId': _employeeIdController.text,
          'name': _nameController.text,
          'email': _emailController.text, // User's actual communication email
          'officeName': _selectedOfficeName,
          'divisionName': _divisionNameController.text,
          'designation': _designationController.text,
          'mobileNumber': _mobileNumberController.text,
          'role': 'user',
        };

        // Save to Firestore (same as React - using user.uid as document ID)
        try {
          print('🔍 Attempting Firestore insert...');
          await _firestore
              .collection('employees')
              .doc(userCredential
                  .user!.uid) // Use UID as document ID (same as React)
              .set(userProfileData);
          print('✅ Firestore insert successful');
        } catch (firestoreError) {
          print('❌ Firestore error: $firestoreError');
          rethrow; // Re-throw to be caught by outer catch
        }

        // Save to Supabase user_profiles table (same as React)
        try {
          print('🔍 Attempting Supabase insert...');
          final supabaseResponse = await _supabase
              .from('user_profiles') // Same table name as React
              .insert([userProfileData]); // Use array like React
          print('✅ Supabase insert successful');
        } catch (supabaseError) {
          print('❌ Supabase error: $supabaseError');
          rethrow; // Re-throw to be caught by outer catch
        }

        print('🔍 Registration completed successfully!');

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text(
                    'Registration Successful! Data saved to both databases.')),
          );
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (context) => const LoginScreen()),
          );
        }
      }
    } on FirebaseAuthException catch (e) {
      String errorMessage;
      if (e.code == 'weak-password') {
        errorMessage = 'The password provided is too weak.';
      } else if (e.code == 'email-already-in-use') {
        errorMessage = 'The account already exists for that email.';
      } else {
        errorMessage = 'Registration failed: ${e.message}';
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(errorMessage)),
        );
      }
    } on PostgrestException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Supabase error: ${e.message}')),
        );
      }
    } on FirebaseException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Firestore error: ${e.message}')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('An unexpected error occurred: $e')),
        );
      }
    }

    setState(() {
      _isLoading = false;
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _employeeIdController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _mobileNumberController.dispose();
    _divisionNameController.dispose();
    _designationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context)
          .scaffoldBackgroundColor, // Use theme's scaffold background color
      body: Stack(
        children: [
          // Background with a curve (main solid color) - similar to DashboardScreen
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              height: MediaQuery.of(context).size.height *
                  0.3, // Adjust height as needed
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor, // Your primary color
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(30),
                  bottomRight: Radius.circular(30),
                ),
              ),
            ),
          ),
          // Wave/Blob Shapes using CustomPainter - similar to DashboardScreen
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: ClipRRect(
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(30),
                bottomRight: Radius.circular(30),
              ),
              child: CustomPaint(
                painter:
                    _WavePainter(color: Colors.white), // Using white for waves
                child: Container(
                  height: MediaQuery.of(context).size.height *
                      0.3, // Same height as the container above
                ),
              ),
            ),
          ),
          // Logo
          Positioned(
            top: MediaQuery.of(context).size.height * 0.02, // Adjust position
            left: 0,
            right: 0,
            child: Center(
              child: Image.asset(
                'assets/images/Indiapost_Logo.png',
                height: 100,
                width: 100,
              ),
            ),
          ),
          // Scrollable content
          Positioned.fill(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    const SizedBox(height: 250.0), // Space for logo and waves
                    // Title
                    Text(
                      'Create Your Account',
                      textAlign: TextAlign.center,
                      style: Theme.of(context)
                          .textTheme
                          .headlineSmall
                          ?.copyWith(
                            color: Theme.of(context).colorScheme.onBackground,
                          ), // Apply theme text style
                    ),
                    const SizedBox(height: 24.0),

                    // Error Message
                    if (_errorMessage.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 16.0),
                        child: Text(
                          _errorMessage,
                          style: TextStyle(
                              color: Theme.of(context).colorScheme.error,
                              fontSize: 14),
                          textAlign: TextAlign.center,
                        ),
                      ),

                    // Name TextField
                    TextFormField(
                      controller: _nameController,
                      decoration: InputDecoration(
                        labelText: 'Full Name',
                        border: const OutlineInputBorder(),
                        prefixIcon: Icon(Icons.person_outline,
                            color: Theme.of(context).colorScheme.primary),
                        labelStyle: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface),
                        focusedBorder: OutlineInputBorder(
                          borderSide: BorderSide(
                              color: Theme.of(context).colorScheme.primary,
                              width: 2.0),
                        ),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty)
                          return 'Please enter your name';
                        if (value.length < 3)
                          return 'Name must be at least 3 characters';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16.0),

                    // Employee ID TextField
                    TextFormField(
                      controller: _employeeIdController,
                      decoration: InputDecoration(
                        labelText: 'Employee ID',
                        border: const OutlineInputBorder(),
                        prefixIcon: Icon(Icons.badge_outlined,
                            color: Theme.of(context).colorScheme.primary),
                        labelStyle: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface),
                        focusedBorder: OutlineInputBorder(
                          borderSide: BorderSide(
                              color: Theme.of(context).colorScheme.primary,
                              width: 2.0),
                        ),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty)
                          return 'Please enter your Employee ID';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16.0),

                    // Email TextField
                    TextFormField(
                      controller: _emailController,
                      decoration: InputDecoration(
                        labelText: 'Email',
                        border: const OutlineInputBorder(),
                        prefixIcon: Icon(Icons.email_outlined,
                            color: Theme.of(context).colorScheme.primary),
                        labelStyle: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface),
                        focusedBorder: OutlineInputBorder(
                          borderSide: BorderSide(
                              color: Theme.of(context).colorScheme.primary,
                              width: 2.0),
                        ),
                      ),
                      keyboardType: TextInputType.emailAddress,
                      validator: (value) {
                        if (value == null || value.isEmpty)
                          return 'Please enter your email';
                        if (!value.contains('@'))
                          return 'Please enter a valid email';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16.0),

                    // Password TextField
                    TextFormField(
                      controller: _passwordController,
                      decoration: InputDecoration(
                        labelText: 'Password',
                        border: const OutlineInputBorder(),
                        prefixIcon: Icon(Icons.lock_outline,
                            color: Theme.of(context).colorScheme.primary),
                        labelStyle: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface),
                        focusedBorder: OutlineInputBorder(
                          borderSide: BorderSide(
                              color: Theme.of(context).colorScheme.primary,
                              width: 2.0),
                        ),
                      ),
                      obscureText: true,
                      validator: (value) {
                        if (value == null || value.isEmpty)
                          return 'Please enter a password';
                        if (value.length < 6)
                          return 'Password must be at least 6 characters';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16.0),

                    // Confirm Password TextField
                    TextFormField(
                      controller: _confirmPasswordController,
                      decoration: InputDecoration(
                        labelText: 'Confirm Password',
                        border: const OutlineInputBorder(),
                        prefixIcon: Icon(Icons.lock_reset_outlined,
                            color: Theme.of(context).colorScheme.primary),
                        labelStyle: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface),
                        focusedBorder: OutlineInputBorder(
                          borderSide: BorderSide(
                              color: Theme.of(context).colorScheme.primary,
                              width: 2.0),
                        ),
                      ),
                      obscureText: true,
                      validator: (value) {
                        if (value == null || value.isEmpty)
                          return 'Please confirm your password';
                        if (value != _passwordController.text)
                          return 'Passwords do not match';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16.0),

                    // Office Name Dropdown with Loading State
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
                          prefixIcon: Icon(Icons.business_outlined,
                              color: Theme.of(context).colorScheme.primary),
                          labelStyle: TextStyle(
                              color: Theme.of(context).colorScheme.onSurface),
                          focusedBorder: OutlineInputBorder(
                            borderSide: BorderSide(
                                color: Theme.of(context).colorScheme.primary,
                                width: 2.0),
                          ),
                          // Show loading or error state
                          suffixIcon: _officeLoading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: Padding(
                                    padding: EdgeInsets.all(12.0),
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2),
                                  ),
                                )
                              : _officeError != null
                                  ? Icon(Icons.error_outline,
                                      color:
                                          Theme.of(context).colorScheme.error)
                                  : null,
                          helperText: _officeLoading
                              ? 'Loading office names...'
                              : _officeError != null
                                  ? _officeError
                                  : '${_officeOptions.length} offices available',
                          helperStyle: TextStyle(
                            color: _officeError != null
                                ? Theme.of(context).colorScheme.error
                                : Theme.of(context)
                                    .colorScheme
                                    .onSurface
                                    .withOpacity(0.6),
                          ),
                        ),
                      ),
                      enabled: !_officeLoading,
                      onChanged: _officeLoading
                          ? null
                          : (value) {
                              setState(() {
                                _selectedOfficeName = value;
                              });
                            },
                      selectedItem: _selectedOfficeName,
                      validator: (value) {
                        if (_officeLoading)
                          return null; // Don't validate while loading
                        if (value == null || value.isEmpty)
                          return 'Please select an office';
                        return null;
                      },
                    ),

                    // Retry button for office loading errors
                    if (_officeError != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 8.0, bottom: 8.0),
                        child: TextButton.icon(
                          onPressed: _fetchOfficeNames,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry Loading Offices'),
                          style: TextButton.styleFrom(
                            foregroundColor:
                                Theme.of(context).colorScheme.primary,
                          ),
                        ),
                      ),

                    const SizedBox(height: 16.0),

                    // Division Name TextField
                    TextFormField(
                      controller: _divisionNameController,
                      decoration: InputDecoration(
                        labelText: 'Division Name',
                        border: const OutlineInputBorder(),
                        prefixIcon: Icon(Icons.apartment_outlined,
                            color: Theme.of(context).colorScheme.primary),
                        labelStyle: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface),
                        focusedBorder: OutlineInputBorder(
                          borderSide: BorderSide(
                              color: Theme.of(context).colorScheme.primary,
                              width: 2.0),
                        ),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty)
                          return 'Please enter your Division Name';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16.0),

                    // Designation TextField
                    TextFormField(
                      controller: _designationController,
                      decoration: InputDecoration(
                        labelText: 'Designation',
                        border: const OutlineInputBorder(),
                        prefixIcon: Icon(Icons.work_outline,
                            color: Theme.of(context).colorScheme.primary),
                        labelStyle: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface),
                        focusedBorder: OutlineInputBorder(
                          borderSide: BorderSide(
                              color: Theme.of(context).colorScheme.primary,
                              width: 2.0),
                        ),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty)
                          return 'Please enter your Designation';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16.0),

                    // Mobile Number TextField
                    TextFormField(
                      controller: _mobileNumberController,
                      decoration: InputDecoration(
                        labelText: 'Mobile Number',
                        border: const OutlineInputBorder(),
                        prefixIcon: Icon(Icons.phone_outlined,
                            color: Theme.of(context).colorScheme.primary),
                        labelStyle: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface),
                        focusedBorder: OutlineInputBorder(
                          borderSide: BorderSide(
                              color: Theme.of(context).colorScheme.primary,
                              width: 2.0),
                        ),
                      ),
                      keyboardType: TextInputType.phone,
                      validator: (value) {
                        if (value == null || value.isEmpty)
                          return 'Please enter your Mobile Number';
                        return null;
                      },
                    ),
                    const SizedBox(height: 24.0),

                    // Register Button
                    _isLoading
                        ? const Center(child: CircularProgressIndicator())
                        : ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Theme.of(context)
                                  .colorScheme
                                  .primary, // Use primary color
                              foregroundColor: Theme.of(context)
                                  .colorScheme
                                  .onPrimary, // Use onPrimary color
                              padding:
                                  const EdgeInsets.symmetric(vertical: 16.0),
                              textStyle: const TextStyle(
                                  fontSize: 16, fontWeight: FontWeight.bold),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(
                                    12.0), // Rounded corners
                              ),
                            ),
                            onPressed: _registerUser,
                            child: const Text('Register'),
                          ),
                    const SizedBox(height: 16.0),

                    // Login Link
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: <Widget>[
                        Text(
                          "Already have an account?",
                          style: TextStyle(
                              color:
                                  Theme.of(context).colorScheme.onBackground),
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.of(context).pushReplacement(
                              MaterialPageRoute(
                                  builder: (context) => const LoginScreen()),
                            );
                          },
                          style: TextButton.styleFrom(
                            foregroundColor: Theme.of(context)
                                .colorScheme
                                .secondary, // Use secondary color
                          ),
                          child: const Text('Login here'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Add this class after _RegisterScreenState or in a separate file (if not already present)
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
