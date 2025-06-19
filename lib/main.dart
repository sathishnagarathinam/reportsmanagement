import 'package:firebase_auth/firebase_auth.dart' as fba;
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:mobile_app_flutter/screens/login_screen.dart';
import 'package:mobile_app_flutter/screens/main_screen.dart'; // Import MainScreen
import 'package:mobile_app_flutter/screens/dashboard_screen.dart';
import 'package:mobile_app_flutter/screens/pending_forms_screen.dart';
import 'package:mobile_app_flutter/screens/reports_screen.dart';
import 'package:mobile_app_flutter/screens/notifications_screen.dart';
import 'package:mobile_app_flutter/screens/splash_screen.dart'; // Import SplashScreen
import 'firebase_options.dart';
import 'package:mobile_app_flutter/themes/app_theme.dart';
import 'services/notification_service.dart';
import 'services/division_notification_service.dart';

// You can remove this class definition if it's no longer needed.
// class PlaceholderHomeScreen extends StatelessWidget {
//   const PlaceholderHomeScreen({super.key});
//
//   @override
//   Widget build(BuildContext context) {
//     return Scaffold(
//       appBar: AppBar(title: const Text('Home')),
//       body: Center(
//         child: Column(
//           mainAxisAlignment: MainAxisAlignment.center,
//           children: [
//             const Text('Welcome! You are logged in.'),
//             ElevatedButton(
//               onPressed: () async {
//                 await FirebaseAuth.instance.signOut();
//               },
//               child: const Text('Sign Out'),
//             )
//           ],
//         ),
//       ),
//     );
//   }
// }

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase first
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  // Then initialize Supabase
  await Supabase.initialize(
    url: 'https://bvxsdjbpuujegeikuipi.supabase.co',
    anonKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2eHNkamJwdXVqZWdlaWt1aXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1NTE0MDksImV4cCI6MjA2MzEyNzQwOX0.U_1GP7rHL7uGSeLAeEH6tv-8BjZOqMxXIG_DhgtVis0',
  );

  // Initialize notification services
  await NotificationService.initialize();
  await DivisionNotificationService.initialize();

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Employee Management',
      theme: AppTheme.lightTheme,
      routes: {
        '/pending_forms': (context) => const PendingFormsScreen(),
        '/reports': (context) => const ReportsScreen(),
        '/notifications': (context) => const NotificationsScreen(),
      },
      home: SplashScreen(
        nextScreen: StreamBuilder<fba.User?>(
          // Specify the User type from firebase_auth
          stream: fba.FirebaseAuth.instance.authStateChanges(),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Scaffold(
                body: Center(
                  child: CircularProgressIndicator(),
                ),
              );
            }
            if (snapshot.hasData) {
              // Navigate to MainScreen if logged in
              return const MainScreen();
            }
            return const LoginScreen();
          },
        ),
      ),
    );
  }
}
