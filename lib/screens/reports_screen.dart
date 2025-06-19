import 'package:flutter/material.dart';
import '../services/reports_service.dart';
import '../widgets/dynamic_reports_table.dart';
import '../widgets/submissions_summary_cards.dart';

// Wave painter for custom app bar (same as dashboard)
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

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  List<FormSubmission> _submissions = [];
  ReportsSummary? _summary;
  bool _loading = true;

  ReportsFilter _filters = ReportsFilter(limit: 50, offset: 0);
  List<String> _formIdentifiers = [];
  Map<String, String> _formTitles =
      {}; // Map form identifiers to human-readable titles

  // Frequency filtering
  String? _selectedFrequency;

  // Available frequency options
  static const List<Map<String, String>> _frequencyOptions = [
    {'value': 'daily', 'label': 'Daily'},
    {'value': 'weekly', 'label': 'Weekly'},
    {'value': 'monthly', 'label': 'Monthly'},
  ];

  // Date filtering
  DateTime? _fromDate;
  DateTime? _toDate;

  // Track office names from current submissions data
  List<String> _submissionOfficeNames = [];

  // Debug: Track all field names for analysis
  List<String> _allFieldNames = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _fetchInitialData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchInitialData() async {
    await Future.wait([
      _fetchSummary(),
      _fetchSubmissions(),
      _fetchFormIdentifiers(),
    ]);
  }

  Future<void> _fetchSummary() async {
    try {
      final summary = await ReportsService.getReportsSummary();
      if (mounted) {
        setState(() {
          _summary = summary;
        });
      }
    } catch (error) {
      print('Error fetching summary: $error');
    }
  }

  Future<void> _fetchSubmissions() async {
    try {
      setState(() {
        _loading = true;
      });

      var submissions = await ReportsService.getFormSubmissions(
        filters: _filters,
      );

      // Apply frequency filtering if frequency is selected
      if (_selectedFrequency != null) {
        print(
            '🔍 Frequency Filter: Applying frequency filter "$_selectedFrequency" to ${submissions.length} submissions');
        submissions = _filterSubmissionsByFrequency(submissions);
      } else {
        print('🔍 Frequency Filter: No frequency filter applied');
      }

      // Apply date filtering if dates are selected
      if (_fromDate != null || _toDate != null) {
        print(
            '🔍 Date Filter: Applying date filter to ${submissions.length} submissions');
        submissions = _filterSubmissionsByDate(submissions);
      } else {
        print('🔍 Date Filter: No date filter applied');
      }

      if (mounted) {
        setState(() {
          _submissions = submissions;
          _loading = false;
          // Update office names from current submissions
          _submissionOfficeNames =
              _extractOfficeNamesFromSubmissions(submissions);
          // Update field names for debugging
          _allFieldNames = _extractAllFieldNames(submissions);
          // Clean up invalid office filter if it doesn't exist in current data
          _cleanupInvalidOfficeFilter();
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
      print('Error fetching submissions: $error');
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
      print('Error fetching form identifiers: $error');
    }
  }

  void _applyFilters(ReportsFilter newFilters) {
    print('🔍 Reports: Applying new filters: ${newFilters.formIdentifier}');
    setState(() {
      _filters = newFilters.copyWith(offset: 0); // Reset pagination
    });
    _fetchSubmissions();
  }

  void _clearFilters() {
    setState(() {
      _filters = ReportsFilter(limit: 50, offset: 0);
      _selectedFrequency = null;
      _fromDate = null;
      _toDate = null;
    });
    _fetchSubmissions();
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

  /// Filter submissions by date range based on form data dates (same as simple reports)
  List<FormSubmission> _filterSubmissionsByDate(
      List<FormSubmission> submissions) {
    print('🔍 Date Filter: Filtering ${submissions.length} submissions');
    print('🔍 Date Filter: From Date: $_fromDate, To Date: $_toDate');

    final filtered = submissions.where((submission) {
      // Look for date fields in the form data (same logic as simple reports)
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

  /// Extract date from form data by looking for common date field patterns (same as simple reports)
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
              '🔍 Date Extract: Found potential date field "$key" with value: $value (${value.runtimeType})');

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
              print('🔍 Date Extract: Error parsing date from "$key": $e');
            }
          }
        }
      }
    }

    print('🔍 Date Extract: No date field found in form data');
    return null; // No date field found
  }

  /// Try to parse date string using multiple formats (same as simple reports)
  DateTime? _tryParseDate(String dateString) {
    if (dateString.trim().isEmpty) return null;

    print('🔍 Date Parse: Attempting to parse "$dateString"');

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

  /// Extract unique office names from current submissions data
  List<String> _extractOfficeNamesFromSubmissions(
      List<FormSubmission> submissions) {
    print(
        '🏢 Office Extract: Analyzing ${submissions.length} submissions for office names');

    final Set<String> uniqueOfficeNames = {};
    final Set<String> allFieldNames = {}; // Debug: collect all field names

    for (final submission in submissions) {
      // Debug: collect all field names from all submissions
      allFieldNames.addAll(submission.submissionData.keys);

      // Try to get office name from submission data
      String? officeName = _extractOfficeNameFromSubmission(submission);

      if (officeName != null &&
          officeName.trim().isNotEmpty &&
          officeName.trim() != 'Unknown Office') {
        uniqueOfficeNames.add(officeName.trim());
        print(
            '🏢 Office Extract: Found office name "$officeName" in submission ${submission.id}');
      } else if (officeName == 'Unknown Office') {
        print(
            '🏢 Office Extract: Skipping "Unknown Office" value in submission ${submission.id}');
      }
    }

    // Debug: Print all unique field names found across all submissions
    final sortedFieldNames = allFieldNames.toList()..sort();
    print(
        '🔍 DEBUG: All unique field names across submissions: $sortedFieldNames');

    final officeList = uniqueOfficeNames.toList()..sort();
    print(
        '🏢 Office Extract: Extracted ${officeList.length} unique office names: $officeList');

    // Debug fallback: If no offices found, let's try to extract ANY field that might contain office info
    if (officeList.isEmpty && submissions.isNotEmpty) {
      print(
          '🔍 DEBUG: No offices found, analyzing field values for potential office names...');
      final Set<String> potentialOffices = {};

      for (final submission in submissions) {
        submission.submissionData.forEach((key, value) {
          if (value is String &&
              value.trim().isNotEmpty &&
              value.trim() != 'Unknown Office') {
            // Look for values that might be office names (contain "office", "branch", etc.)
            final lowerValue = value.toLowerCase();
            if (lowerValue.contains('office') ||
                lowerValue.contains('branch') ||
                lowerValue.contains('division') ||
                lowerValue.contains('department') ||
                lowerValue.contains('center') ||
                lowerValue.contains('unit')) {
              potentialOffices.add(value.trim());
              print(
                  '🔍 DEBUG: Found potential office in field "$key": "$value"');
            }
          }
        });
      }

      if (potentialOffices.isNotEmpty) {
        print(
            '🔍 DEBUG: Potential office names found: ${potentialOffices.toList()}');
        // For debugging, return these potential offices
        return potentialOffices.toList()..sort();
      }
    }

    return officeList;
  }

  /// Extract all unique field names from submissions for debugging
  List<String> _extractAllFieldNames(List<FormSubmission> submissions) {
    final Set<String> allFieldNames = {};
    for (final submission in submissions) {
      allFieldNames.addAll(submission.submissionData.keys);
    }
    return allFieldNames.toList()..sort();
  }

  /// Extract office name from a single submission
  String? _extractOfficeNameFromSubmission(FormSubmission submission) {
    print('🔍 Office Extract: Analyzing submission ${submission.id}');
    print('🔍 Office Extract: userOffice = "${submission.userOffice}"');
    print(
        '🔍 Office Extract: submissionData keys = ${submission.submissionData.keys.toList()}');

    // First try to get from submission.userOffice if available
    if (submission.userOffice != null &&
        submission.userOffice!.trim().isNotEmpty &&
        submission.userOffice!.trim() != 'Unknown Office') {
      print(
          '🔍 Office Extract: Found office from userOffice: "${submission.userOffice}"');
      return submission.userOffice!.trim();
    }

    // If not available, try to extract from submission data
    final submissionData = submission.submissionData;

    // Print all submission data for debugging
    print('🔍 Office Extract: Full submission data:');
    submissionData.forEach((key, value) {
      print('  "$key": "$value" (${value.runtimeType})');
    });

    // Common office field patterns to look for (more comprehensive)
    const officeFieldPatterns = [
      'office',
      'Office',
      'OFFICE',
      'officeName',
      'office_name',
      'officeLocation',
      'location',
      'branch',
      'department',
      'workplace',
      'site',
      'facility',
      'unit',
    ];

    // Try exact key matches first
    for (String pattern in officeFieldPatterns) {
      if (submissionData.containsKey(pattern)) {
        final value = submissionData[pattern];
        if (value != null &&
            value is String &&
            value.trim().isNotEmpty &&
            value.trim() != 'Unknown Office') {
          print(
              '🔍 Office Extract: Found office from exact key "$pattern": "$value"');
          return value.trim();
        }
      }
    }

    // Try partial key matches
    for (String pattern in officeFieldPatterns) {
      for (String key in submissionData.keys) {
        if (key.toLowerCase().contains(pattern.toLowerCase())) {
          final value = submissionData[key];
          if (value != null &&
              value is String &&
              value.trim().isNotEmpty &&
              value.trim() != 'Unknown Office') {
            print(
                '🔍 Office Extract: Found office from partial key "$key" (pattern: "$pattern"): "$value"');
            return value.trim();
          }
        }
      }
    }

    // For dynamic field IDs, analyze all field values to find potential office names
    print(
        '🔍 Office Extract: No semantic field names found, analyzing all field values...');
    for (String key in submissionData.keys) {
      final value = submissionData[key];
      if (value != null &&
          value is String &&
          value.trim().isNotEmpty &&
          value.trim() != 'Unknown Office') {
        final trimmedValue = value.trim();

        // Check if this value looks like an office name
        if (_looksLikeOfficeName(trimmedValue)) {
          print(
              '🔍 Office Extract: Found potential office from dynamic field "$key": "$trimmedValue"');
          return trimmedValue;
        }
      }
    }

    print(
        '🔍 Office Extract: No office name found in submission ${submission.id}');
    return null; // No office name found
  }

  /// Check if a value looks like an office name based on common patterns
  bool _looksLikeOfficeName(String value) {
    final lowerValue = value.toLowerCase();

    // Skip obviously non-office values
    if (value.length < 3 || value.length > 100) return false;

    // Skip pure numbers
    if (RegExp(r'^\d+$').hasMatch(value)) return false;

    // Skip email addresses
    if (value.contains('@')) return false;

    // Skip phone numbers
    if (RegExp(r'^[\d\s\-\+\(\)]+$').hasMatch(value)) return false;

    // Skip dates
    if (RegExp(r'\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}').hasMatch(value)) {
      return false;
    }

    // Skip currency amounts
    if (RegExp(r'^\$?\d+\.?\d*$').hasMatch(value)) return false;

    // Look for positive indicators of office names
    final officeIndicators = [
      'office',
      'branch',
      'division',
      'department',
      'center',
      'centre',
      'unit',
      'facility',
      'location',
      'site',
      'headquarters',
      'hq',
      'regional',
      'district',
      'zone',
      'area',
      'sector',
      'post',
      'main',
      'central',
      'north',
      'south',
      'east',
      'west',
    ];

    // Check if value contains office-related keywords
    for (String indicator in officeIndicators) {
      if (lowerValue.contains(indicator)) {
        print(
            '🔍 Office Check: "$value" contains office indicator "$indicator"');
        return true;
      }
    }

    // Check if it's a proper noun (starts with capital letter and contains spaces or capitals)
    if (RegExp(r'^[A-Z][a-zA-Z\s]+$').hasMatch(value) &&
        (value.contains(' ') || RegExp(r'[A-Z].*[A-Z]').hasMatch(value))) {
      print(
          '🔍 Office Check: "$value" looks like a proper noun (potential office name)');
      return true;
    }

    print('🔍 Office Check: "$value" does not look like an office name');
    return false;
  }

  /// Show date picker and return selected date
  Future<DateTime?> _selectDate(
      BuildContext context, DateTime? initialDate) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: initialDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: Theme.of(context).colorScheme.copyWith(
                  primary: Theme.of(context).primaryColor,
                ),
          ),
          child: child!,
        );
      },
    );
    return picked;
  }

  /// Clean up invalid office filter values that don't exist in current submissions
  void _cleanupInvalidOfficeFilter() {
    if (_filters.officeName != null &&
        !_submissionOfficeNames.contains(_filters.officeName)) {
      print(
          '🧹 Cleanup: Office filter "${_filters.officeName}" not found in current data, clearing it');
      _filters = _filters.copyWith(officeName: null);
    }
  }

  // Custom App Bar with Dashboard Theme
  Widget _buildCustomAppBar(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: <Widget>[
        // Background with a curve (main solid color)
        Container(
          height: 160, // Compact height for reports screen
          decoration: BoxDecoration(
            color: Theme.of(context).primaryColor,
            borderRadius: const BorderRadius.only(
              bottomLeft: Radius.circular(30),
              bottomRight: Radius.circular(30),
            ),
          ),
        ),
        // Wave/Blob Shapes using CustomPainter
        Positioned.fill(
          child: ClipRRect(
            borderRadius: const BorderRadius.only(
              bottomLeft: Radius.circular(30),
              bottomRight: Radius.circular(30),
            ),
            child: CustomPaint(
              painter: _WavePainter(color: Colors.white),
              child: Container(),
            ),
          ),
        ),
        // Back button (top left)
        Positioned(
          top: 35,
          left: 16,
          child: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ),
        // India Post Logo (centered)
        Positioned(
          top: 40,
          left: 0,
          right: 0,
          child: Center(
            child: Image.asset(
              'assets/images/Indiapost_Logo.png', // Same logo as dashboard
              height: 80, // Smaller size for reports screen
              width: 80,
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor:
          Theme.of(context).primaryColor, // Same as dashboard app bar
      body: Column(
        children: [
          // Custom App Bar with Dashboard Theme
          _buildCustomAppBar(context),
          // Tab Bar
          Container(
            color: Theme.of(context).primaryColor,
            child: TabBar(
              controller: _tabController,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white70,
              indicatorColor: Colors.white,
              tabs: const [
                Tab(
                  icon: Icon(Icons.dashboard),
                  text: 'Summary',
                ),
                Tab(
                  icon: Icon(Icons.table_chart),
                  text: 'Submissions',
                ),
                Tab(
                  icon: Icon(Icons.view_column),
                  text: 'Table View',
                ),
              ],
            ),
          ),
          // Tab Content with Dashboard Background
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(top: 8.0),
              decoration: BoxDecoration(
                color: Theme.of(context)
                    .scaffoldBackgroundColor, // Content background
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(30),
                  topRight: Radius.circular(30),
                ),
              ),
              child: ClipRRect(
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(30),
                  topRight: Radius.circular(30),
                ),
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    // Summary Tab
                    _buildSummaryTab(),
                    // Submissions Tab
                    _buildSubmissionsTab(),
                    // Table View Tab
                    _buildTableViewTab(),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryTab() {
    if (_summary == null) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    final summaryCards = [
      {
        'icon': Icons.file_copy,
        'value': _summary!.totalSubmissions,
        'label': 'Total Submissions',
        'color': Colors.blue,
      },
      {
        'icon': Icons.assignment,
        'value': _summary!.uniqueForms,
        'label': 'Unique Forms',
        'color': Colors.green,
      },
      {
        'icon': Icons.people,
        'value': _summary!.uniqueUsers,
        'label': 'Active Users',
        'color': Colors.orange,
      },
      {
        'icon': Icons.today,
        'value': _summary!.submissionsToday,
        'label': 'Today',
        'color': Colors.purple,
      },
      {
        'icon': Icons.date_range,
        'value': _summary!.submissionsThisWeek,
        'label': 'This Week',
        'color': Colors.teal,
      },
      {
        'icon': Icons.calendar_month,
        'value': _summary!.submissionsThisMonth,
        'label': 'This Month',
        'color': Colors.indigo,
      },
    ];

    return RefreshIndicator(
      onRefresh: _fetchSummary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Reports Overview',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: 1.2,
              ),
              itemCount: summaryCards.length,
              itemBuilder: (context, index) {
                final card = summaryCards[index];
                return Card(
                  elevation: 4,
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          card['icon'] as IconData,
                          size: 32,
                          color: card['color'] as Color,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          (card['value'] as int).toString(),
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: card['color'] as Color,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          card['label'] as String,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Colors.grey,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSubmissionsTab() {
    return Column(
      children: [
        // Filters Section (Submissions tab - index 1)
        _buildFiltersSection(tabIndex: 1),
        // Submissions Summary Cards
        Expanded(
          child: SubmissionsSummaryCards(
            submissions: _submissions,
            loading: _loading,
            onRefresh: _fetchSubmissions,
            filters: _filters,
          ),
        ),
      ],
    );
  }

  Widget _buildTableViewTab() {
    return Column(
      children: [
        // Filters Section (Table View tab - index 2)
        _buildFiltersSection(tabIndex: 2),
        // Dynamic Table
        Expanded(
          child: DynamicReportsTable(
            submissions: _submissions,
            loading: _loading,
            onRefresh: _fetchSubmissions,
          ),
        ),
      ],
    );
  }

  Widget _buildFiltersSection({required int tabIndex}) {
    // Office names are now extracted from current submissions data
    // No need to fetch from external service

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
                'Filters',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              TextButton.icon(
                onPressed: _clearFilters,
                icon: const Icon(Icons.clear, size: 16),
                label: const Text('Clear'),
                style: TextButton.styleFrom(
                  foregroundColor: Colors.grey[600],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Conditional layout based on tab index
          if (tabIndex == 2) // Table View tab - show both dropdowns
            _buildTableViewFilters()
          else // Submissions tab - show only form type dropdown
            _buildSubmissionsFilters(),
        ],
      ),
    );
  }

  // Submissions tab filters - frequency, form type, and date range
  Widget _buildSubmissionsFilters() {
    return Column(
      children: [
        // First row: Frequency Type
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

        // Second row: Form Type
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

        // Third row: Date Range
        Row(
          children: [
            // From Date
            Expanded(
              child: InkWell(
                onTap: () async {
                  final picked = await _selectDate(context, _fromDate);
                  if (picked != null) {
                    setState(() {
                      _fromDate = picked;
                    });
                    _fetchSubmissions();
                  }
                },
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'From Date',
                    border: OutlineInputBorder(),
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    prefixIcon: Icon(Icons.calendar_today, size: 20),
                  ),
                  child: Text(
                    _fromDate != null
                        ? '${_fromDate!.day}/${_fromDate!.month}/${_fromDate!.year}'
                        : 'Select Date',
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
                onTap: () async {
                  final picked = await _selectDate(context, _toDate);
                  if (picked != null) {
                    setState(() {
                      _toDate = picked;
                    });
                    _fetchSubmissions();
                  }
                },
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'To Date',
                    border: OutlineInputBorder(),
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    prefixIcon: Icon(Icons.calendar_today, size: 20),
                  ),
                  child: Text(
                    _toDate != null
                        ? '${_toDate!.day}/${_toDate!.month}/${_toDate!.year}'
                        : 'Select Date',
                    style: TextStyle(
                      color: _toDate != null ? Colors.black : Colors.grey[600],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // Table View tab filters - frequency, form type and office dropdowns
  Widget _buildTableViewFilters() {
    return Column(
      children: [
        // First row: Frequency Type
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

        // Second row: Form Type
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

        // Third row: Office Name
        DropdownButtonFormField<String>(
          decoration: const InputDecoration(
            labelText: 'Office Name',
            border: OutlineInputBorder(),
            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            prefixIcon: Icon(Icons.business, size: 20),
          ),
          // Ensure the value exists in the items list, otherwise use null
          value: _submissionOfficeNames.contains(_filters.officeName)
              ? _filters.officeName
              : null,
          hint: Text(_submissionOfficeNames.isEmpty
              ? 'No offices in current data'
              : 'All Offices (${_submissionOfficeNames.length} available)'),
          isExpanded: true,
          items: [
            const DropdownMenuItem<String>(
              value: null,
              child: Text('All Offices'),
            ),
            // Use office names from current submissions instead of all offices
            ..._submissionOfficeNames.map((officeName) {
              return DropdownMenuItem<String>(
                value: officeName,
                child: Text(officeName),
              );
            }),
          ],
          onChanged: (String? newValue) {
            _applyFilters(_filters.copyWith(officeName: newValue));
          },
        ),
        const SizedBox(height: 12),

        // Fourth row: Date Range
        Row(
          children: [
            // From Date
            Expanded(
              child: InkWell(
                onTap: () async {
                  final picked = await _selectDate(context, _fromDate);
                  if (picked != null) {
                    setState(() {
                      _fromDate = picked;
                    });
                    _fetchSubmissions();
                  }
                },
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'From Date',
                    border: OutlineInputBorder(),
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    prefixIcon: Icon(Icons.calendar_today, size: 20),
                  ),
                  child: Text(
                    _fromDate != null
                        ? '${_fromDate!.day}/${_fromDate!.month}/${_fromDate!.year}'
                        : 'Select Date',
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
                onTap: () async {
                  final picked = await _selectDate(context, _toDate);
                  if (picked != null) {
                    setState(() {
                      _toDate = picked;
                    });
                    _fetchSubmissions();
                  }
                },
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'To Date',
                    border: OutlineInputBorder(),
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    prefixIcon: Icon(Icons.calendar_today, size: 20),
                  ),
                  child: Text(
                    _toDate != null
                        ? '${_toDate!.day}/${_toDate!.month}/${_toDate!.year}'
                        : 'Select Date',
                    style: TextStyle(
                      color: _toDate != null ? Colors.black : Colors.grey[600],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
