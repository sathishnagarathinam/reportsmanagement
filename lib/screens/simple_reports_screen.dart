import 'package:flutter/material.dart';
import '../services/reports_service.dart';
import '../services/office_service.dart';
import '../widgets/dynamic_reports_table.dart';

/// Simple Reports Screen for non-division users
/// Shows only table view with data from their own office
class SimpleReportsScreen extends StatefulWidget {
  const SimpleReportsScreen({Key? key}) : super(key: key);

  @override
  State<SimpleReportsScreen> createState() => _SimpleReportsScreenState();
}

class _SimpleReportsScreenState extends State<SimpleReportsScreen> {
  List<FormSubmission> _submissions = [];
  bool _loading = true;
  String? _userOfficeName;
  List<String> _userOfficeHierarchy = []; // User's office + reporting offices

  ReportsFilter _filters = ReportsFilter(limit: 50, offset: 0);
  List<String> _formIdentifiers = [];
  Map<String, String> _formTitles = {};

  // Date range filtering
  DateTime? _fromDate;
  DateTime? _toDate;

  // Frequency filtering
  String? _selectedFrequency;

  // Available frequency options
  static const List<Map<String, String>> _frequencyOptions = [
    {'value': 'daily', 'label': 'Daily'},
    {'value': 'weekly', 'label': 'Weekly'},
    {'value': 'monthly', 'label': 'Monthly'},
  ];

  @override
  void initState() {
    super.initState();
    _fetchInitialData();
  }

  Future<void> _fetchInitialData() async {
    await Future.wait([
      _fetchUserOffice(),
      _fetchSubmissions(),
      _fetchFormIdentifiers(),
    ]);
  }

  Future<void> _fetchUserOffice() async {
    try {
      // Get user's office name
      final userOfficeData = await OfficeService.getCurrentUserOfficeData();
      final userOfficeName = userOfficeData['officeName'];

      // Get user's office hierarchy (user's office + reporting offices)
      print(
          '🔍 Office Hierarchy: Fetching office hierarchy for user: $userOfficeName');
      final officeHierarchy =
          await OfficeService.fetchUserSpecificOfficeNames();
      print(
          '🔍 Office Hierarchy: Raw result from OfficeService: $officeHierarchy');

      if (mounted) {
        setState(() {
          _userOfficeName = userOfficeName;
          _userOfficeHierarchy = officeHierarchy;
        });
      }

      print('✅ SimpleReports: User office: $_userOfficeName');
      print(
          '📋 SimpleReports: Office hierarchy (${_userOfficeHierarchy.length} offices): $_userOfficeHierarchy');

      // Debug: Check if hierarchy contains user's office
      if (_userOfficeHierarchy.contains(_userOfficeName)) {
        print(
            '✅ Office Hierarchy: User office "$_userOfficeName" is included in hierarchy');
      } else {
        print(
            '⚠️ Office Hierarchy: User office "$_userOfficeName" is NOT in hierarchy - this might be the issue!');
      }
    } catch (error) {
      print('❌ SimpleReports: Error fetching user office: $error');
    }
  }

