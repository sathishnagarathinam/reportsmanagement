import 'package:flutter/material.dart';
import 'dashboard_screen.dart'; // Import your existing dashboard screen
import 'data_entry_screen.dart'; // Import the Data Entry screen
import 'profile_screen.dart'; // Import the Profile screen
import 'package:firebase_auth/firebase_auth.dart'; // Import firebase_auth
import 'login_screen.dart'; // Import the LoginScreen

// Import other screens you want in the bottom nav bar

class MainScreen extends StatefulWidget {
  const MainScreen({Key? key}) : super(key: key);

  @override
  _MainScreenState createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _selectedIndex = 0;

  // Callback function to change the selected index
  void _changeSelectedIndex(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  // List of widgets to display in the body of the Scaffold
  List<Widget> get _screens {
    return [
      // Pass the callback to DashboardScreen
      DashboardScreen(
          onNavigateToDataEntry: () =>
              _changeSelectedIndex(1)), // Assuming Data Entry is index 1
      const DataEntryScreen(), // Add DataEntryScreen here
      const ProfileScreen(), // Add ProfileScreen here
      // A placeholder for Logout, which will likely trigger an action instead of showing a screen
      const Center(child: Text('Logout Screen Placeholder')),
    ];
  }

  void _onItemTapped(int index) async {
    // Make the method async
    setState(() {
      _selectedIndex = index;
    });
    // Handle navigation or actions based on the selected index
    if (index == 3) {
      // Logout is at index 3
      try {
        await FirebaseAuth.instance.signOut(); // Sign out the user
        // Navigate to the LoginScreen and remove all previous routes
        if (mounted) {
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (context) => const LoginScreen()),
            (Route<dynamic> route) => false,
          );
        }
      } catch (e) {
        print('Error signing out: $e');
        // Optionally show an error message to the user
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _selectedIndex,
        children: _screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        type: BottomNavigationBarType.fixed, // Allow more than 3 tabs
        items: _buildNavigationItems(),
        selectedItemColor: Theme.of(context).primaryColor,
        unselectedItemColor: Colors.grey,
        backgroundColor: Colors.white,
        onTap: _onItemTapped,
      ),
    );
  }

  List<BottomNavigationBarItem> _buildNavigationItems() {
    return [
      const BottomNavigationBarItem(
        icon: Icon(Icons.home),
        label: 'Home',
      ),
      const BottomNavigationBarItem(
        icon: Icon(Icons.edit_note), // Changed icon for Data Entry
        label: 'Data Entry', // Changed label to Data Entry
      ),
      const BottomNavigationBarItem(
        icon: Icon(Icons.person), // Profile icon
        label: 'Profile', // Profile label
      ),
      const BottomNavigationBarItem(
        icon: Icon(Icons.logout),
        label: 'Logout',
      ),
    ];
  }
}
