import 'package:flutter/material.dart';

class AppTheme {
  static final ThemeData lightTheme = ThemeData(
    brightness: Brightness.light,
    primaryColor: const Color(0xFF6A1B9A), // A deep purple, adjust as needed
    scaffoldBackgroundColor: const Color(0xFFF4F6F8), // Light grey background
    colorScheme: const ColorScheme.light(
      primary: Color.fromARGB(255, 112, 44, 154), // Deep purple
      secondary: Color(0xFF8E24AA), // Lighter purple
      surface: Colors.white, // Card backgrounds, etc.
      background: Color(0xFFF4F6F8),
      error: Colors.red,
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: Colors.black87,
      onBackground: Colors.black87,
      onError: Colors.white,
    ),
    textTheme: const TextTheme(
      displayLarge: TextStyle(fontSize: 24.0, fontWeight: FontWeight.bold, color: Color(0xFF333333)),
      titleLarge: TextStyle(fontSize: 20.0, fontWeight: FontWeight.w600, color: Color(0xFF333333)),
      bodyMedium: TextStyle(fontSize: 16.0, color: Color(0xFF555555)),
      labelLarge: TextStyle(fontSize: 14.0, fontWeight: FontWeight.bold, color: Colors.white),
    ),
    cardTheme: CardThemeData(
      elevation: 2.0,
      margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12.0),
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xFF6A1B9A),
      elevation: 0,
      iconTheme: IconThemeData(color: Colors.white),
      titleTextStyle: TextStyle(fontSize: 20.0, fontWeight: FontWeight.bold, color: Colors.white),
    ),
    // You can add more theme customizations here for buttons, bottom navigation, etc.
  );

  // If you want a dark theme, you can define it here as well
  // static final ThemeData darkTheme = ThemeData(...);
}