  Future<void> _fetchSubmissions() async {
    try {
      setState(() {
        _loading = true;
      });

      // Wait for office hierarchy to be loaded
      if (_userOfficeHierarchy.isEmpty) {
        print('⏳ SimpleReports: Waiting for office hierarchy to load...');
        await _fetchUserOffice();
      }

      // Apply office hierarchy filtering for simple reports
      // This will fetch data for user's office + all reporting offices
      List<FormSubmission> allSubmissions = [];

      if (_userOfficeHierarchy.isNotEmpty) {
        print(
            '📋 SimpleReports: Fetching submissions for ${_userOfficeHierarchy.length} offices in hierarchy');

        // Fetch submissions for each office in the hierarchy
        for (String officeName in _userOfficeHierarchy) {
          print(
              '🔍 Office Filter: Fetching submissions for office: "$officeName"');

          final officeFilteredFilters = _filters.copyWith(
            officeName: officeName,
          );

          print(
              '🔍 Office Filter: Using filters: ${officeFilteredFilters.toString()}');

          final officeSubmissions = await ReportsService.getFormSubmissions(
            filters: officeFilteredFilters,
          );

          print(
              '📊 ReportsService: Office filter result for "$officeName": ${officeSubmissions.length} submissions');

          // Apply date filtering if dates are selected
          List<FormSubmission> filteredSubmissions = officeSubmissions;
          if (_fromDate != null || _toDate != null) {
            print(
                '🔍 Date Filter: Applying date filter to ${officeSubmissions.length} submissions from office: $officeName');
            filteredSubmissions = _filterSubmissionsByDate(officeSubmissions);
          } else {
            print(
                '🔍 Date Filter: No date filter applied for office: $officeName');
          }

          // Apply frequency filtering if frequency is selected
          if (_selectedFrequency != null) {
            print(
                '🔍 Frequency Filter: Applying frequency filter "$_selectedFrequency" to ${filteredSubmissions.length} submissions from office: $officeName');
            filteredSubmissions =
                _filterSubmissionsByFrequency(filteredSubmissions);
          } else {
            print(
                '🔍 Frequency Filter: No frequency filter applied for office: $officeName');
          }

          allSubmissions.addAll(filteredSubmissions);
          print(
              '📊 SimpleReports: Final result for "$officeName": ${filteredSubmissions.length}/${officeSubmissions.length} submissions (after date filter)');
        }

        // Remove duplicates based on submission ID
        final uniqueSubmissions = <String, FormSubmission>{};
        for (var submission in allSubmissions) {
          uniqueSubmissions[submission.id] = submission;
        }
        allSubmissions = uniqueSubmissions.values.toList();

        // Sort by submission date (newest first)
        allSubmissions.sort((a, b) => b.submittedAt.compareTo(a.submittedAt));
      } else {
        print(
            '⚠️ SimpleReports: No office hierarchy available, fetching all submissions');
        // Fallback: fetch all submissions if hierarchy is not available
        allSubmissions =
            await ReportsService.getFormSubmissions(filters: _filters);
        print(
            '📊 SimpleReports: Fallback - fetched ${allSubmissions.length} total submissions');
      }

      // Debug: Also test fetching ALL submissions without any office filter
      print('🔍 Debug: Testing fetch without office filter...');
      final allSubmissionsTest = await ReportsService.getFormSubmissions(
          filters: ReportsFilter(limit: 50, offset: 0));
      print(
          '📊 Debug: Total submissions in database (no filters): ${allSubmissionsTest.length}');

      if (mounted) {
        setState(() {
          _submissions = allSubmissions;
          _loading = false;
        });
      }

      print(
          '✅ SimpleReports: Total unique submissions: ${allSubmissions.length}');
      print('📋 SimpleReports: Office hierarchy: $_userOfficeHierarchy');
    } catch (error) {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
      print('❌ SimpleReports: Error fetching submissions: $error');
    }
  }

  Future<void> _fetchFormIdentifiers() async {
    try {
      final identifiers = await ReportsService.getFormIdentifiers();
      if (mounted) {
        setState(() {
          _formIdentifiers = identifiers;
          // Generate human-readable titles for each form identifier
          _formTitles = {};
          for (final identifier in identifiers) {
            _formTitles[identifier] =
                ReportsService.getFormTypeDisplay(identifier);
          }
        });
      }
    } catch (error) {
      print('❌ SimpleReports: Error fetching form identifiers: $error');
    }
  }

  void _applyFilters(ReportsFilter newFilters) {
    print('🔍 SimpleReports: Applying filters: ${newFilters.formIdentifier}');
    setState(() {
      _filters = newFilters.copyWith(offset: 0); // Reset pagination
    });
    _fetchSubmissions();
  }

  void _clearFilters() {
    setState(() {
      _filters = ReportsFilter(limit: 50, offset: 0);
      _fromDate = null;
      _toDate = null;
      _selectedFrequency = null;
    });
    _fetchSubmissions();
  }

  /// Filter submissions by date range based on form data dates
  List<FormSubmission> _filterSubmissionsByDate(
      List<FormSubmission> submissions) {
    print('🔍 Date Filter: Filtering ${submissions.length} submissions');
    print('🔍 Date Filter: From Date: $_fromDate');
    print('🔍 Date Filter: To Date: $_toDate');

    final filtered = submissions.where((submission) {
      // Look for date fields in the form data
      DateTime? formDate = _extractDateFromFormData(submission.submissionData);

      print(
          '🔍 Date Filter: Submission ${submission.id} - Form Date: $formDate');

      if (formDate == null) {
        print(
            '🔍 Date Filter: No date found in submission ${submission.id}, EXCLUDING it when date filter is active');
        // When date filtering is active, exclude submissions without dates
        return false;
      }

      // Apply date range filtering - normalize dates to compare only date parts (ignore time)
      final formDateOnly =
          DateTime(formDate.year, formDate.month, formDate.day);
      final fromDateOnly = _fromDate != null
          ? DateTime(_fromDate!.year, _fromDate!.month, _fromDate!.day)
          : null;
      final toDateOnly = _toDate != null
          ? DateTime(_toDate!.year, _toDate!.month, _toDate!.day)
          : null;

      print(
          '🔍 Date Filter: Comparing dates - Form: $formDateOnly, From: $fromDateOnly, To: $toDateOnly');

      if (fromDateOnly != null && formDateOnly.isBefore(fromDateOnly)) {
        print(
            '🔍 Date Filter: Submission ${submission.id} date $formDateOnly is before $fromDateOnly, excluding');
        return false;
      }
      if (toDateOnly != null && formDateOnly.isAfter(toDateOnly)) {
        print(
            '🔍 Date Filter: Submission ${submission.id} date $formDateOnly is after $toDateOnly, excluding');
        return false;
      }

      print(
          '🔍 Date Filter: Submission ${submission.id} date $formDate is within range, including');
      return true;
    }).toList();

    print(
        '🔍 Date Filter: Filtered result: ${filtered.length}/${submissions.length} submissions');
    return filtered;
  }

