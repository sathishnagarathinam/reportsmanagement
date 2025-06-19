import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Service for filtering dynamic forms based on user's office access
class FormFilteringService {
  static final _supabase = Supabase.instance.client;
  static final _firestore = FirebaseFirestore.instance;

  /// Checks if a user has access to a form based on office targeting
  /// [userOfficeName] - The user's office name
  /// [formOfficeTargeting] - List of office names that can access the form
  /// Returns true if user has access, false otherwise
  static bool checkFormAccess(
      String? userOfficeName, List<String>? formOfficeTargeting) {
    try {
      print('🔍 FormFilteringService: checkFormAccess called');
      print('🔍 FormFilteringService: userOfficeName = "$userOfficeName"');
      print(
          '🔍 FormFilteringService: formOfficeTargeting = $formOfficeTargeting');

      // If user has no office assigned, deny access
      if (userOfficeName == null || userOfficeName.trim().isEmpty) {
        print(
            '❌ FormFilteringService: User has no office assigned, denying access');
        return false;
      }

      // If form has no office restrictions, allow access to everyone
      if (formOfficeTargeting == null || formOfficeTargeting.isEmpty) {
        print(
            '✅ FormFilteringService: Form has no office restrictions, allowing access');
        return true;
      }

      // Check if user's office is in the form's target offices (case-insensitive)
      final userOfficeNormalized = userOfficeName.trim().toLowerCase();
      print(
          '🔍 FormFilteringService: Normalized user office: "$userOfficeNormalized"');

      // Debug each target office
      for (int i = 0; i < formOfficeTargeting.length; i++) {
        final targetOffice = formOfficeTargeting[i];
        final targetNormalized = targetOffice.trim().toLowerCase();
        final matches = targetNormalized == userOfficeNormalized;
        print(
            '🔍 FormFilteringService: Target[$i]: "$targetOffice" -> "$targetNormalized" -> Match: $matches');
      }

      final hasAccess = formOfficeTargeting.any((targetOffice) =>
          targetOffice.trim().toLowerCase() == userOfficeNormalized);

      print(
          '🔍 FormFilteringService: Final access decision: ${hasAccess ? 'GRANTED' : 'DENIED'}');
      print(
          'FormFilteringService: User office "$userOfficeName" ${hasAccess ? 'HAS' : 'DOES NOT HAVE'} access to form with targeting: $formOfficeTargeting');
      return hasAccess;
    } catch (error) {
      print('❌ FormFilteringService: Error checking form access: $error');
      // On error, deny access for security
      return false;
    }
  }

  /// Filters forms based on user's office access
  /// [forms] - List of form configurations
  /// [userOfficeName] - The user's office name
  /// Returns filtered list of forms the user can access
  static List<T> filterFormsByOfficeAccess<T extends Map<String, dynamic>>(
      List<T> forms, String? userOfficeName) {
    try {
      print(
          'FormFilteringService: Filtering ${forms.length} forms for user office: "$userOfficeName"');

      final filteredForms = forms.where((form) {
        // Extract selectedOffices from form configuration
        List<String>? selectedOffices;

        if (form['selectedOffices'] is List) {
          selectedOffices = (form['selectedOffices'] as List)
              .map((office) => office.toString())
              .toList();
        } else if (form['selected_offices'] is List) {
          selectedOffices = (form['selected_offices'] as List)
              .map((office) => office.toString())
              .toList();
        }

        return checkFormAccess(userOfficeName, selectedOffices);
      }).toList();

      print(
          'FormFilteringService: User has access to ${filteredForms.length} out of ${forms.length} forms');
      return filteredForms;
    } catch (error) {
      print(
          'FormFilteringService: Error filtering forms by office access: $error');
      // On error, return empty list for security
      return [];
    }
  }

  /// Gets the current user's office name from Firebase
  /// Returns the user's office name or null if not found
  static Future<String?> getCurrentUserOfficeName() async {
    try {
      print('FormFilteringService: Fetching current user office name...');

      final user = firebase_auth.FirebaseAuth.instance.currentUser;
      if (user == null) {
        print('FormFilteringService: No user logged in');
        return null;
      }

      final userDoc =
          await _firestore.collection('employees').doc(user.uid).get();

      if (userDoc.exists) {
        final userData = userDoc.data();
        final officeName = userData?['officeName'] as String?;

        print('FormFilteringService: User office name: $officeName');
        return officeName;
      } else {
        print('FormFilteringService: User document not found');
        return null;
      }
    } catch (error) {
      print('FormFilteringService: Error getting user office name: $error');
      return null;
    }
  }

