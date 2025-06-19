import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';

class StatusScreen extends StatefulWidget {
  const StatusScreen({Key? key}) : super(key: key);

  @override
  State<StatusScreen> createState() => _StatusScreenState();
}

class _StatusScreenState extends State<StatusScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  String? _userOffice;
  int _completedCount = 0;
  int _pendingCount = 0;
  List<Map<String, dynamic>> _submissions = [];
  List<Map<String, dynamic>> _assignedForms = [];
  List<Map<String, dynamic>> _pendingForms = [];
  String _selectedStatus = 'all'; // 'all', 'completed', 'pending'

  @override
  void initState() {
    super.initState();
    _loadUserOfficeAndSubmissions();
  }

  Future<void> _loadUserOfficeAndSubmissions() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Get current user's office
      final userOffice = await _getUserOffice();
      if (userOffice == null) {
        setState(() {
          _errorMessage = 'Unable to determine user office';
          _isLoading = false;
        });
        return;
      }

      setState(() {
        _userOffice = userOffice;
      });

      // Load submissions for the user's office
      await _loadOfficeSubmissions(userOffice);

      // Load assigned forms and calculate pending
      await _loadAssignedFormsAndCalculatePending(userOffice);
    } catch (error) {
      setState(() {
        _errorMessage = 'Error loading data: $error';
        _isLoading = false;
      });
    }
  }

  Future<String?> _getUserOffice() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        throw Exception('User not authenticated');
      }

      // Try to get office from Firebase first
      final firebaseDoc = await FirebaseFirestore.instance
          .collection('employees')
          .doc(user.uid)
          .get();

      if (firebaseDoc.exists) {
        final data = firebaseDoc.data();
        final officeName = data?['officeName'] as String?;
        if (officeName != null && officeName.isNotEmpty) {
          print('✅ Found office in Firebase: $officeName');
          return officeName;
        }
      }

      // Fallback to Supabase
      final supabase = Supabase.instance.client;
      final response = await supabase
          .from('user_profiles')
          .select('officeName')
          .eq('id', user.uid)
          .single();

      final officeName = response['officeName'] as String?;
      print('✅ Found office in Supabase: $officeName');
      return officeName;
    } catch (error) {
      print('❌ Error getting user office: $error');
      return null;
    }
  }

  Future<void> _loadOfficeSubmissions(String officeName) async {
    try {
      final supabase = Supabase.instance.client;

      // Get all submissions for the office
      final response = await supabase
          .from('dynamic_form_submissions')
          .select('*')
          .order('created_at', ascending: false);

      final allSubmissions = response as List<dynamic>;
      final officeSubmissions = <Map<String, dynamic>>[];
      int completed = 0;
      int notCompleted = 0;

      print('🔍 Status: Processing ${allSubmissions.length} total submissions');
      print('🔍 Status: Looking for office: "$officeName"');

      for (final submission in allSubmissions) {
        final submissionData =
            submission['submission_data'] as Map<String, dynamic>?;
        if (submissionData == null) {
          print(
              '⚠️ Status: Skipping submission ${submission['id']} - no submission_data');
          continue;
        }

        // Check if submission belongs to user's office
        final submissionOffice = _extractOfficeFromSubmission(submissionData);
        print(
            '🔍 Status: Submission ${submission['id']} office: "$submissionOffice"');

        if (submissionOffice != null) {
          final officeMatch =
              submissionOffice.toLowerCase() == officeName.toLowerCase();
          print(
              '🔍 Status: Office match check: "$submissionOffice" == "$officeName" -> $officeMatch');

          if (officeMatch) {
            // Determine completion status
            final isCompleted = _isSubmissionCompleted(submissionData);

            final submissionMap = {
              'id': submission['id'],
              'form_identifier': submission['form_identifier'],
              'submission_data': submissionData,
              'created_at': submission['created_at'],
              'office_name': submissionOffice,
              'is_completed': isCompleted,
              'employee_id': submission['employee_id'] ?? 'Unknown',
            };

            officeSubmissions.add(submissionMap);
            print(
                '✅ Status: Added submission ${submission['id']} to office submissions');

            if (isCompleted) {
              completed++;
            } else {
              notCompleted++;
            }
          }
        } else {
          print('❌ Status: No office found in submission ${submission['id']}');
          // Debug: show first few fields of submission data
          final debugFields = submissionData.entries
              .take(5)
              .map((e) => '${e.key}: ${e.value}')
              .join(', ');
          print('🔍 Status: Sample fields: $debugFields');
        }
      }

      setState(() {
        _submissions = officeSubmissions;
        _completedCount = completed;
        // _pendingCount will be calculated in _loadAssignedFormsAndCalculatePending
        _isLoading = false;
      });

      print(
          '✅ Loaded ${officeSubmissions.length} submissions for office: $officeName');
      print('📊 Completed: $completed, Not Completed: $notCompleted');
    } catch (error) {
      setState(() {
        _errorMessage = 'Error loading submissions: $error';
        _isLoading = false;
      });
    }
  }

  String? _extractOfficeFromSubmission(Map<String, dynamic> submissionData) {
    // Use the same logic as reports screen - look through all submission_data fields for office names
    String? foundOffice;

    for (final entry in submissionData.entries) {
      final value = entry.value;
      if (value is String &&
          (value.contains(' RO') ||
              value.contains(' BO') ||
              value.contains(' SO') ||
              value.contains(' HO') ||
              value.contains(' DO') ||
              value.contains('Office'))) {
        foundOffice = value;
        print('🔍 Status: Found office in field "${entry.key}": "$value"');
        break;
      }
    }

    // If not found with postal patterns, try semantic field names
    if (foundOffice == null) {
      final possibleOfficeFields = [
        'office_name',
        'officeName',
        'Office Name',
        'office',
        'Office',
      ];

      for (final field in possibleOfficeFields) {
        final value = submissionData[field];
        if (value is String && value.isNotEmpty) {
          foundOffice = value;
          print('🔍 Status: Found office in semantic field "$field": "$value"');
          break;
        }
      }
    }

    // If still not found, look for office-related keywords
    if (foundOffice == null) {
      for (final entry in submissionData.entries) {
        final value = entry.value;
        if (value is String && value.isNotEmpty) {
          final lowerValue = value.toLowerCase();
          if (looksLikeOfficeName(value)) {
            foundOffice = value;
            print(
                '🔍 Status: Found office-like value in field "${entry.key}": "$value"');
            break;
          }
        }
      }
    }

    return foundOffice;
  }

  bool looksLikeOfficeName(String value) {
    final lowerValue = value.toLowerCase();

    // Skip if it's too short or too long
    if (value.length < 3 || value.length > 100) return false;

    // Skip if it looks like a date
    if (value.contains('T') && value.contains(':')) return false;

    // Skip if it's just a number
    if (double.tryParse(value) != null) return false;

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
      ' ro',
      ' bo',
      ' so',
      ' ho',
      ' do',
    ];

    // Check if value contains office-related keywords
    for (String indicator in officeIndicators) {
      if (lowerValue.contains(indicator)) {
        return true;
      }
    }

    return false;
  }

  bool _isSubmissionCompleted(Map<String, dynamic> submissionData) {
    print('🔍 Completion Check: Starting analysis for submission');

    // Check for completion indicators
    final completionFields = [
      'status',
      'completion_status',
      'is_completed',
      'completed',
    ];

    for (final field in completionFields) {
      final value = submissionData[field];
      if (value != null) {
        print(
            '🔍 Completion Check: Found completion field "$field" with value: "$value" (${value.runtimeType})');

        if (value is bool) {
          print('✅ Completion Check: Boolean value found - returning $value');
          return value;
        }
        if (value is String) {
          final lowerValue = value.toLowerCase();
          final isCompleted = lowerValue == 'completed' ||
              lowerValue == 'complete' ||
              lowerValue == 'done' ||
              lowerValue == 'finished' ||
              lowerValue == 'yes' ||
              lowerValue == 'true';
          print(
              '✅ Completion Check: String value "$lowerValue" -> completed: $isCompleted');
          return isCompleted;
        }
      }
    }

    print(
        '🔍 Completion Check: No explicit completion fields found, checking data completeness');

    // If no explicit completion field, consider it completed if it has substantial data
    final nonEmptyFields = submissionData.values
        .where((value) => value != null && value.toString().trim().isNotEmpty)
        .length;

    print('🔍 Completion Check: Found $nonEmptyFields non-empty fields');

    // Show sample of non-empty fields for debugging
    final sampleFields = submissionData.entries
        .where((entry) =>
            entry.value != null && entry.value.toString().trim().isNotEmpty)
        .take(5)
        .map((entry) => '${entry.key}: "${entry.value}"')
        .join(', ');
    print('🔍 Completion Check: Sample non-empty fields: $sampleFields');

    // Show ALL fields for debugging
    print('🔍 Completion Check: ALL submission fields:');
    submissionData.forEach((key, value) {
      print('  - $key: "$value" (${value.runtimeType})');
    });

    // More realistic completion criteria for dynamic forms
    // 1. If it has substantial data (more than 2 meaningful fields), consider it completed
    // 2. Exclude system fields and empty values from count

    final meaningfulFields = submissionData.entries.where((entry) {
      final value = entry.value;
      final key = entry.key;

      // Skip if value is null or empty
      if (value == null || value.toString().trim().isEmpty) return false;

      // Skip system/metadata fields
      if (key.toLowerCase().contains('timestamp') ||
          key.toLowerCase().contains('created') ||
          key.toLowerCase().contains('updated') ||
          key.toLowerCase().contains('id') ||
          key.toLowerCase().contains('user_id') ||
          key.toLowerCase().contains('form_identifier')) return false;

      // Skip very short values (likely not meaningful data)
      if (value.toString().trim().length < 2) return false;

      return true;
    }).length;

    print(
        '🔍 Completion Check: Found $meaningfulFields meaningful fields (excluding system fields)');

    // Consider completed if it has at least 2 meaningful fields
    // This is more realistic for dynamic forms where users might fill partial data
    final isCompleted = meaningfulFields >= 2;
    print(
        '✅ Completion Check: Final result - $meaningfulFields meaningful fields >= 2 -> completed: $isCompleted');

    return isCompleted;
  }

  Future<void> _loadAssignedFormsAndCalculatePending(String officeName) async {
    try {
      print('🔍 Pending: Loading assigned forms for office: "$officeName"');

      final supabase = Supabase.instance.client;

      // Get all form configurations from page_configurations table
      final response = await supabase
          .from('page_configurations')
          .select('id, title, selected_offices');

      final allFormConfigs = response as List<dynamic>;
      final assignedForms = <Map<String, dynamic>>[];

      print(
          '🔍 Pending: Found ${allFormConfigs.length} total form configurations');

      // Filter forms assigned to this office
      for (final formConfig in allFormConfigs) {
        final selectedOffices =
            formConfig['selected_offices'] as List<dynamic>?;

        if (selectedOffices != null && selectedOffices.isNotEmpty) {
          // Check if this office is in the selected_offices list
          final isAssigned = selectedOffices.any((office) =>
              office.toString().toLowerCase().trim() ==
              officeName.toLowerCase().trim());

          if (isAssigned) {
            assignedForms.add({
              'id': formConfig['id'],
              'title': formConfig['title'],
              'form_identifier': formConfig['id'], // Use id as form_identifier
            });
            print(
                '✅ Pending: Form "${formConfig['title']}" is assigned to office');
          }
        } else {
          // Forms with no office restrictions are assigned to all offices
          assignedForms.add({
            'id': formConfig['id'],
            'title': formConfig['title'],
            'form_identifier': formConfig['id'],
          });
          print(
              '✅ Pending: Form "${formConfig['title']}" has no restrictions (assigned to all)');
        }
      }

      print(
          '🔍 Pending: Found ${assignedForms.length} forms assigned to office');

      // Calculate pending forms (assigned forms - completed forms)
      final completedFormIds = _submissions
          .where((submission) => submission['is_completed'] == true)
          .map((submission) => submission['form_identifier'])
          .toSet();

      print(
          '🔍 Pending: Found ${completedFormIds.length} completed form types: $completedFormIds');

      final pendingForms = assignedForms.where((form) {
        final formId = form['form_identifier'];
        final isPending = !completedFormIds.contains(formId);

        if (isPending) {
          print('⏳ Pending: Form "$formId" is pending (not completed)');
        } else {
          print('✅ Pending: Form "$formId" is completed');
        }

        return isPending;
      }).toList();

      setState(() {
        _assignedForms = assignedForms;
        _pendingForms = pendingForms;
        _pendingCount = pendingForms.length;
      });

      print(
          '✅ Pending: Final counts - Assigned: ${assignedForms.length}, Completed: ${completedFormIds.length}, Pending: ${pendingForms.length}');
    } catch (error) {
      print('❌ Pending: Error loading assigned forms: $error');
      setState(() {
        _assignedForms = [];
        _pendingForms = [];
        _pendingCount = 0;
      });
    }
  }

  List<Map<String, dynamic>> _getFilteredSubmissions() {
    switch (_selectedStatus) {
      case 'completed':
        return _submissions.where((s) => s['is_completed'] == true).toList();
      case 'pending':
        return _pendingForms;
      default:
        return _submissions;
    }
  }

  Widget _buildStatusCard(String title, int count, Color color, String status) {
    final isSelected = _selectedStatus == status;

    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            _selectedStatus = status;
          });
        },
        child: Card(
          elevation: isSelected ? 4 : 2,
          color: isSelected ? color.withOpacity(0.1) : null,
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              border: isSelected ? Border.all(color: color, width: 2) : null,
            ),
            child: Column(
              children: [
                Icon(
                  status == 'completed' ? Icons.check_circle : Icons.pending,
                  color: color,
                  size: 32,
                ),
                const SizedBox(height: 8),
                Text(
                  count.toString(),
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSubmissionCard(Map<String, dynamic> item) {
    // Check if this is a submission or a pending form
    final isSubmission = item.containsKey('submission_data');

    if (isSubmission) {
      // This is a completed submission
      final formIdentifier =
          item['form_identifier'] as String? ?? 'Unknown Form';
      final isCompleted = item['is_completed'] as bool? ?? false;
      final createdAt = item['created_at'] as String?;
      final employeeId = item['employee_id'] as String? ?? 'Unknown';

      DateTime? date;
      if (createdAt != null) {
        try {
          date = DateTime.parse(createdAt);
        } catch (e) {
          // Handle parsing error
        }
      }

      return Card(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: ListTile(
          leading: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: isCompleted
                  ? Colors.green.withOpacity(0.1)
                  : Colors.orange.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              isCompleted ? Icons.check_circle : Icons.pending,
              color: isCompleted ? Colors.green : Colors.orange,
            ),
          ),
          title: Text(
            _formatFormTitle(formIdentifier),
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Employee: $employeeId'),
              if (date != null)
                Text('Date: ${DateFormat('MMM dd, yyyy HH:mm').format(date)}'),
            ],
          ),
          trailing: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: isCompleted ? Colors.green : Colors.orange,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              isCompleted ? 'Completed' : 'Pending',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
      );
    } else {
      // This is a pending form (not yet submitted)
      final formTitle = item['title'] as String? ?? 'Unknown Form';
      final formId = item['id'] as String? ?? 'Unknown ID';

      return Card(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: ListTile(
          leading: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.orange.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(
              Icons.assignment_outlined,
              color: Colors.orange,
            ),
          ),
          title: Text(
            formTitle,
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
          subtitle: const Text('Not yet submitted'),
          trailing: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.orange,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text(
              'Pending',
              style: TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
      );
    }
  }

  String _formatFormTitle(String formIdentifier) {
    return formIdentifier
        .replaceAll('_', ' ')
        .split(' ')
        .map((word) => word.isNotEmpty
            ? word[0].toUpperCase() + word.substring(1).toLowerCase()
            : word)
        .join(' ');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Office Status'),
        backgroundColor: Theme.of(context).primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadUserOfficeAndSubmissions,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.error_outline,
                        size: 64,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        _errorMessage!,
                        textAlign: TextAlign.center,
                        style:
                            const TextStyle(fontSize: 16, color: Colors.grey),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadUserOfficeAndSubmissions,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : Column(
                  children: [
                    // Office info header
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      color: Colors.grey[100],
                      child: Column(
                        children: [
                          Text(
                            _userOffice ?? 'Unknown Office',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Total Submissions: ${_submissions.length}',
                            style: const TextStyle(
                              fontSize: 14,
                              color: Colors.grey,
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Status cards
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          _buildStatusCard(
                            'All\nSubmissions',
                            _submissions.length,
                            Colors.blue,
                            'all',
                          ),
                          const SizedBox(width: 8),
                          _buildStatusCard(
                            'Completed',
                            _completedCount,
                            Colors.green,
                            'completed',
                          ),
                          const SizedBox(width: 8),
                          _buildStatusCard(
                            'Pending',
                            _pendingCount,
                            Colors.orange,
                            'pending',
                          ),
                        ],
                      ),
                    ),

                    // Submissions list
                    Expanded(
                      child: _getFilteredSubmissions().isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.inbox_outlined,
                                    size: 64,
                                    color: Colors.grey[400],
                                  ),
                                  const SizedBox(height: 16),
                                  Text(
                                    _selectedStatus == 'all'
                                        ? 'No submissions found for this office'
                                        : 'No ${_selectedStatus.replaceAll('_', ' ')} submissions',
                                    style: const TextStyle(
                                      fontSize: 16,
                                      color: Colors.grey,
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : ListView.builder(
                              itemCount: _getFilteredSubmissions().length,
                              itemBuilder: (context, index) {
                                return _buildSubmissionCard(
                                    _getFilteredSubmissions()[index]);
                              },
                            ),
                    ),
                  ],
                ),
    );
  }
}
