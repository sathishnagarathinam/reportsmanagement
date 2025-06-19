import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart'; // Import Firebase Auth
import 'package:supabase_flutter/supabase_flutter.dart'; // Import Supabase
import 'package:intl/intl.dart'; // Import for date formatting
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../services/form_filtering_service.dart';
import '../services/office_service.dart'; // Import the office service
import '../services/page_config_service.dart'; // Import the page config service
import '../services/file_upload_service.dart';
import '../services/storage_setup_service.dart';

class DynamicPageScreen extends StatefulWidget {
  final String pageId;

  const DynamicPageScreen({Key? key, required this.pageId}) : super(key: key);

  @override
  _DynamicPageScreenState createState() => _DynamicPageScreenState();
}

class _DynamicPageScreenState extends State<DynamicPageScreen> {
  Map<String, dynamic>? _pageConfiguration;
  bool _isLoading = true;
  String? _errorMessage;
  // To store form data
  final Map<String, dynamic> _formData = {};
  final _formKey = GlobalKey<FormState>(); // For form validation
  bool _isSubmitting = false; // To track submission state
  bool _isClearing = false; // To track form clearing state

  // Text controllers for proper form clearing
  final Map<String, TextEditingController> _textControllers = {};

  // Office name dropdown specific state
  Map<String, List<String>> _officeNameOptions =
      {}; // Cache for office names by field ID
  Map<String, bool> _officeNameLoading =
      {}; // Loading state for office name fields
  Map<String, String?> _officeNameErrors =
      {}; // Error state for office name fields

  // Office access validation state
  bool _accessValidated = false;
  bool _hasAccess = false;
  bool _accessLoading = true;
  String? _accessError;