  /// Fetches form configurations from Supabase page_configurations table
  /// Returns list of form configurations with office targeting information
  static Future<List<Map<String, dynamic>>> fetchFormConfigurations() async {
    try {
      print(
          'FormFilteringService: Fetching form configurations from Supabase...');

      final response = await _supabase
          .from('page_configurations')
          .select('id, title, selected_offices, fields')
          .order('title', ascending: true);

      print(
          'FormFilteringService: Fetched ${response.length} form configurations');
      return List<Map<String, dynamic>>.from(response);
    } catch (error) {
      print('FormFilteringService: Error fetching form configurations: $error');
      return [];
    }
  }

  /// Gets filtered forms for the current user
  /// Returns list of forms the current user can access based on their office
  static Future<List<Map<String, dynamic>>>
      getFilteredFormsForCurrentUser() async {
    try {
      print('FormFilteringService: Getting filtered forms for current user...');

      // Get user's office name
      final userOfficeName = await getCurrentUserOfficeName();

      // Get all form configurations
      final allForms = await fetchFormConfigurations();

      // Filter forms based on user's office access
      final filteredForms = filterFormsByOfficeAccess(allForms, userOfficeName);

      print(
          'FormFilteringService: Returning ${filteredForms.length} accessible forms');
      return filteredForms;
    } catch (error) {
      print('FormFilteringService: Error getting filtered forms: $error');
      return [];
    }
  }

  /// Checks if a specific form is accessible to the current user
  /// [formId] - The form identifier
  /// Returns true if user can access the form, false otherwise
  static Future<bool> canUserAccessForm(String formId) async {
    try {
      print('🔒 FormFilteringService: Checking access for form: $formId');

      // Get user's office name
      final userOfficeName = await getCurrentUserOfficeName();
      print('🔒 FormFilteringService: User office name: "$userOfficeName"');

      // Get specific form configuration with detailed logging
      print(
          '🔒 FormFilteringService: Querying page_configurations for form: $formId');
      final response = await _supabase
          .from('page_configurations')
          .select(
              'id, title, selected_offices, selected_office') // Get more fields for debugging
          .eq('id', formId)
          .limit(1);

      print('🔒 FormFilteringService: Query response: $response');

      if (response.isEmpty) {
        print('❌ FormFilteringService: Form not found: $formId');
        return false;
      }

      final formConfig = response.first;
      print('🔒 FormFilteringService: Form config: $formConfig');

      List<String>? selectedOffices;

      // Check multiple possible field names for office targeting
      if (formConfig['selected_offices'] is List) {
        selectedOffices = (formConfig['selected_offices'] as List)
            .map((office) => office.toString())
            .toList();
        print(
            '🔒 FormFilteringService: Found selected_offices (array): $selectedOffices');
      } else if (formConfig['selected_offices'] != null) {
        print(
            '🔒 FormFilteringService: selected_offices is not a list: ${formConfig['selected_offices']} (type: ${formConfig['selected_offices'].runtimeType})');
      } else if (formConfig['selected_office'] != null) {
        // Handle legacy single office format
        selectedOffices = [formConfig['selected_office'].toString()];
        print(
            '🔒 FormFilteringService: Found selected_office (single): $selectedOffices');
      } else {
        print(
            '🔒 FormFilteringService: No office targeting found - allowing all users');
        selectedOffices = null;
      }

      print('🔒 FormFilteringService: Final selectedOffices: $selectedOffices');
      print('🔒 FormFilteringService: User office: "$userOfficeName"');

      final hasAccess = checkFormAccess(userOfficeName, selectedOffices);
      print(
          '🔒 FormFilteringService: Access result: ${hasAccess ? 'GRANTED' : 'DENIED'}');
      print(
          '🔒 FormFilteringService: User ${hasAccess ? 'CAN' : 'CANNOT'} access form: $formId');

      return hasAccess;
    } catch (error) {
      print('❌ FormFilteringService: Error checking form access: $error');
      print('❌ FormFilteringService: Stack trace: ${StackTrace.current}');
      return false;
    }
  }
}
