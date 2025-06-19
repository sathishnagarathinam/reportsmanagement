import 'package:cloud_firestore/cloud_firestore.dart';

class FormField {
  final String id;
  final String label;
  final String type;
  final List<Map<String, String>>? options;
  final String? placeholder;
  final bool? required;
  final dynamic defaultValue;

  FormField({
    required this.id,
    required this.label,
    required this.type,
    this.options,
    this.placeholder,
    this.required,
    this.defaultValue,
  });

  factory FormField.fromMap(Map<String, dynamic> map) {
    return FormField(
      id: map['id'] ?? '',
      label: map['label'] ?? '',
      type: map['type'] ?? 'text',
      options: map['options'] != null
          ? List<Map<String, String>>.from(
              map['options'].map((x) => Map<String, String>.from(x)))
          : null,
      placeholder: map['placeholder'],
      required: map['required'],
      defaultValue: map['defaultValue'],
    );
  }
}

class FormConfig {
  final String id;
  final String? title;
  final List<FormField> fields;

  FormConfig({
    required this.id,
    this.title,
    required this.fields,
  });

  factory FormConfig.fromMap(Map<String, dynamic> map) {
    return FormConfig(
      id: map['id'] ?? '',
      title: map['title'],
      fields: map['fields'] != null
          ? List<FormField>.from(
              map['fields'].map((x) => FormField.fromMap(x)))
          : [],
    );
  }
}

class FormConfigService {
  static final Map<String, FormConfig> _cache = {};
  static final Map<String, Map<String, String>> _fieldMappingCache = {};

  /// Fetches form configuration from Firebase
  static Future<FormConfig?> getFormConfig(String formIdentifier) async {
    try {
      // Check cache first
      if (_cache.containsKey(formIdentifier)) {
        return _cache[formIdentifier];
      }

      print('🔍 FormConfigService: Fetching config for $formIdentifier');

      // Try different possible document paths
      final possiblePaths = [
        'pages/$formIdentifier',
        'formConfigs/$formIdentifier',
        'forms/$formIdentifier'
      ];

      for (final path in possiblePaths) {
        try {
          final docRef = FirebaseFirestore.instance.doc(path);
          final docSnap = await docRef.get();

          if (docSnap.exists) {
            final data = docSnap.data() as Map<String, dynamic>?;
            if (data != null && data['fields'] != null) {
              print('✅ FormConfigService: Found config at $path');
              final config = FormConfig.fromMap(data);
              _cache[formIdentifier] = config;
              return config;
            }
          }
        } catch (err) {
          print('❌ FormConfigService: Failed to fetch from $path: $err');
        }
      }

      print('⚠️ FormConfigService: No config found for $formIdentifier');
      return null;
    } catch (error) {
      print('FormConfigService: Error fetching form config: $error');
      return null;
    }
  }

  /// Gets field ID to label mapping for a form
  static Future<Map<String, String>> getFieldMapping(
      String formIdentifier) async {
    try {
      // Check cache first
      if (_fieldMappingCache.containsKey(formIdentifier)) {
        return _fieldMappingCache[formIdentifier]!;
      }

      final formConfig = await getFormConfig(formIdentifier);
      final mapping = <String, String>{};

      if (formConfig != null) {
        for (final field in formConfig.fields) {
          if (field.type != 'section' && field.type != 'button') {
            mapping[field.id] = field.label;
          }
        }
      }

      _fieldMappingCache[formIdentifier] = mapping;
      print(
          '📋 FormConfigService: Created field mapping for $formIdentifier: $mapping');
      return mapping;
    } catch (error) {
      print('FormConfigService: Error creating field mapping: $error');
      return {};
    }
  }

  /// Gets all unique field labels across multiple form types
  static Future<Set<String>> getAllFieldLabels(
      List<String> formIdentifiers) async {
    final allLabels = <String>{};

    for (final formId in formIdentifiers) {
      final mapping = await getFieldMapping(formId);
      allLabels.addAll(mapping.values);
    }

    return allLabels;
  }

  /// Converts submission data from field IDs to readable labels
  static Future<Map<String, dynamic>> convertSubmissionData(
    String formIdentifier,
    Map<String, dynamic> submissionData,
  ) async {
    try {
      final mapping = await getFieldMapping(formIdentifier);
      final convertedData = <String, dynamic>{};

      submissionData.forEach((fieldId, value) {
        final label = mapping[fieldId] ?? fieldId;
        convertedData[label] = value;
      });

      return convertedData;
    } catch (error) {
      print('FormConfigService: Error converting submission data: $error');
      return submissionData;
    }
  }

  /// Clears the cache
  static void clearCache() {
    _cache.clear();
    _fieldMappingCache.clear();
    print('FormConfigService: Cache cleared');
  }
}
