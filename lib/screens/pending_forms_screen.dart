import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:cloud_firestore/cloud_firestore.dart';
import './dynamic_page_screen.dart';

class PendingFormsScreen extends StatefulWidget {
  const PendingFormsScreen({Key? key}) : super(key: key);

  @override
  State<PendingFormsScreen> createState() => _PendingFormsScreenState();
}

class _PendingFormsScreenState extends State<PendingFormsScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  String? _userOffice;
  List<Map<String, dynamic>> _pendingForms = [];

  @override
  void initState() {
    super.initState();
    _loadPendingForms();
  }

  Future<void> _loadPendingForms() async {
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

      // Load pending forms for the user's office
      await _loadOfficePendingForms(userOffice);
    } catch (error) {
      setState(() {
        _errorMessage = 'Error loading pending forms: $error';
        _isLoading = false;
      });
    }
  }

  Future<String?> _getUserOffice() async {
    try {
      final user = firebase_auth.FirebaseAuth.instance.currentUser;
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
          print('✅ Pending Forms: Found office in Firebase: $officeName');
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
      print('✅ Pending Forms: Found office in Supabase: $officeName');
      return officeName;
    } catch (error) {
      print('❌ Pending Forms: Error getting user office: $error');
      return null;
    }
  }

  Future<void> _loadOfficePendingForms(String officeName) async {
    try {
      final supabase = Supabase.instance.client;

      print('🔍 Pending Forms: Loading forms for office: "$officeName"');

      // Get all form configurations from page_configurations table
      final response = await supabase
          .from('page_configurations')
          .select('id, title, selected_offices');

      final allFormConfigs = response as List<dynamic>;
      final assignedForms = <Map<String, dynamic>>[];

      print(
          '🔍 Pending Forms: Found ${allFormConfigs.length} total form configurations');

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
              'form_identifier': formConfig['id'],
            });
            print(
                '✅ Pending Forms: Form "${formConfig['title']}" is assigned to office');
          }
        } else {
          // Forms with no office restrictions are assigned to all offices
          assignedForms.add({
            'id': formConfig['id'],
            'title': formConfig['title'],
            'form_identifier': formConfig['id'],
          });
          print(
              '✅ Pending Forms: Form "${formConfig['title']}" has no restrictions (assigned to all)');
        }
      }

      print(
          '🔍 Pending Forms: Found ${assignedForms.length} forms assigned to office');

      // Get completed submissions for this office
      final submissionsResponse = await supabase
          .from('dynamic_form_submissions')
          .select('form_identifier, submission_data')
          .order('created_at', ascending: false);

      final allSubmissions = submissionsResponse as List<dynamic>;
      final completedFormIds = <String>{};

      // Find completed forms for this office
      for (final submission in allSubmissions) {
        final submissionData =
            submission['submission_data'] as Map<String, dynamic>?;
        if (submissionData == null) continue;

        // Check if submission belongs to user's office
        final submissionOffice = _extractOfficeFromSubmission(submissionData);
        if (submissionOffice != null &&
            submissionOffice.toLowerCase() == officeName.toLowerCase()) {
          // Check if submission is completed
          final isCompleted = _isSubmissionCompleted(submissionData);
          if (isCompleted) {
            completedFormIds.add(submission['form_identifier']);
          }
        }
      }

      print(
          '🔍 Pending Forms: Found ${completedFormIds.length} completed form types: $completedFormIds');

      // Calculate pending forms (assigned forms - completed forms)
      final pendingForms = assignedForms.where((form) {
        final formId = form['form_identifier'];
        final isPending = !completedFormIds.contains(formId);

        if (isPending) {
          print('⏳ Pending Forms: Form "$formId" is pending (not completed)');
        } else {
          print('✅ Pending Forms: Form "$formId" is completed');
        }

        return isPending;
      }).toList();

      setState(() {
        _pendingForms = pendingForms;
        _isLoading = false;
      });

      print(
          '✅ Pending Forms: Final result - ${pendingForms.length} pending forms');
    } catch (error) {
      setState(() {
        _errorMessage = 'Error loading pending forms: $error';
        _isLoading = false;
      });
    }
  }

  String? _extractOfficeFromSubmission(Map<String, dynamic> submissionData) {
    // Use the same logic as status screen
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
        break;
      }
    }

    return foundOffice;
  }

  bool _isSubmissionCompleted(Map<String, dynamic> submissionData) {
    // Use the same logic as status screen
    final meaningfulFields = submissionData.entries.where((entry) {
      final value = entry.value;
      final key = entry.key;

      if (value == null || value.toString().trim().isEmpty) return false;

      if (key.toLowerCase().contains('timestamp') ||
          key.toLowerCase().contains('created') ||
          key.toLowerCase().contains('updated') ||
          key.toLowerCase().contains('id') ||
          key.toLowerCase().contains('user_id') ||
          key.toLowerCase().contains('form_identifier')) return false;

      if (value.toString().trim().length < 2) return false;

      return true;
    }).length;

    return meaningfulFields >= 2;
  }

  Widget _buildPendingFormCard(Map<String, dynamic> form) {
    final formTitle = form['title'] as String? ?? 'Unknown Form';
    final formId = form['id'] as String? ?? 'Unknown ID';

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      elevation: 2,
      child: InkWell(
        onTap: () {
          // Navigate to dynamic form screen
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => DynamicPageScreen(
                pageId: formId,
              ),
            ),
          );
        },
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Form icon
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.assignment_outlined,
                  color: Colors.orange,
                  size: 28,
                ),
              ),
              const SizedBox(width: 16),

              // Form details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      formTitle,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.orange.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        'Pending Submission',
                        style: TextStyle(
                          color: Colors.orange,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Arrow icon
              const Icon(
                Icons.arrow_forward_ios,
                color: Colors.grey,
                size: 16,
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pending Forms'),
        backgroundColor: Theme.of(context).primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadPendingForms,
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
                        onPressed: _loadPendingForms,
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
                            'Pending Forms: ${_pendingForms.length}',
                            style: const TextStyle(
                              fontSize: 14,
                              color: Colors.grey,
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Pending forms list
                    Expanded(
                      child: _pendingForms.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.check_circle_outline,
                                    size: 64,
                                    color: Colors.green[400],
                                  ),
                                  const SizedBox(height: 16),
                                  const Text(
                                    'All forms completed!',
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w500,
                                      color: Colors.green,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  const Text(
                                    'No pending forms for this office',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Colors.grey,
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              itemCount: _pendingForms.length,
                              itemBuilder: (context, index) {
                                return _buildPendingFormCard(
                                    _pendingForms[index]);
                              },
                            ),
                    ),
                  ],
                ),
    );
  }
}