  /// Filter submissions by frequency based on form data frequency
  List<FormSubmission> _filterSubmissionsByFrequency(
      List<FormSubmission> submissions) {
    print('🔍 Frequency Filter: Filtering ${submissions.length} submissions');
    print('🔍 Frequency Filter: Selected Frequency: $_selectedFrequency');

    final filtered = submissions.where((submission) {
      // Look for frequency fields in the form data
      String? formFrequency =
          _extractFrequencyFromFormData(submission.submissionData);

      print(
          '🔍 Frequency Filter: Submission ${submission.id} - Form Frequency: $formFrequency');

      if (formFrequency == null) {
        print(
            '🔍 Frequency Filter: No frequency found in submission ${submission.id}, EXCLUDING it when frequency filter is active');
        // When frequency filtering is active, exclude submissions without frequency
        return false;
      }

      // Normalize frequency values for comparison (case-insensitive)
      final normalizedFormFrequency = formFrequency.toLowerCase().trim();
      final normalizedSelectedFrequency =
          _selectedFrequency!.toLowerCase().trim();

      print(
          '🔍 Frequency Filter: Comparing frequencies - Form: "$normalizedFormFrequency", Selected: "$normalizedSelectedFrequency"');

      if (normalizedFormFrequency == normalizedSelectedFrequency) {
        print(
            '🔍 Frequency Filter: Submission ${submission.id} frequency matches, including');
        return true;
      } else {
        print(
            '🔍 Frequency Filter: Submission ${submission.id} frequency does not match, excluding');
        return false;
      }
    }).toList();

    print(
        '🔍 Frequency Filter: Filtered result: ${filtered.length}/${submissions.length} submissions');
    return filtered;
  }

  /// Extract frequency from form data by looking for frequency field patterns
  String? _extractFrequencyFromFormData(Map<String, dynamic> formData) {
    print(
        '🔍 Frequency Extract: Analyzing form data keys: ${formData.keys.toList()}');

    // Common frequency field patterns to look for
    const frequencyFieldPatterns = [
      'frequency',
      'Frequency',
      'FREQUENCY',
      'reportFrequency',
      'formFrequency',
      'submissionFrequency',
      'freq',
    ];

    for (String pattern in frequencyFieldPatterns) {
      for (String key in formData.keys) {
        if (key.toLowerCase().contains(pattern.toLowerCase())) {
          final value = formData[key];
          print(
              '🔍 Frequency Extract: Found potential frequency field "$key" with value: $value (type: ${value.runtimeType})');

          if (value != null && value is String && value.trim().isNotEmpty) {
            print(
                '🔍 Frequency Extract: Successfully extracted frequency from "$key": $value');
            return value.trim();
          }
        }
      }
    }

    print('🔍 Frequency Extract: No frequency field found in form data');
    return null; // No frequency field found
  }

