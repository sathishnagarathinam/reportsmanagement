import 'package:flutter/material.dart';
import 'register_screen.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'main_screen.dart'; // Import FirebaseAuth
import 'package:mobile_app_flutter/themes/app_theme.dart'; // Import AppTheme

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _employeeIdController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  String _errorMessage = '';
  bool _isLoading = false;

  Future<void> _loginUser() async {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _isLoading = true;
        _errorMessage = '';
      });

      try {
        // Assuming Employee ID is used as the email prefix
        // You might need to adjust this based on how users are registered
        String email = "${_employeeIdController.text.trim()}@employee.com";
        String password = _passwordController.text.trim();

        UserCredential userCredential =
            await FirebaseAuth.instance.signInWithEmailAndPassword(
          email: email,
          password: password,
        );

        // Navigate to Dashboard or Home Screen on successful login
        // Example: Navigator.of(context).pushReplacementNamed('/dashboard');
        print('Login successful: ${userCredential.user?.uid}');
        // TODO: Implement navigation to your app's home/dashboard screen
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => MainScreen()),
        );
      } on FirebaseAuthException catch (e) {
        String message;
        print('🔐 Login Error Code: ${e.code}');
        print('🔐 Login Error Message: ${e.message}');

        switch (e.code) {
          case 'user-not-found':
            message =
                'Wrong Employee ID. Please check your Employee ID and try again.';
            break;
          case 'wrong-password':
            message =
                'Wrong Password. Please check your password and try again.';
            break;
          case 'invalid-email':
            message =
                'Invalid Employee ID format. Please enter a valid Employee ID.';
            break;
          case 'invalid-credential':
            message =
                'Wrong Employee ID or Password. Please check your credentials and try again.';
            break;
          case 'too-many-requests':
            message = 'Too many failed attempts. Please try again later.';
            break;
          case 'user-disabled':
            message =
                'This account has been disabled. Please contact your administrator.';
            break;
          case 'operation-not-allowed':
            message =
                'Login is currently disabled. Please contact your administrator.';
            break;
          case 'weak-password':
            message = 'Password is too weak. Please use a stronger password.';
            break;
          case 'email-already-in-use':
            message =
                'This Employee ID is already registered with another account.';
            break;
          case 'network-request-failed':
            message =
                'Network error. Please check your internet connection and try again.';
            break;
          default:
            message =
                'Login failed: ${e.message ?? 'Unknown error'}. Please try again.';
            break;
        }

        setState(() {
          _errorMessage = message;
        });
        print('🔐 Firebase Auth Exception: ${e.toString()}');
      } catch (e) {
        setState(() {
          _errorMessage =
              'An unexpected error occurred. Please check your connection and try again.';
        });
        print('🔐 Generic Exception: ${e.toString()}');
      }

      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _employeeIdController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context)
          .scaffoldBackgroundColor, // Use theme's scaffold background color
      child: Stack(
        children: [
          // Background with a curve (main solid color) - similar to DashboardScreen
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              height: MediaQuery.of(context).size.height *
                  0.4, // Adjust height as needed
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
                      0.4, // Same height as the container above
                ),
              ),
            ),
          ),
          // Logo
          Positioned(
            top: MediaQuery.of(context).size.height * 0.05, // Adjust position
            left: 0,
            right: 0,
            child: Center(
              child: Image.asset(
                'assets/images/Indiapost_Logo.png',
                height: 120,
                width: 120,
              ),
            ),
          ),
          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    const SizedBox(height: 280.0), // Space for logo and waves
                    // Title
                    Text(
                      'Login to Reports Management System',
                      textAlign: TextAlign.center,
                      style: Theme.of(context)
                          .textTheme
                          .headlineSmall
                          ?.copyWith(
                            color: Theme.of(context).colorScheme.onBackground,
                          ), // Apply theme text style
                    ),
                    const SizedBox(height: 32.0),

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

                    // Employee ID TextField
                    TextFormField(
                      controller: _employeeIdController,
                      decoration: InputDecoration(
                        labelText: 'Employee ID',
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
                        if (value == null || value.isEmpty) {
                          return 'Please enter your Employee ID';
                        }
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
                        if (value == null || value.isEmpty) {
                          return 'Please enter your password';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 24.0),

                    // Login Button
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
                            onPressed: _loginUser,
                            child: const Text('Sign In'),
                          ),
                    const SizedBox(height: 16.0),

                    // Forgot Password Button
                    TextButton(
                      onPressed: () {
                        // TODO: Navigate to Forgot Password Screen or show dialog
                        print('Forgot Password tapped');
                      },
                      style: TextButton.styleFrom(
                        foregroundColor: Theme.of(context)
                            .colorScheme
                            .secondary, // Use secondary color
                      ),
                      child: const Text('Forgot Password?'),
                    ),
                    const SizedBox(height: 8.0),

                    // Register Link
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: <Widget>[
                        Text(
                          "Don't have an account?",
                          style: TextStyle(
                              color:
                                  Theme.of(context).colorScheme.onBackground),
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                  builder: (context) => const RegisterScreen()),
                            );
                          },
                          style: TextButton.styleFrom(
                            foregroundColor: Theme.of(context)
                                .colorScheme
                                .secondary, // Use secondary color
                          ),
                          child: const Text('Register here'),
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

// Add this class after _LoginScreenState or in a separate file (if not already present)
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