  // File upload state
  final Map<String, List<File>> _selectedFiles =
      {}; // Files selected for each field
  final Map<String, List<String>> _uploadedFileUrls =
      {}; // URLs of uploaded files for each field
  final Map<String, bool> _fileUploadLoading =
      {}; // Loading state for file uploads
  final ImagePicker _imagePicker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _validateAccess();
    _fetchPageConfiguration();
  }

  /// Validates if the current user has access to this form
  Future<void> _validateAccess() async {
    setState(() {
      _accessLoading = true;
      _accessError = null;
    });

    try {
      print('🔒 DynamicPage: Validating access for form: ${widget.pageId}');

      final hasFormAccess =
          await FormFilteringService.canUserAccessForm(widget.pageId);

      setState(() {
        _hasAccess = hasFormAccess;
        _accessValidated = true;
        _accessLoading = false;
      });

      print(
          '🔒 DynamicPage: Access ${hasFormAccess ? 'GRANTED' : 'DENIED'} for form: ${widget.pageId}');

      if (!hasFormAccess) {
        setState(() {
          _accessError =
              'Access denied: This form is not available for your office.';
        });
      }
    } catch (error) {
      print('❌ DynamicPage: Error validating access: $error');
      setState(() {
        _accessError = 'Error validating form access. Please try again.';
        _hasAccess = false;
        _accessLoading = false;
      });
    }
  }

  @override
  void dispose() {
    // Dispose all text controllers to prevent memory leaks
    for (var controller in _textControllers.values) {
      controller.dispose();
    }
    _textControllers.clear();
    super.dispose();
  }

  // Helper method to get or create a text controller for a field
  TextEditingController _getTextController(String fieldId) {
    if (!_textControllers.containsKey(fieldId)) {
      _textControllers[fieldId] = TextEditingController();
    }
    return _textControllers[fieldId]!;
  }

  /// Fetches office names for a specific field ID
  /// This method is called when a dropdown field with label "Office Name" is encountered
  Future<void> _fetchOfficeNamesForField(String fieldId) async {
    // Check if we already have data for this field
    if (_officeNameOptions.containsKey(fieldId) &&
        _officeNameOptions[fieldId]!.isNotEmpty) {
      return;
    }

    setState(() {
      _officeNameLoading[fieldId] = true;
      _officeNameErrors[fieldId] = null;
    });

    try {
      // Use user-specific filtering for Office Name dropdowns
      List<String> officeNames =
          await OfficeService.fetchUserSpecificOfficeNames();

      setState(() {
        _officeNameOptions[fieldId] = officeNames;
        _officeNameLoading[fieldId] = false;
      });
    } catch (e) {
      setState(() {
        _officeNameLoading[fieldId] = false;
        _officeNameErrors[fieldId] = 'Failed to load office names: $e';
      });
    }
  }

  /// Builds a special dropdown widget for "Office Name" fields
  /// This widget automatically fetches office names from Supabase
  Widget _buildOfficeNameDropdown(Map<String, dynamic> fieldConfig,
      String fieldId, String label, String? placeholder) {
    // Trigger fetch if not already done
    if (!_officeNameOptions.containsKey(fieldId) &&
        !(_officeNameLoading[fieldId] ?? false)) {
      _fetchOfficeNamesForField(fieldId);
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DropdownButtonFormField<String>(
            decoration: InputDecoration(
              labelText: label,
              border: const OutlineInputBorder(),
              suffixIcon: _officeNameLoading[fieldId] == true
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: Padding(
                        padding: EdgeInsets.all(12.0),
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  : null,
            ),
            value: _formData[fieldId]?.toString(),
            hint: Text(placeholder ?? 'Select $label'),
            isExpanded: true,
            items: _buildOfficeNameDropdownItems(fieldId),
            onChanged: _officeNameLoading[fieldId] == true
                ? null // Disable dropdown while loading
                : (String? newValue) {
                    setState(() {
                      _formData[fieldId] = newValue;
                    });
                  },
            onSaved: (value) {
              _formData[fieldId] = value;
            },
            validator: (value) {
              if (fieldConfig['required'] == true && value == null) {
                return '$label is required';
              }
              return null;
            },
          ),
          // Show error message if there's an error loading office names
          if (_officeNameErrors[fieldId] != null)
            Padding(
              padding: const EdgeInsets.only(top: 8.0),
              child: Row(
                children: [
                  const Icon(Icons.error, color: Colors.red, size: 16),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      _officeNameErrors[fieldId]!,
                      style: const TextStyle(color: Colors.red, fontSize: 12),
                    ),
                  ),
                  TextButton(
                    onPressed: () => _fetchOfficeNamesForField(fieldId),
                    child: const Text('Retry', style: TextStyle(fontSize: 12)),
                  ),
                ],
              ),
            ),
          // Show loading indicator with text
          if (_officeNameLoading[fieldId] == true)
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
                    'Loading office names...',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  /// Builds dropdown menu items for office names
  List<DropdownMenuItem<String>>? _buildOfficeNameDropdownItems(
      String fieldId) {
    List<String>? officeNames = _officeNameOptions[fieldId];

    if (officeNames == null || officeNames.isEmpty) {
      return [];
    }

    return officeNames.map<DropdownMenuItem<String>>((String officeName) {
      return DropdownMenuItem<String>(
        value: officeName,
        child: Text(officeName),
      );
    }).toList();
  }

  Future<void> _fetchPageConfiguration() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      print('🔍 DynamicPage: Loading page configuration for: ${widget.pageId}');

      // Use the new PageConfigService that handles Firebase + Supabase + report frequency
      final pageConfig = await PageConfigService.loadPageConfig(widget.pageId);

      if (pageConfig != null) {
        _pageConfiguration = pageConfig;
        print(
            '✅ DynamicPage: Page configuration loaded with ${pageConfig['fields']?.length ?? 0} fields');
        print(
            '🔍 DynamicPage: selectedFrequency: ${pageConfig['selectedFrequency']}');

        // Initialize form data with default values including report frequency
        _initializeFormDataWithDefaults();
      } else {
        _errorMessage = 'Page configuration not found for ID: ${widget.pageId}';
        print('❌ DynamicPage: $_errorMessage');
      }
    } catch (e) {
      _errorMessage = 'Error fetching page configuration: $e';
      print('❌ DynamicPage: $_errorMessage');
    }
    setState(() {
      _isLoading = false;
    });
  }

  /// Initialize form data with default values from field configurations
  void _initializeFormDataWithDefaults() {
    if (_pageConfiguration == null || _pageConfiguration!['fields'] == null) {
      return;
    }

    final fields = _pageConfiguration!['fields'] as List<dynamic>;
    print('🔍 DynamicPage: Initializing form data for ${fields.length} fields');

    for (var fieldConfig in fields) {
      if (fieldConfig is Map<String, dynamic>) {
        final fieldId = fieldConfig['id'] as String? ?? '';
        final defaultValue = fieldConfig['defaultValue'];
        final fieldType = fieldConfig['type'] as String? ?? 'text';

        if (fieldId.isNotEmpty && defaultValue != null) {
          _formData[fieldId] = defaultValue;
          print(
              '🔍 DynamicPage: Set default value for $fieldId ($fieldType): $defaultValue');

          // Update text controller if it's a text field
          if ((fieldType == 'text' || fieldType == 'textField') &&
              _textControllers.containsKey(fieldId)) {
            _textControllers[fieldId]!.text = defaultValue.toString();
          }
        }
      }
    }

    print('🔍 DynamicPage: Form data initialized: $_formData');
  }

  // Helper function to build a widget based on field configuration
  Widget _buildWidgetForField(Map<String, dynamic> fieldConfig) {
    String type = fieldConfig['type'] as String? ??
        'label'; // Default to label if type is missing
    String label = fieldConfig['label'] as String? ?? '';
    String? placeholder = fieldConfig['placeholder'] as String?;
    String fieldId = fieldConfig['id'] as String? ??
        label.replaceAll(' ', '_').toLowerCase(); // Generate an ID if missing

    // Initialize form data for this field if not already present
    if (!_formData.containsKey(fieldId)) {
      _formData[fieldId] = null; // Or some default value based on type
    }

    switch (type) {
      case 'label':
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8.0),
          child: Text(
            fieldConfig['text'] as String? ??
                label, // Use 'text' for labels, fallback to 'label'
            style: TextStyle(
              fontSize: (fieldConfig['style']?['fontSize'] as num? ?? 16.0)
                  .toDouble(),
              fontWeight: (fieldConfig['style']?['fontWeight'] == 'bold')
                  ? FontWeight.bold
                  : FontWeight.normal,
            ),
          ),
        );
      case 'text': // Alias for textField
      case 'textField':
        final controller = _getTextController(fieldId);
        // Check if this is the report frequency field
        final isReportFrequency = fieldId == 'reportFrequency';
        final isDisabled = fieldConfig['disabled'] == true || isReportFrequency;

        // Synchronize controller with current form data state (but not during clearing)
        if (!_isClearing) {
          final currentFormValue = _formData[fieldId]?.toString() ?? '';
          if (controller.text != currentFormValue) {
            controller.text = currentFormValue;
          }
        }

        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8.0),
          child: TextFormField(
            controller: controller,
            enabled:
                !isDisabled, // Disable if it's report frequency or marked as disabled
            decoration: InputDecoration(
              labelText: label,
              hintText: placeholder,
              border: const OutlineInputBorder(),
              filled: isDisabled,
              fillColor: isDisabled ? Colors.grey[100] : null,
              suffixIcon: isReportFrequency
                  ? const Icon(Icons.schedule, color: Colors.grey)
                  : null,
            ),
            style: TextStyle(
              color: isDisabled ? Colors.grey[600] : null,
            ),
            onChanged: (value) {
              if (!_isClearing && !isDisabled) {
                _formData[fieldId] = value;
              }
            },
            onSaved: (value) {
              _formData[fieldId] = value;
            },
            validator: (value) {
              // Skip validation for disabled fields like report frequency
              if (isDisabled) return null;

              // Basic validation: required field
              if (fieldConfig['required'] == true &&
                  (value == null || value.isEmpty)) {
                return '$label is required';
              }
              return null;
            },
          ),
        );
      case 'number':
        final controller = _getTextController(fieldId);
        // Synchronize controller with current form data state (but not during clearing)
        if (!_isClearing) {
          final currentFormValue = _formData[fieldId]?.toString() ?? '';
          if (controller.text != currentFormValue) {
            controller.text = currentFormValue;
          }
        }
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8.0),
          child: TextFormField(
            controller: controller,
            decoration: InputDecoration(
              labelText: label,
              hintText: placeholder,
              border: const OutlineInputBorder(),
            ),
            keyboardType: TextInputType.number, // Set keyboard type to number
            onChanged: (value) {
              if (!_isClearing) {
                _formData[fieldId] = double.tryParse(value);
              }
            },
            onSaved: (value) {
              _formData[fieldId] =
                  double.tryParse(value ?? ''); // Save as double or int
            },
            validator: (value) {
              if (fieldConfig['required'] == true &&
                  (value == null || value.isEmpty)) {
                return '$label is required';
              }
              if (value != null &&
                  value.isNotEmpty &&
                  double.tryParse(value) == null) {
                return 'Please enter a valid number';
              }
              return null;
            },
          ),
        );
      case 'dropdown':
        // Check if this is an "Office Name" dropdown field
        if (label == 'Office Name') {
          return _buildOfficeNameDropdown(
              fieldConfig, fieldId, label, placeholder);
        }

        // Regular dropdown handling for other fields
        List<Map<String, dynamic>> parsedOptions = [];
        if (fieldConfig['options'] is List) {
          for (var option in fieldConfig['options']) {
            if (option is String) {
              parsedOptions.add({'label': option, 'value': option});
            } else if (option is Map<String, dynamic>) {
              parsedOptions.add(option);
            }
          }
        }

        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8.0),
          child: DropdownButtonFormField<String>(
            decoration: InputDecoration(
              labelText: label,
              border: const OutlineInputBorder(),
            ),
            value: _formData[fieldId]?.toString(),
            hint: Text(placeholder ?? 'Select $label'),
            isExpanded: true,
            items: parsedOptions
                .map<DropdownMenuItem<String>>((Map<String, dynamic> option) {
              return DropdownMenuItem<String>(
                value: option['value'] as String?,
                child: Text(option['label'] as String? ??
                    option['value'] as String? ??
                    ''),
              );
            }).toList(),
            onChanged: (String? newValue) {
              setState(() {
                _formData[fieldId] = newValue;
              });
            },
            onSaved: (value) {
              _formData[fieldId] = value;
            },
            validator: (value) {
              if (fieldConfig['required'] == true && value == null) {
                return '$label is required';
              }
              return null;
            },
          ),
        );
      case 'textarea':
        final controller = _getTextController(fieldId);
        // Synchronize controller with current form data state (but not during clearing)
        if (!_isClearing) {
          final currentFormValue = _formData[fieldId]?.toString() ?? '';
          if (controller.text != currentFormValue) {
            controller.text = currentFormValue;
          }
        }
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8.0),
          child: TextFormField(
            controller: controller,
            decoration: InputDecoration(
              labelText: label,
              hintText: placeholder,
              border: const OutlineInputBorder(),
            ),
            onChanged: (value) {
              if (!_isClearing) {
                _formData[fieldId] = value;
              }
            },
            onSaved: (value) {
              _formData[fieldId] = value;
            },
            validator: (value) {
              if (fieldConfig['required'] == true &&
                  (value == null || value.isEmpty)) {
                return '$label is required';
              }
              return null;
            },
            maxLines: 5, // Allow multiple lines for text area
            keyboardType: TextInputType.multiline,
          ),
        );
      case 'date':
        final controller = _getTextController(fieldId);
        // Update controller text when form data changes
        final dateValue = _formData[fieldId] != null
            ? _formData[fieldId].toString().split(' ')[0]
            : '';
        if (controller.text != dateValue) {
          controller.text = dateValue;
        }
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8.0),
          child: TextFormField(
            decoration: InputDecoration(
              labelText: label,
              hintText: placeholder ?? 'Select Date',
              border: const OutlineInputBorder(),
              suffixIcon: const Icon(Icons.calendar_today),
            ),
            readOnly: true,
            controller: controller,
            onTap: () async {
              DateTime? pickedDate = await showDatePicker(
                context: context,
                initialDate: DateTime.now(),
                firstDate: DateTime(2000),
                lastDate: DateTime(2101),
              );
              if (pickedDate != null) {
                setState(() {
                  _formData[fieldId] =
                      pickedDate.toIso8601String(); // Store as ISO string
                  // Update controller text immediately
                  controller.text = pickedDate.toIso8601String().split(' ')[0];
                });
              }
            },
            validator: (value) {
              if (fieldConfig['required'] == true &&
                  (value == null || value.isEmpty)) {
                return '$label is required';
              }
              return null;
            },
          ),
        );
      case 'file':
        return _buildFileUploadField(fieldConfig, fieldId, label);
      case 'checkbox':
        return CheckboxListTile(
          title: Text(label),
          value: _formData[fieldId] ?? false,
          onChanged: (bool? newValue) {
            setState(() {
              _formData[fieldId] = newValue;
            });
          },
          controlAffinity: ListTileControlAffinity.leading,
        );
      case 'radio':
        List<Map<String, dynamic>> parsedOptions = [];
        if (fieldConfig['options'] is List) {
          for (var option in fieldConfig['options']) {
            if (option is String) {
              parsedOptions.add({'label': option, 'value': option});
            } else if (option is Map<String, dynamic>) {
              parsedOptions.add(option);
            }
          }
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.titleMedium),
            ...parsedOptions.map((option) => RadioListTile<String>(
                  title: Text(option['label'] as String? ??
                      option['value'] as String? ??
                      ''),
                  value: option['value'] as String? ??
                      '', // Ensure value is non-nullable
                  groupValue: _formData[fieldId],
                  onChanged: (String? newValue) {
                    setState(() {
                      _formData[fieldId] = newValue;
                    });
                  },
                )),
          ],
        );
      case 'checkbox-group':
        List<Map<String, dynamic>> parsedOptions = [];
        if (fieldConfig['options'] is List) {
          for (var option in fieldConfig['options']) {
            if (option is String) {
              parsedOptions.add({'label': option, 'value': option});
            } else if (option is Map<String, dynamic>) {
              parsedOptions.add(option);
            }
          }
        }
        // Initialize as a list if not already
        if (!(_formData[fieldId] is List)) {
          _formData[fieldId] = [];
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.titleMedium),
            ...parsedOptions.map((option) => CheckboxListTile(
                  title: Text(option['label'] as String? ??
                      option['value'] as String? ??
                      ''),
                  value: (_formData[fieldId] as List).contains(option['value']),
                  onChanged: (bool? newValue) {
                    setState(() {
                      if (newValue == true) {
                        (_formData[fieldId] as List).add(option['value']);
                      } else {
                        (_formData[fieldId] as List).remove(option['value']);
                      }
                    });
                  },
                )),
          ],
        );
      case 'switch':
        return SwitchListTile(
          title: Text(label),
          value: _formData[fieldId] ?? false,
          onChanged: (bool newValue) {
            setState(() {
              _formData[fieldId] = newValue;
            });
          },
        );
      case 'section':
        // Sections are typically used for layout and grouping, not direct input.
        // You might render a title and then expect nested fields (which would be handled by the parent loop).
        // For now, just display the section title.
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 16.0),
          child: Text(
            fieldConfig['sectionTitle'] as String? ?? label,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
        );
      case 'button':
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8.0),
          child: ElevatedButton(
            onPressed: () {
              // Buttons in dynamic forms might trigger specific actions.
              // For now, we'll just show a snackbar.
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                    content:
                        Text('${fieldConfig['buttonText'] ?? label} pressed!')),
              );
              // You might want to add more complex logic here based on fieldConfig['onClickAction']
            },
            child: Text(fieldConfig['buttonText'] as String? ?? label),
          ),
        );
      default:
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8.0),
          child: Text('Unsupported field type: $type for "$label"'),
        );
    }
  }

  /// Builds a file upload field widget
  Widget _buildFileUploadField(
      Map<String, dynamic> fieldConfig, String fieldId, String label) {
    // Initialize file lists for this field if not already present
    if (!_selectedFiles.containsKey(fieldId)) {
      _selectedFiles[fieldId] = [];
    }
    if (!_uploadedFileUrls.containsKey(fieldId)) {
      _uploadedFileUrls[fieldId] = [];
    }

    final bool allowMultiple = fieldConfig['allowMultiple'] == true;
    final List<String>? allowedExtensions =
        fieldConfig['allowedExtensions'] != null
            ? List<String>.from(fieldConfig['allowedExtensions'])
            : null;
    final int? maxFileSizeInMB = fieldConfig['maxFileSizeInMB'] as int?;
    final bool isRequired = fieldConfig['required'] == true;
    final bool isUploading = _fileUploadLoading[fieldId] == true;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Card(
        elevation: 2,
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Field label
              Row(
                children: [
                  Icon(Icons.cloud_upload,
                      color: Theme.of(context).primaryColor),
                  const SizedBox(width: 8),
                  Text(
                    label,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  if (isRequired)
                    const Text(' *', style: TextStyle(color: Colors.red)),
                ],
              ),
              const SizedBox(height: 12),

              // File selection buttons
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ElevatedButton.icon(
                    onPressed: isUploading
                        ? null
                        : () => _pickFiles(
                            fieldId, allowedExtensions, allowMultiple),
                    icon: const Icon(Icons.folder_open, size: 18),
                    label: const Text('Pick Files'),
                  ),
                  ElevatedButton.icon(
                    onPressed: isUploading
                        ? null
                        : () => _pickImageFromGallery(fieldId),
                    icon: const Icon(Icons.photo_library, size: 18),
                    label: const Text('Gallery'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: isUploading
                        ? null
                        : () => _pickImageFromCamera(fieldId),
                    icon: const Icon(Icons.camera_alt, size: 18),
                    label: const Text('Camera'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Selected files list
              if (_selectedFiles[fieldId]!.isNotEmpty) ...[
                Text(
                  'Selected Files (${_selectedFiles[fieldId]!.length})',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                ..._selectedFiles[fieldId]!.asMap().entries.map((entry) {
                  final index = entry.key;
                  final file = entry.value;
                  return _buildFileItem(fieldId, file, index, isUploading);
                }),
                const SizedBox(height: 12),
              ],

              // Upload progress
              if (isUploading) ...[
                const Text('Uploading files...',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                const LinearProgressIndicator(),
                const SizedBox(height: 12),
              ],

              // Uploaded files (URLs stored in form data)
              if (_uploadedFileUrls[fieldId]!.isNotEmpty) ...[
                Text(
                  'Uploaded Files (${_uploadedFileUrls[fieldId]!.length})',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, color: Colors.green),
                ),
                const SizedBox(height: 8),
                ..._uploadedFileUrls[fieldId]!.asMap().entries.map((entry) {
                  final index = entry.key;
                  final url = entry.value;
                  return _buildUploadedFileItem(fieldId, url, index);
                }),
                const SizedBox(height: 12),
              ],

              // Upload button
              if (_selectedFiles[fieldId]!.isNotEmpty && !isUploading)
                ElevatedButton.icon(
                  onPressed: () => _uploadFiles(fieldId),
                  icon: const Icon(Icons.cloud_upload, size: 18),
                  label: const Text('Upload Files'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                  ),
                ),

              // Validation message
              if (isRequired && _uploadedFileUrls[fieldId]!.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: 8.0),
                  child: Text(
                    'At least one file is required',
                    style: TextStyle(color: Colors.red, fontSize: 12),
                  ),
                ),

              // File constraints info
              if (allowedExtensions != null || maxFileSizeInMB != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text(
                    _buildConstraintsText(allowedExtensions, maxFileSizeInMB),
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  /// File selection methods
  Future<void> _pickFiles(String fieldId, List<String>? allowedExtensions,
      bool allowMultiple) async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        allowMultiple: allowMultiple,
        type: allowedExtensions != null ? FileType.custom : FileType.any,
        allowedExtensions: allowedExtensions,
      );

      if (result != null) {
        final files = result.files
            .where((file) => file.path != null)
            .map((file) => File(file.path!))
            .toList();

        setState(() {
          if (allowMultiple) {
            _selectedFiles[fieldId]!.addAll(files);
          } else {
            _selectedFiles[fieldId] = files.take(1).toList();
          }
        });

        _showSnackBar('${files.length} file(s) selected', Colors.green);
      }
    } catch (error) {
      _showSnackBar('Error selecting files: $error', Colors.red);
    }
  }

  Future<void> _pickImageFromGallery(String fieldId) async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 80,
      );

      if (image != null) {
        setState(() {
          _selectedFiles[fieldId]!.add(File(image.path));
        });
        _showSnackBar('Image selected from gallery', Colors.green);
      }
    } catch (error) {
      _showSnackBar('Error selecting image: $error', Colors.red);
    }
  }

  Future<void> _pickImageFromCamera(String fieldId) async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: 80,
      );

      if (image != null) {
        setState(() {
          _selectedFiles[fieldId]!.add(File(image.path));
        });
        _showSnackBar('Image captured from camera', Colors.green);
      }
    } catch (error) {
      _showSnackBar('Error capturing image: $error', Colors.red);
    }
  }

  /// Upload files for a specific field
  Future<void> _uploadFiles(String fieldId) async {
    if (_selectedFiles[fieldId]!.isEmpty) return;

    setState(() {
      _fileUploadLoading[fieldId] = true;
    });

    try {
      final supabase = Supabase.instance.client;

      // First, ensure the uploads bucket exists
      print('🔍 Ensuring uploads bucket exists...');
      try {
        // Try to list files in the bucket to check if it exists
        await supabase.storage.from('uploads').list();
        print('✅ Uploads bucket exists');
      } catch (bucketError) {
        print('❌ Uploads bucket not found, attempting to create...');
        try {
          // Create the bucket
          await supabase.storage.createBucket(
            'uploads',
            const BucketOptions(
              public: true,
            ),
          );
          print('✅ Uploads bucket created successfully');
        } catch (createError) {
          throw Exception('Failed to create uploads bucket: $createError');
        }
      }

      final uploadedUrls = <String>[];

      for (final file in _selectedFiles[fieldId]!) {
        final fileName =
            '${DateTime.now().millisecondsSinceEpoch}_${file.path.split('/').last}';

        try {
          // Read file bytes
          final bytes = await file.readAsBytes();

          // Upload to Supabase Storage
          await supabase.storage.from('uploads').uploadBinary(
                'form-files/$fileName',
                bytes,
                fileOptions: const FileOptions(upsert: false),
              );

          // Get public URL
          final publicUrl = supabase.storage
              .from('uploads')
              .getPublicUrl('form-files/$fileName');

          uploadedUrls.add(publicUrl);
        } catch (error) {
          print('Error uploading file ${file.path}: $error');
        }
      }

      setState(() {
        _uploadedFileUrls[fieldId]!.addAll(uploadedUrls);
        _selectedFiles[fieldId]!.clear(); // Clear selected files after upload

        // Store URLs in form data
        _formData[fieldId] = _uploadedFileUrls[fieldId];
      });

      _showSnackBar(
        '${uploadedUrls.length} file(s) uploaded successfully',
        Colors.green,
      );
    } catch (error) {
      _showSnackBar('Upload failed: $error', Colors.red);
    } finally {
      setState(() {
        _fileUploadLoading[fieldId] = false;
      });
    }
  }

  /// Helper methods for file upload UI
  Widget _buildFileItem(
      String fieldId, File file, int index, bool isUploading) {
    final fileName = file.path.split('/').last;
    final fileSize = _getFileSizeString(file.lengthSync());
    final fileIcon = _getFileIcon(file.path);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(fileIcon, color: Theme.of(context).primaryColor),
        title: Text(fileName, style: const TextStyle(fontSize: 14)),
        subtitle: Text(fileSize, style: const TextStyle(fontSize: 12)),
        trailing: IconButton(
          icon: const Icon(Icons.close, color: Colors.red),
          onPressed:
              isUploading ? null : () => _removeSelectedFile(fieldId, index),
        ),
      ),
    );
  }

  Widget _buildUploadedFileItem(String fieldId, String url, int index) {
    final fileName = url.split('/').last;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: const Icon(Icons.check_circle, color: Colors.green),
        title: Text(fileName, style: const TextStyle(fontSize: 14)),
        subtitle: const Text('Uploaded successfully',
            style: TextStyle(fontSize: 12, color: Colors.green)),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.open_in_new, color: Colors.blue),
              onPressed: () => _showUrlDialog(url),
              tooltip: 'View URL',
            ),
            IconButton(
              icon: const Icon(Icons.delete, color: Colors.red),
              onPressed: () => _removeUploadedFile(fieldId, index),
              tooltip: 'Remove',
            ),
          ],
        ),
      ),
    );
  }

  void _removeSelectedFile(String fieldId, int index) {
    setState(() {
      _selectedFiles[fieldId]!.removeAt(index);
    });
  }

  void _removeUploadedFile(String fieldId, int index) {
    setState(() {
      _uploadedFileUrls[fieldId]!.removeAt(index);
      // Update form data
      _formData[fieldId] = _uploadedFileUrls[fieldId];
    });
  }

  String _buildConstraintsText(
      List<String>? allowedExtensions, int? maxFileSizeInMB) {
    final constraints = <String>[];

    if (allowedExtensions != null && allowedExtensions.isNotEmpty) {
      constraints.add('Allowed: ${allowedExtensions.join(', ')}');
    }

    if (maxFileSizeInMB != null) {
      constraints.add('Max size: ${maxFileSizeInMB}MB');
    }

    return constraints.join(' • ');
  }

  String _getFileSizeString(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024)
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }

  IconData _getFileIcon(String filePath) {
    final extension = filePath.split('.').last.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].contains(extension)) {
      return Icons.image;
    } else if (['pdf', 'doc', 'docx', 'txt', 'rtf'].contains(extension)) {
      return Icons.description;
    } else if (['mp4', 'avi', 'mov', 'wmv', 'flv'].contains(extension)) {
      return Icons.video_file;
    } else if (['mp3', 'wav', 'aac', 'ogg', 'wma'].contains(extension)) {
      return Icons.audio_file;
    }
    return Icons.insert_drive_file;
  }

  void _showSnackBar(String message, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: color,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _showUrlDialog(String url) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('File URL'),
        content: SelectableText(url),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Widget _buildPageContent() {
    if (_pageConfiguration == null) {
      return const Center(child: Text('No page configuration to display.'));
    }

    String pageTitle =
        _pageConfiguration!['title'] as String? ?? 'Dynamic Page';
    List<Widget> formFields = [];

    if (_pageConfiguration!['fields'] is List) {
      for (var fieldConfigUntyped in (_pageConfiguration!['fields'] as List)) {
        if (fieldConfigUntyped is Map<String, dynamic>) {
          formFields.add(_buildWidgetForField(fieldConfigUntyped));
        } else {
          print(
              'Warning: fieldConfig is not a Map<String, dynamic>: $fieldConfigUntyped');
        }
      }
    }

    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(16.0),
        children: <Widget>[
          Text(pageTitle, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 20),
          ...formFields, // Spread the list of generated widgets
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () {
              if (_formKey.currentState!.validate()) {
                _formKey.currentState!.save();
                // Process the _formData
                print('Form data submitted: $_formData');
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                      content: Text('Form submitted (see console for data)')),
                );
                // Here you would typically send the data to Firestore or an API
              }
            },
            child: const Text('Submit'),
          )
        ],
      ),
    );
  }

  Future<void> _submitDynamicFormToSupabase() async {
    if (_formKey.currentState!.validate()) {
      _formKey.currentState!.save(); // Ensure all onSaved callbacks are called

      // Create a map to store field labels for display
      Map<String, String> fieldLabels = {};
      if (_pageConfiguration != null && _pageConfiguration!['fields'] is List) {
        for (var fieldConfigUntyped
            in (_pageConfiguration!['fields'] as List)) {
          if (fieldConfigUntyped is Map<String, dynamic>) {
            String label = fieldConfigUntyped['label'] as String? ?? '';
            String fieldId = fieldConfigUntyped['id'] as String? ??
                label.replaceAll(' ', '_').toLowerCase();
            if (label.isNotEmpty) {
              fieldLabels[fieldId] = label;
            }
          }
        }
      }

      // Extract office name and date for duplicate checking
      // NOTE: Date checking is based on the actual date field value, not submission timestamp
      final String? officeName = _extractOfficeNameFromForm();
      final String? submissionDate = _extractDateFromForm();
      final String formIdentifier =
          _pageConfiguration?['formIdentifier'] as String? ?? widget.pageId;

      print(
          '🔍 Duplicate check - Office: $officeName, Date: $submissionDate, Form: $formIdentifier');

      // Enhanced validation for duplicate checking
      if (officeName == null || officeName.isEmpty) {
        print('⚠️ Warning: No office name found for duplicate checking');
        if (mounted) {
          final shouldContinue = await showDialog<bool>(
                context: context,
                barrierDismissible: false,
                builder: (BuildContext context) {
                  return AlertDialog(
                    title: const Row(
                      children: [
                        Icon(Icons.warning, color: Colors.orange),
                        SizedBox(width: 8),
                        Text('Missing Office Information'),
                      ],
                    ),
                    content: const Text(
                      'Office name is required for duplicate checking. '
                      'Without it, duplicate submissions cannot be prevented. '
                      'Do you want to continue anyway?',
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(false),
                        child: const Text('Cancel'),
                      ),
                      ElevatedButton(
                        onPressed: () => Navigator.of(context).pop(true),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.orange,
                          foregroundColor: Colors.white,
                        ),
                        child: const Text('Continue'),
                      ),
                    ],
                  );
                },
              ) ??
              false;

          if (!shouldContinue) {
            print('🚫 User cancelled submission due to missing office name');
            return;
          }
        }
      }

      if (submissionDate == null || submissionDate.isEmpty) {
        print('⚠️ Warning: No date found for duplicate checking');
        if (mounted) {
          final shouldContinue = await showDialog<bool>(
                context: context,
                barrierDismissible: false,
                builder: (BuildContext context) {
                  return AlertDialog(
                    title: const Row(
                      children: [
                        Icon(Icons.warning, color: Colors.orange),
                        SizedBox(width: 8),
                        Text('Missing Date Information'),
                      ],
                    ),
                    content: const Text(
                      'Date is required for duplicate checking. '
                      'Without it, duplicate submissions cannot be prevented. '
                      'Do you want to continue anyway?',
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(false),
                        child: const Text('Cancel'),
                      ),
                      ElevatedButton(
                        onPressed: () => Navigator.of(context).pop(true),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.orange,
                          foregroundColor: Colors.white,
                        ),
                        child: const Text('Continue'),
                      ),
                    ],
                  );
                },
              ) ??
              false;

          if (!shouldContinue) {
            print('🚫 User cancelled submission due to missing date');
            return;
          }
        }
      }

      // Check for duplicate submission
      Map<String, dynamic>? existingSubmission;
      try {
        existingSubmission = await _checkForDuplicateSubmission(
          formIdentifier,
          officeName,
          submissionDate,
        );
      } catch (error) {
        print('❌ Error checking for duplicates: $error');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content:
                    Text('Error checking for existing submissions: $error')),
          );
        }
        return;
      }

      // Handle duplicate submission if found
      bool isUpdate = false;
      if (existingSubmission != null) {
        print('⚠️ Duplicate submission found: ${existingSubmission['id']}');

        // Show duplicate warning dialog
        final userChoice = await _showDuplicateWarningDialog(
          officeName ?? 'Unknown Office',
          submissionDate ?? 'Unknown Date',
          existingSubmission,
          fieldLabels,
        );

        if (userChoice == null || userChoice == 'cancel') {
          print('🚫 User cancelled duplicate submission');
          return; // User cancelled
        } else if (userChoice == 'update') {
          print('✅ User confirmed update of existing submission');
          isUpdate = true;
        }
      }

      // Show confirmation dialog (for new submissions or after duplicate confirmation)
      bool confirm = await showDialog(
            context: context,
            builder: (BuildContext context) {
              return AlertDialog(
                title: const Text('Confirm Submission'),
                content: SingleChildScrollView(
                  child: ListBody(
                    children: _formData.entries.map((entry) {
                      String displayLabel = fieldLabels[entry.key] ??
                          entry.key; // Use label if available, otherwise use ID
                      return Text('$displayLabel: ${entry.value}');
                    }).toList(),
                  ),
                ),
                actions: <Widget>[
                  TextButton(
                    child: const Text('Cancel'),
                    onPressed: () {
                      Navigator.of(context).pop(false);
                    },
                  ),
                  TextButton(
                    child: const Text('Confirm'),
                    onPressed: () {
                      Navigator.of(context).pop(true);
                    },
                  ),
                ],
              );
            },
          ) ??
          false; // Ensure it's not null

      if (!confirm) {
        return; // If user cancels, do not proceed with submission
      }

      setState(() {
        _isSubmitting = true;
      });

      final supabase = Supabase.instance.client;

      // Get readable employee ID from current user's profile
      final readableEmployeeId = await _getReadableEmployeeId();
      print('🔍 Readable Employee ID: $readableEmployeeId');

      try {
        // Use Firebase Auth + Supabase anon access (same as React)
        final firebaseUser = FirebaseAuth.instance.currentUser;
        final userId = firebaseUser?.uid;

        print('🔍 Form submission - Firebase User: ${firebaseUser?.uid}');
        print(
            '🔍 Form submission - Firebase User Email: ${firebaseUser?.email}');
        print('🔍 Form submission - Employee ID: $readableEmployeeId');

        if (userId == null) {
          throw Exception(
              'User not authenticated in Firebase. Please log in again.');
        }

        print(
            '🔍 About to ${isUpdate ? 'update' : 'insert'} to Supabase (using Firebase auth + Supabase anon like React):');
        print('  - form_identifier: $formIdentifier');
        print('  - user_id: $userId');
        print('  - employee_id: $readableEmployeeId');
        print('  - employee_id type: ${readableEmployeeId.runtimeType}');
        print('  - employee_id length: ${readableEmployeeId.length}');

        // Prepare submission data
        final Map<String, dynamic> submissionData = {
          'form_identifier': formIdentifier.toString(),
          'user_id': userId, // Include Firebase Auth UID (same as React)
          'employee_id': readableEmployeeId.toString(), // Readable employee ID
          'submission_data': _formData,
          'submitted_at': DateTime.now().toIso8601String(),
        };

        print(
            '🔧 Using React-style ${isUpdate ? 'update' : 'submission'} with user_id included...');

        print('🔍 Final submission data: $submissionData');
        print('🔍 user_id: "${submissionData['user_id']}"');
        print('🔍 employee_id: "${submissionData['employee_id']}"');
        print('🔍 form_identifier: "${submissionData['form_identifier']}"');

        dynamic response;
        if (isUpdate && existingSubmission != null) {
          // Update existing submission
          print(
              '🔧 Updating existing submission with ID: ${existingSubmission['id']}');

          // For updates, don't change created_at, only update submission_data and submitted_at
          final updateData = {
            'submission_data': _formData,
            'submitted_at': DateTime.now().toIso8601String(),
          };

          response = await supabase
              .from('dynamic_form_submissions')
              .update(updateData)
              .eq('id', existingSubmission['id'])
              .select();

          print('✅ Supabase update successful: $response');
        } else {
          // Insert new submission
          print('🔧 Inserting new form data to Supabase...');

          response = await supabase
              .from('dynamic_form_submissions')
              .insert(submissionData)
              .select();

          print('✅ Supabase insertion successful: $response');
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text(isUpdate
                    ? 'Form updated successfully!'
                    : 'Form submitted successfully')),
          );
        }

        // Clear the form fields and the internal data map using the enhanced clear method
        _clearFormAfterSubmission();
      } catch (error) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text('Error submitting form to Supabase: $error')),
          );
        }
      } finally {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  void _clearForm() {
    print('🧹 Manual form clearing initiated...');

    // Clear form data completely (no default preservation for manual clear)
    _formData.clear();

    // Clear all text controllers to match the empty form data
    for (var controller in _textControllers.values) {
      controller.clear();
    }
    print('✅ Text controllers cleared');

    // Clear file upload data
    _selectedFiles.clear();
    _uploadedFileUrls.clear();
    _fileUploadLoading.clear();
    print('✅ File upload data cleared');

    // Reset form validation state
    _formKey.currentState?.reset();

    // Clear office name dropdown selections and reset loading states
    _officeNameOptions.clear();
    _officeNameLoading.clear();
    _officeNameErrors.clear();

    // Clear all dropdown states
    _clearAllDropdownStates();

    // Reset submission state
    _isSubmitting = false;

    // Rebuild to reflect the cleared form fields
    setState(() {});

    print('🎉 Manual form clearing completed');

    // Show confirmation message
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Form cleared successfully'),
        duration: Duration(seconds: 2),
        backgroundColor: Colors.blue,
      ),
    );
  }

  void _clearFormAfterSubmission() {
    print('🧹 Clearing form after successful submission...');

    // Set clearing flag to prevent onChanged callbacks from interfering
    _isClearing = true;

    // Clear form data but preserve any default values that should persist
    final Map<String, dynamic> defaultValues = _getDefaultValues();
    _formData.clear();
    _formData.addAll(defaultValues);
    print('✅ Form data cleared and defaults restored: $defaultValues');

    // Update text controllers to match the cleared/default form data
    for (var entry in _textControllers.entries) {
      final fieldId = entry.key;
      final controller = entry.value;

      if (defaultValues.containsKey(fieldId)) {
        // Set to default value
        controller.text = defaultValues[fieldId]?.toString() ?? '';
        print(
            '📌 Controller for $fieldId set to default: "${controller.text}"');
      } else {
        // Clear the controller
        controller.clear();
        print('🧹 Controller for $fieldId cleared');
      }
    }

    // Force update form data to match the default values (ensure consistency)
    _formData.clear();
    _formData.addAll(defaultValues);
    print('✅ Text controllers updated to match form data');

    // Reset form validation state
    _formKey.currentState?.reset();
    print('✅ Form validation state reset');

    // Clear file upload data (but preserve uploaded files in form data)
    _selectedFiles.clear();
    _fileUploadLoading.clear();
    // Note: We keep _uploadedFileUrls as they are already saved in form data
    print('✅ File upload states cleared');

    // Clear office name dropdown selections and reset loading states
    _officeNameOptions.clear();
    _officeNameLoading.clear();
    _officeNameErrors.clear();
    print('✅ Office dropdown states cleared');

    // Clear any cached dropdown options for other fields
    _clearAllDropdownStates();

    // Reset submission state
    _isSubmitting = false;
    print('✅ Submission state reset');

    // Rebuild to reflect the cleared form fields
    setState(() {});

    // Reset clearing flag after setState to allow normal onChanged behavior
    _isClearing = false;
    print('🎉 Form clearing completed - ready for next submission');

    // Debug form state after a short delay to ensure rebuild is complete
    Future.delayed(const Duration(milliseconds: 100), () {
      _debugFormState();
    });
  }

  /// Get default values that should persist after form clearing
  Map<String, dynamic> _getDefaultValues() {
    final Map<String, dynamic> defaults = {};

    if (_pageConfiguration != null && _pageConfiguration!['fields'] is List) {
      for (var fieldConfig in (_pageConfiguration!['fields'] as List)) {
        if (fieldConfig is Map<String, dynamic>) {
          final String fieldId = fieldConfig['id'] as String? ?? '';
          final dynamic defaultValue = fieldConfig['defaultValue'];

          // Preserve default values if they exist
          if (defaultValue != null && fieldId.isNotEmpty) {
            defaults[fieldId] = defaultValue;
            print('📌 Preserving default value for $fieldId: $defaultValue');
          }

          // Special handling for user office name if it should be pre-filled
          final String label = fieldConfig['label'] as String? ?? '';
          if (label.toLowerCase().contains('office') &&
              label.toLowerCase().contains('name') &&
              fieldConfig['type'] == 'dropdown') {
            // Keep the user's office pre-selected if it was auto-filled
            final currentValue = _formData[fieldId];
            if (currentValue != null) {
              defaults[fieldId] = currentValue;
              print(
                  '📌 Preserving user office selection for $fieldId: $currentValue');
            }
          }
        }
      }
    }

    return defaults;
  }

  /// Clear all dropdown states for comprehensive form reset
  void _clearAllDropdownStates() {
    // This method can be extended to clear other dropdown-specific states
    // as the form grows more complex
    print('🧹 Clearing all dropdown states...');

    // Office name dropdowns are already cleared above
    // Add other dropdown state clearing here if needed

    print('✅ All dropdown states cleared');
  }

  /// Debug method to check form state after clearing
  void _debugFormState() {
    print('🔍 DEBUG: Current form state after clearing:');
    print('📊 Form data: $_formData');
    print('📊 Text controllers count: ${_textControllers.length}');

    for (var entry in _textControllers.entries) {
      print('📊 Controller ${entry.key}: "${entry.value.text}"');
    }

    print('📊 Office name options: ${_officeNameOptions.length} entries');
    print('📊 Is submitting: $_isSubmitting');
    print('🔍 DEBUG: Form state check complete');
  }

  /// Extract office name from form data for duplicate checking
  String? _extractOfficeNameFromForm() {
    // Look for Office Name field in form data
    for (var entry in _formData.entries) {
      final fieldId = entry.key;
      final value = entry.value;

      // Check if this field is an office name field by looking at the field configuration
      if (_pageConfiguration != null && _pageConfiguration!['fields'] is List) {
        for (var fieldConfig in (_pageConfiguration!['fields'] as List)) {
          if (fieldConfig is Map<String, dynamic>) {
            final configFieldId = fieldConfig['id'] as String?;
            final label = fieldConfig['label'] as String? ?? '';

            if (configFieldId == fieldId &&
                label == 'Office Name' &&
                value is String) {
              print('🔍 Found office name from form: $value');
              return value.trim();
            }
          }
        }
      }
    }

    // Fallback: look for any field that looks like an office name
    for (var entry in _formData.entries) {
      final value = entry.value;
      if (value is String &&
          (value.contains(' SO') ||
              value.contains(' BO') ||
              value.contains(' RO') ||
              value.contains(' HO') ||
              value.contains(' DO') ||
              value.contains('Office'))) {
        print('🔍 Found office name from pattern matching: $value');
        return value.trim();
      }
    }

    print('⚠️ No office name found in form data');
    return null;
  }

  /// Extract date from form data for duplicate checking
  String? _extractDateFromForm() {
    // Look for Date field in form data
    for (var entry in _formData.entries) {
      final fieldId = entry.key;
      final value = entry.value;

      // Check if this field is a date field by looking at the field configuration
      if (_pageConfiguration != null && _pageConfiguration!['fields'] is List) {
        for (var fieldConfig in (_pageConfiguration!['fields'] as List)) {
          if (fieldConfig is Map<String, dynamic>) {
            final configFieldId = fieldConfig['id'] as String?;
            final type = fieldConfig['type'] as String? ?? '';
            final label = fieldConfig['label'] as String? ?? '';

            if (configFieldId == fieldId &&
                (type == 'date' || label.toLowerCase().contains('date')) &&
                value is String) {
              // Extract just the date part (YYYY-MM-DD) from ISO string
              final dateOnly = value.split('T')[0];
              print('🔍 Found date from form: $dateOnly');
              return dateOnly;
            }
          }
        }
      }
    }

    // Fallback: look for any field that looks like a date
    for (var entry in _formData.entries) {
      final value = entry.value;
      if (value is String && value.contains('T') && value.contains(':')) {
        final dateOnly = value.split('T')[0];
        print('🔍 Found date from pattern matching: $dateOnly');
        return dateOnly;
      }
    }

    print('⚠️ No date found in form data');
    return null;
  }

  /// Check for duplicate submission in Supabase
  Future<Map<String, dynamic>?> _checkForDuplicateSubmission(
    String formIdentifier,
    String? officeName,
    String? submissionDate,
  ) async {
    if (officeName == null || submissionDate == null) {
      print('🔍 Skipping duplicate check - missing office name or date');
      return null;
    }

    try {
      final supabase = Supabase.instance.client;

      print('🔍 Checking for duplicates with:');
      print('  - form_identifier: $formIdentifier');
      print('  - office: $officeName');
      print('  - date: $submissionDate');

      // Get ALL submissions for this form (not filtered by submitted_at timestamp)
      // We'll check the actual date field values in submission_data instead
      final response = await supabase
          .from('dynamic_form_submissions')
          .select(
              'id, submission_data, submitted_at, created_at, employee_id, form_identifier')
          .eq('form_identifier', formIdentifier);

      print('🔍 Found ${response.length} total submissions for this form');

      // Enhanced filtering by office name AND date field value
      for (var submission in response) {
        final submissionData =
            submission['submission_data'] as Map<String, dynamic>?;
        if (submissionData != null) {
          print(
              '🔍 Checking submission ${submission['id']} for office and date match...');

          bool officeMatches = false;
          bool dateMatches = false;

          // Check for office match
          for (var entry in submissionData.entries) {
            final value = entry.value;
            if (value is String) {
              // Strategy 1: Exact office match
              if (value.trim() == officeName.trim()) {
                print('🔍 Found EXACT office match: ${entry.key} = "$value"');
                officeMatches = true;
                break;
              }
              // Strategy 2: Case-insensitive office match
              if (value.trim().toLowerCase() ==
                  officeName.trim().toLowerCase()) {
                print(
                    '🔍 Found CASE-INSENSITIVE office match: ${entry.key} = "$value"');
                officeMatches = true;
                break;
              }
              // Strategy 3: Contains match (for partial office names)
              if (value
                      .trim()
                      .toLowerCase()
                      .contains(officeName.trim().toLowerCase()) &&
                  value.length > 10) {
                print('🔍 Found PARTIAL office match: ${entry.key} = "$value"');
                officeMatches = true;
                break;
              }
            }
          }

          // Check for date match (actual date field, not submission timestamp)
          if (officeMatches) {
            for (var entry in submissionData.entries) {
              final value = entry.value;
              if (value is String) {
                // Check if this looks like a date field
                String dateValue = value.trim();

                // Handle different date formats
                if (dateValue.contains('T')) {
                  dateValue = dateValue
                      .split('T')[0]; // Extract date part from datetime
                }

                // Compare date values
                if (dateValue == submissionDate) {
                  print('🔍 Found EXACT date match: ${entry.key} = "$value"');
                  dateMatches = true;
                  break;
                }

                // Also check if the field is configured as a date field
                if (_pageConfiguration != null &&
                    _pageConfiguration!['fields'] is List) {
                  for (var fieldConfig
                      in (_pageConfiguration!['fields'] as List)) {
                    if (fieldConfig is Map<String, dynamic> &&
                        fieldConfig['id'] == entry.key &&
                        fieldConfig['type'] == 'date' &&
                        dateValue == submissionDate) {
                      print(
                          '🔍 Found date field match: ${entry.key} = "$value"');
                      dateMatches = true;
                      break;
                    }
                  }
                  if (dateMatches) break;
                }
              }
            }
          }

          // If both office and date match, this is a duplicate
          if (officeMatches && dateMatches) {
            print('🔍 Found DUPLICATE submission: ${submission['id']}');
            print(
                '🔍 Office matches: $officeMatches, Date matches: $dateMatches');
            return submission;
          }

          print(
              '🔍 No duplicate found in submission ${submission['id']} (office: $officeMatches, date: $dateMatches)');
        }
      }

      print('✅ No duplicate submission found after comprehensive check');
      return null;
    } catch (error) {
      print('❌ Error checking for duplicates: $error');
      rethrow;
    }
  }

  /// Show duplicate warning dialog to user
  Future<String?> _showDuplicateWarningDialog(
    String officeName,
    String submissionDate,
    Map<String, dynamic> existingSubmission,
    Map<String, String> fieldLabels,
  ) async {
    return showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.warning, color: Colors.orange),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Duplicate Submission Found',
                  style: TextStyle(fontSize: 16),
                ),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'A report for $officeName on $submissionDate already exists.',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                const Text('Do you want to update it with new values?'),
                const SizedBox(height: 16),
                const Text(
                  'Existing submission data:',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.grey[300]!),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                          'Submitted: ${_formatSubmissionDate(existingSubmission['submitted_at'])}'),
                      Text('Employee: ${existingSubmission['employee_id']}'),
                      const SizedBox(height: 8),
                      ..._buildExistingDataPreview(
                          existingSubmission['submission_data'], fieldLabels),
                    ],
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop('cancel'),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop('update'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.orange,
                foregroundColor: Colors.white,
              ),
              child: const Text('Update'),
            ),
          ],
        );
      },
    );
  }

  /// Build preview of existing submission data
  List<Widget> _buildExistingDataPreview(
    dynamic submissionData,
    Map<String, String> fieldLabels,
  ) {
    if (submissionData is! Map<String, dynamic>) {
      return [const Text('No data available')];
    }

    final data = submissionData as Map<String, dynamic>;
    final widgets = <Widget>[];

    for (var entry in data.entries) {
      final fieldId = entry.key;
      final value = entry.value;
      final label = fieldLabels[fieldId] ?? fieldId;

      if (value != null && value.toString().isNotEmpty) {
        widgets.add(
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 2),
            child: Text(
              '$label: ${value.toString()}',
              style: const TextStyle(fontSize: 12),
            ),
          ),
        );
      }
    }

    return widgets.isEmpty ? [const Text('No data available')] : widgets;
  }

  /// Format submission date for display in duplicate warning dialog
  String _formatSubmissionDate(dynamic submittedAt) {
    if (submittedAt == null) return 'Unknown date';

    try {
      DateTime dateTime;
      if (submittedAt is String) {
        dateTime = DateTime.parse(submittedAt);
      } else if (submittedAt is DateTime) {
        dateTime = submittedAt;
      } else {
        return submittedAt.toString();
      }

      // Format as: "Dec 12, 2025 at 5:38 PM"
      final DateFormat formatter = DateFormat('MMM dd, yyyy \'at\' h:mm a');
      return formatter.format(dateTime.toLocal());
    } catch (e) {
      // Fallback to original string if parsing fails
      return submittedAt.toString();
    }
  }

  /// Gets the readable employee ID from the current user's profile
  Future<String> _getReadableEmployeeId() async {
    try {
      // Use Firebase auth (same as React) for consistency
      final firebaseUser = FirebaseAuth.instance.currentUser;
      if (firebaseUser == null) {
        print('⚠️ No Firebase user found, using fallback employee ID');
        return _extractEmployeeId(_formData);
      }

      final userUid = firebaseUser.uid;

      // Try to get employee ID from Firestore (employees collection)
      try {
        final userDoc = await FirebaseFirestore.instance
            .collection('employees')
            .doc(userUid)
            .get();

        if (userDoc.exists) {
          final userData = userDoc.data() as Map<String, dynamic>;
          final employeeId = userData['employeeId'] as String?;
          if (employeeId != null && employeeId.isNotEmpty) {
            print('✅ Found employee ID in Firestore: $employeeId');
            return employeeId;
          }
        }
      } catch (firestoreError) {
        print('⚠️ Error fetching from Firestore: $firestoreError');
      }

      // Try to get employee ID from Supabase (user_profiles table)
      try {
        final supabase = Supabase.instance.client;
        final response = await supabase
            .from('user_profiles')
            .select('employeeId')
            .eq('uid', userUid)
            .single();

        final employeeId = response['employeeId'] as String?;
        if (employeeId != null && employeeId.isNotEmpty) {
          print('✅ Found employee ID in Supabase: $employeeId');
          return employeeId;
        }
      } catch (supabaseError) {
        print('⚠️ Error fetching from Supabase: $supabaseError');
      }

      // Fallback: extract from form data or generate readable ID
      print('⚠️ No employee ID found in databases, extracting from form data');
      final extractedId = _extractEmployeeId(_formData);

      // Ensure the extracted ID is readable and not a Firebase UID
      if (extractedId.length > 20 || extractedId.contains('-')) {
        // This looks like a Firebase UID, generate a readable ID instead
        final timestamp = DateTime.now().millisecondsSinceEpoch;
        final readableId =
            'USER${timestamp.toString().substring(timestamp.toString().length - 6)}';
        print('⚠️ Extracted ID looks like UID, using readable ID: $readableId');
        return readableId;
      }

      return extractedId;
    } catch (error) {
      print('❌ Error getting readable employee ID: $error');
      // Generate a safe readable ID as final fallback
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final safeId =
          'USER${timestamp.toString().substring(timestamp.toString().length - 6)}';
      print('⚠️ Using safe fallback employee ID: $safeId');
      return safeId;
    }
  }

  // Helper method to extract employee ID from form data
  String _extractEmployeeId(Map<String, dynamic> formData) {
    print('🔍 Extracting employee ID from form data: $formData');

    // Common field names that might contain employee ID
    const employeeIdFields = [
      'employeeId',
      'employee_id',
      'Employee ID',
      'emp_id',
      'empId',
      'staffId',
      'staff_id',
      'Staff ID',
      'id',
      'ID',
      'userId',
      'user_id'
    ];

    // Try to find employee ID field
    for (final field in employeeIdFields) {
      if (formData[field] != null && formData[field] is String) {
        final value = (formData[field] as String).trim();
        if (value.isNotEmpty) {
          print('✅ Found employee ID in field "$field": "$value"');
          return value;
        }
      }
    }

    // Try to extract a name or meaningful identifier from form data
    for (final entry in formData.entries) {
      final key = entry.key;
      final value = entry.value;
      if (value is String && value.length > 2 && value.length < 50) {
        // Skip dates, office names, and other non-name fields
        if (value.contains('T') && value.contains(':')) continue;
        if (value.contains(' BO') ||
            value.contains(' SO') ||
            value.contains(' RO')) continue;
        if (key.toLowerCase().contains('office')) continue;

        // If it looks like a name, create an ID from it
        final cleanName =
            value.trim().replaceAll(RegExp(r'\s+'), '').toUpperCase();
        if (cleanName.length >= 3) {
          final shortId =
              cleanName.length > 8 ? cleanName.substring(0, 8) : cleanName;
          print('✅ Generated employee ID from name "$value": "$shortId"');
          return shortId;
        }
      }
    }

    // Final fallback: generate a readable ID
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final shortId =
        'USER${timestamp.toString().substring(timestamp.toString().length - 6)}';
    print('⚠️ Using fallback employee ID: "$shortId"');
    return shortId;
  }

  @override
  Widget build(BuildContext context) {
    // Show access validation loading
    if (_accessLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Validating Access...')),
        body: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Checking form access permissions...'),
            ],
          ),
        ),
      );
    }

    // Show access denied
    if (_accessError != null || !_hasAccess) {
      return Scaffold(
        appBar: AppBar(title: const Text('Access Restricted')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.lock,
                  size: 64,
                  color: Colors.red,
                ),
                const SizedBox(height: 20),
                const Text(
                  'Access Denied',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.red,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  _accessError ?? 'This form is not available for your office.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 16),
                ),
                const SizedBox(height: 30),
                ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Back to Forms'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Loading Page...')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_errorMessage != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Error')),
        body: Center(child: Text(_errorMessage!)),
      );
    }

    if (_pageConfiguration == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Page Not Found')),
        body: const Center(child: Text('Could not load page configuration.')),
      );
    }

    List<dynamic> fields =
        _pageConfiguration!['fields'] as List<dynamic>? ?? [];
    String pageTitle =
        _pageConfiguration!['title'] as String? ?? 'Dynamic Page';

    return Scaffold(
      appBar: AppBar(title: Text(pageTitle)),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: ListView(
            children: <Widget>[
              ...fields.map((fieldConfig) {
                if (fieldConfig is Map<String, dynamic>) {
                  return _buildWidgetForField(fieldConfig);
                }
                return const SizedBox
                    .shrink(); // Handle potential malformed field configs
              }).toList(),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed:
                          _isSubmitting ? null : _submitDynamicFormToSupabase,
                      child: _isSubmitting
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text('Submit'),
                    ),
                  ),
                  const SizedBox(width: 16), // Space between buttons
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _clearForm,
                      child: const Text('Clear'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
