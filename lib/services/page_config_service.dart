import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Service for loading page configurations from Firebase and Supabase
class PageConfigService {
  static final _supabase = Supabase.instance.client;
  static final _firestore = FirebaseFirestore.instance;

  /// Loads page configuration from Firebase first, then Supabase if not found
  /// [pageId] - The page/form identifier
  /// Returns the page configuration map or null if not found
  static Future<Map<String, dynamic>?> loadPageConfig(String pageId) async {
    try {
      print('🔍 PageConfigService: Loading config for pageId: $pageId');

      // Try Firebase first
      final firebaseConfig = await _loadFromFirebase(pageId);
      if (firebaseConfig != null) {
        print('✅ PageConfigService: Found config in Firebase');
        return _enhanceConfigWithReportFrequency(firebaseConfig);
      }

      // If not found in Firebase, try Supabase
      print('🔍 PageConfigService: Not found in Firebase, trying Supabase...');
      final supabaseConfig = await _loadFromSupabase(pageId);
      if (supabaseConfig != null) {
        print('✅ PageConfigService: Found config in Supabase');
        return _enhanceConfigWithReportFrequency(supabaseConfig);
      }

      print('❌ PageConfigService: Config not found in either Firebase or Supabase');
      return null;
    } catch (error) {
      print('❌ PageConfigService: Error loading page config: $error');
      return null;
    }
  }

  /// Loads page configuration from Firebase
  static Future<Map<String, dynamic>?> _loadFromFirebase(String pageId) async {
    try {
      print('🔍 PageConfigService: Loading from Firebase...');
      
      final docRef = _firestore.collection('pages').doc(pageId);
      final docSnap = await docRef.get();

      if (docSnap.exists) {
        final data = docSnap.data();
        print('🔍 PageConfigService: Firebase data: $data');
        print('🔍 PageConfigService: selectedFrequency in Firebase: ${data?['selectedFrequency']}');
        return data;
      }

      return null;
    } catch (error) {
      print('❌ PageConfigService: Error loading from Firebase: $error');
      return null;
    }
  }

  /// Loads page configuration from Supabase
  static Future<Map<String, dynamic>?> _loadFromSupabase(String pageId) async {
    try {
      print('🔍 PageConfigService: Loading from Supabase...');
      
      final response = await _supabase
          .from('page_configurations')
          .select('*')
          .eq('id', pageId)
          .limit(1);

      if (response.isNotEmpty) {
        final data = response.first;
        print('🔍 PageConfigService: Supabase data: $data');
        print('🔍 PageConfigService: selected_frequency in Supabase: ${data['selected_frequency']}');
        
        // Convert Supabase format to Firebase format for consistency
        final convertedData = {
          'id': data['id'],
          'title': data['title'],
          'fields': data['fields'] ?? [],
          'lastUpdated': data['last_updated'],
          'selectedFrequency': data['selected_frequency'],
          'selectedRegions': data['selected_regions'] ?? [],
          'selectedDivisions': data['selected_divisions'] ?? [],
          'selectedOffices': data['selected_offices'] ?? [],
        };
        
        print('🔍 PageConfigService: Converted Supabase data: $convertedData');
        return convertedData;
      }

      return null;
    } catch (error) {
      print('❌ PageConfigService: Error loading from Supabase: $error');
      return null;
    }
  }

  /// Enhances page configuration by adding report frequency field if needed
  static Map<String, dynamic> _enhanceConfigWithReportFrequency(
      Map<String, dynamic> config) {
    try {
      print('🔍 PageConfigService: Enhancing config with report frequency...');
      
      final selectedFrequency = config['selectedFrequency'] as String?;
      print('🔍 PageConfigService: selectedFrequency: $selectedFrequency');
      
      if (selectedFrequency == null || selectedFrequency.isEmpty) {
        print('⚠️ PageConfigService: No selectedFrequency found, not adding field');
        return config;
      }

      final fields = config['fields'] as List<dynamic>? ?? [];
      print('🔍 PageConfigService: Current fields count: ${fields.length}');
      
      // Check if report frequency field already exists
      final hasReportFrequencyField = fields.any((field) {
        if (field is Map<String, dynamic>) {
          return field['id'] == 'reportFrequency';
        }
        return false;
      });
      
      print('🔍 PageConfigService: Has existing report frequency field: $hasReportFrequencyField');

      if (!hasReportFrequencyField) {
        print('✅ PageConfigService: Adding report frequency field with value: $selectedFrequency');
        
        // Create report frequency field
        final reportFrequencyField = {
          'id': 'reportFrequency',
          'label': 'Report Frequency',
          'type': 'text',
          'defaultValue': selectedFrequency,
          'required': false,
          'placeholder': 'Report frequency for this form',
          'disabled': true, // Mark as disabled for Flutter
        };

        // Add at the beginning of fields array
        final enhancedFields = [reportFrequencyField, ...fields];
        
        // Return enhanced config
        final enhancedConfig = Map<String, dynamic>.from(config);
        enhancedConfig['fields'] = enhancedFields;
        
        print('✅ PageConfigService: Enhanced fields count: ${enhancedFields.length}');
        return enhancedConfig;
      } else {
        print('⚠️ PageConfigService: Report frequency field already exists, not adding');
        return config;
      }
    } catch (error) {
      print('❌ PageConfigService: Error enhancing config: $error');
      return config;
    }
  }

  /// Gets the display value for a report frequency
  static String getFrequencyDisplayValue(String frequency) {
    switch (frequency.toLowerCase()) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      default:
        return frequency;
    }
  }
}