  /// Extract date from form data by looking for common date field patterns
  DateTime? _extractDateFromFormData(Map<String, dynamic> formData) {
    print(
        '🔍 Date Extract: Analyzing form data keys: ${formData.keys.toList()}');

    // Common date field patterns to look for (expanded list)
    const dateFieldPatterns = [
      'date',
      'Date',
      'DATE',
      'reportDate',
      'submissionDate',
      'entryDate',
      'formDate',
      'dateTime',
      'timestamp',
      'created',
      'updated',
      'field_', // Dynamic form fields often start with field_
    ];

    for (String pattern in dateFieldPatterns) {
      for (String key in formData.keys) {
        if (key.toLowerCase().contains(pattern.toLowerCase())) {
          final value = formData[key];
          print(
              '🔍 Date Extract: Found potential date field "$key" with value: $value (type: ${value.runtimeType})');

          if (value != null) {
            try {
              if (value is String) {
                // Try multiple date parsing approaches
                DateTime? parsedDate = _tryParseDate(value);
                if (parsedDate != null) {
                  print(
                      '🔍 Date Extract: Successfully parsed date from "$key": $parsedDate');
                  return parsedDate;
                }
              } else if (value is DateTime) {
                print(
                    '🔍 Date Extract: Found DateTime object in "$key": $value');
                return value;
              } else if (value is int) {
                // Handle timestamp (milliseconds since epoch)
                try {
                  final parsedDate = DateTime.fromMillisecondsSinceEpoch(value);
                  print(
                      '🔍 Date Extract: Parsed timestamp from "$key": $parsedDate');
                  return parsedDate;
                } catch (e) {
                  print(
                      '🔍 Date Extract: Failed to parse timestamp from "$key": $e');
                }
              }
            } catch (e) {
              print('🔍 Date Extract: Failed to parse date from "$key": $e');
              // Continue searching if this field can't be parsed as date
              continue;
            }
          }
        }
      }
    }

    print('🔍 Date Extract: No date field found in form data');
    return null; // No date field found
  }

  /// Try to parse date from string using multiple formats
  DateTime? _tryParseDate(String dateString) {
    if (dateString.trim().isEmpty) return null;

    // List of date formats to try
    final formats = [
      // ISO formats
      dateString, // Try direct DateTime.parse first

      // Common formats
      () {
        // DD/MM/YYYY or DD-MM-YYYY
        final parts = dateString.split(RegExp(r'[/-]'));
        if (parts.length == 3) {
          final day = int.tryParse(parts[0]);
          final month = int.tryParse(parts[1]);
          final year = int.tryParse(parts[2]);
          if (day != null && month != null && year != null) {
            return DateTime(year, month, day);
          }
        }
        return null;
      }(),

      () {
        // MM/DD/YYYY or MM-DD-YYYY
        final parts = dateString.split(RegExp(r'[/-]'));
        if (parts.length == 3) {
          final month = int.tryParse(parts[0]);
          final day = int.tryParse(parts[1]);
          final year = int.tryParse(parts[2]);
          if (day != null && month != null && year != null) {
            return DateTime(year, month, day);
          }
        }
        return null;
      }(),
    ];

    // Try DateTime.parse first
    try {
      return DateTime.parse(dateString);
    } catch (e) {
      print('🔍 Date Parse: DateTime.parse failed for "$dateString": $e');
    }

    // Try custom formats
    for (final format in formats) {
      if (format is DateTime) {
        print(
            '🔍 Date Parse: Successfully parsed "$dateString" using custom format: $format');
        return format;
      }
    }

    print('🔍 Date Parse: All parsing attempts failed for "$dateString"');
    return null;
  }

  /// Show date picker for from date
  Future<void> _selectFromDate(BuildContext context) async {
    print('🔍 Date Picker: Opening From Date picker');

    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _fromDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      helpText: 'Select From Date',
    );

    print('🔍 Date Picker: From Date picked: $picked');

    if (picked != null && picked != _fromDate) {
      setState(() {
        _fromDate = picked;
        // If to date is before from date, clear it
        if (_toDate != null && _toDate!.isBefore(_fromDate!)) {
          print(
              '🔍 Date Picker: Clearing To Date because it\'s before From Date');
          _toDate = null;
        }
      });

      print(
          '🔍 Date Picker: From Date set to: $_fromDate, refreshing submissions');
      _fetchSubmissions(); // Refresh data with new date filter
    }
  }

  /// Show date picker for to date
  Future<void> _selectToDate(BuildContext context) async {
    print('🔍 Date Picker: Opening To Date picker');

    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _toDate ?? _fromDate ?? DateTime.now(),
      firstDate: _fromDate ?? DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      helpText: 'Select To Date',
    );

    print('🔍 Date Picker: To Date picked: $picked');

    if (picked != null && picked != _toDate) {
      setState(() {
        _toDate = picked;
      });

      print('🔍 Date Picker: To Date set to: $_toDate, refreshing submissions');
      _fetchSubmissions(); // Refresh data with new date filter
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor:
          Theme.of(context).primaryColor, // Match dashboard background
      body: Column(
        children: [
          // Header Section - Dashboard Theme with Back Button
          Container(
            padding: const EdgeInsets.fromLTRB(20, 60, 20, 20),
            child: Column(
              children: [
                // Back Button and Logo/Title Row
                Row(
                  children: [
                    // Back Button
                    GestureDetector(
                      onTap: () => Navigator.of(context).pop(),
                      child: Container(
                        width: 45,
                        height: 45,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: Colors.white.withOpacity(0.3),
                            width: 1,
                          ),
                        ),
                        child: const Icon(
                          Icons.arrow_back,
                          color: Colors.white,
                          size: 24,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),

                    // Logo
                    Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        Icons.assessment,
                        color: Theme.of(context)
                            .primaryColor, // Match dashboard icon color
                        size: 30,
                      ),
                    ),
                    const SizedBox(width: 16),

                    // Title
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Office Reports',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            'Table view - Office data only',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Office Context Banner
                if (_userOfficeName != null)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withOpacity(0.2)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.business,
                            color: Colors.white, size: 24),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Office Hierarchy View',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                _userOfficeName!,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              if (_userOfficeHierarchy.length > 1)
                                Text(
                                  '+ ${_userOfficeHierarchy.length - 1} reporting offices',
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 12,
                                  ),
                                ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.green.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            'Table View',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),

          // Content Section - Only Table View
          Expanded(
            child: Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(30),
                  topRight: Radius.circular(30),
                ),
              ),
              child: ClipRRect(
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(30),
                  topRight: Radius.circular(30),
                ),
                child: Column(
                  children: [
                    // Filters Section
                    _buildFiltersSection(),

                    // Table View Only
                    Expanded(
                      child: DynamicReportsTable(
                        submissions: _submissions,
                        loading: _loading,
                        onRefresh: _fetchSubmissions,
                      ),
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

  Widget _buildFiltersSection() {
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        border: Border(
          bottom: BorderSide(color: Colors.grey[300]!),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.filter_list, size: 20),
              const SizedBox(width: 8),
              const Text(
                'Office Data Filters',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  '📊 Table View Only',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.blue,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Date Range Filters
          Row(
            children: [
              // From Date
              Expanded(
                child: InkWell(
                  onTap: () => _selectFromDate(context),
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'From Date',
                      border: OutlineInputBorder(),
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      suffixIcon: Icon(Icons.calendar_today, size: 20),
                    ),
                    child: Text(
                      _fromDate != null
                          ? '${_fromDate!.day}/${_fromDate!.month}/${_fromDate!.year}'
                          : 'Select date',
                      style: TextStyle(
                        color:
                            _fromDate != null ? Colors.black : Colors.grey[600],
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // To Date
              Expanded(
                child: InkWell(
                  onTap: () => _selectToDate(context),
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'To Date',
                      border: OutlineInputBorder(),
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      suffixIcon: Icon(Icons.calendar_today, size: 20),
                    ),
                    child: Text(
                      _toDate != null
                          ? '${_toDate!.day}/${_toDate!.month}/${_toDate!.year}'
                          : 'Select date',
                      style: TextStyle(
                        color:
                            _toDate != null ? Colors.black : Colors.grey[600],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Frequency Type Dropdown
          DropdownButtonFormField<String>(
            decoration: const InputDecoration(
              labelText: 'Frequency Type',
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              prefixIcon: Icon(Icons.schedule, size: 20),
            ),
            value: _selectedFrequency,
            items: [
              const DropdownMenuItem<String>(
                value: null,
                child: Text('All Frequencies'),
              ),
              ..._frequencyOptions.map((option) {
                return DropdownMenuItem<String>(
                  value: option['value'],
                  child: Text(option['label']!),
                );
              }),
            ],
            onChanged: (value) {
              setState(() {
                _selectedFrequency = value;
              });
              _fetchSubmissions(); // Refresh data with new frequency filter
            },
          ),
          const SizedBox(height: 12),

          // Form Type Dropdown
          DropdownButtonFormField<String>(
            decoration: const InputDecoration(
              labelText: 'Form Type',
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              prefixIcon: Icon(Icons.description, size: 20),
            ),
            value: _filters.formIdentifier,
            items: [
              const DropdownMenuItem<String>(
                value: null,
                child: Text('All Forms'),
              ),
              ..._formIdentifiers.map((identifier) {
                return DropdownMenuItem<String>(
                  value: identifier,
                  child: Text(_formTitles[identifier] ?? identifier),
                );
              }),
            ],
            onChanged: (value) {
              _applyFilters(_filters.copyWith(formIdentifier: value));
            },
          ),
          const SizedBox(height: 12),

          // Action Buttons Row
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _fetchSubmissions,
                  icon: const Icon(Icons.refresh, size: 18),
                  label: const Text('Refresh'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _clearFilters,
                  icon: const Icon(Icons.clear, size: 18),
                  label: const Text('Clear'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
