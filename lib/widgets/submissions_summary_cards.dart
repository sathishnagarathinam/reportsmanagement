import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/reports_service.dart';
import '../services/office_service.dart';
import 'dart:io';

class SubmissionsSummaryCards extends StatefulWidget {
  final List<FormSubmission> submissions;
  final bool loading;
  final VoidCallback onRefresh;
  final ReportsFilter filters;

  const SubmissionsSummaryCards({
    super.key,
    required this.submissions,
    required this.loading,
    required this.onRefresh,
    required this.filters,
  });

  @override
  State<SubmissionsSummaryCards> createState() =>
      _SubmissionsSummaryCardsState();
}

class _SubmissionsSummaryCardsState extends State<SubmissionsSummaryCards> {
  OfficeSubmissionSummary? _summary;
  bool _summaryLoading = false;
  String? _expandedCard;

  // Office details cache
  final Map<String, Map<String, dynamic>> _officeDetailsCache = {};

  // Contact information cache for pending offices
  final Map<String, Map<String, dynamic>?> _contactCache = {};

  @override
  void initState() {
    super.initState();
    _calculateOfficeSummary();
  }

  // Fetch office details from Supabase offices table
  Future<Map<String, dynamic>?> _fetchOfficeDetails(String officeName) async {
    // Check cache first
    if (_officeDetailsCache.containsKey(officeName)) {
      return _officeDetailsCache[officeName];
    }

    try {
      print('🏢 Fetching office details for: $officeName');

      // Fetch office details from Supabase offices table
      final officeDetails = await OfficeService.getOfficeDetails(officeName);

      if (officeDetails != null) {
        _officeDetailsCache[officeName] = officeDetails;
        print('✅ Office details cached for $officeName: $officeDetails');
      }

      return officeDetails;
    } catch (error) {
      print('❌ Error fetching office details for $officeName: $error');
      return null;
    }
  }

  // Fetch contact information for pending offices
  Future<Map<String, dynamic>?> _fetchContactInfo(String officeName) async {
    // Check cache first
    if (_contactCache.containsKey(officeName)) {
      return _contactCache[officeName];
    }

    try {
      print('📞 Fetching contact info for pending office: $officeName');

      // Query user_profiles table to find users associated with this office
      final response = await Supabase.instance.client
          .from('user_profiles')
          .select('firstName, lastName, phone, mobile, employeeId, officeName')
          .eq('officeName', officeName)
          .limit(5); // Get up to 5 users for this office

      if (response.isNotEmpty) {
        // Prioritize users with phone numbers
        Map<String, dynamic>? primaryContact;

        for (final user in response) {
          print('🔍 DEBUG: Processing user: $user');
          final phone = user['phone'] ?? user['mobile'];
          print('🔍 DEBUG: Phone from user: $phone');

          if (phone != null && phone.toString().trim().isNotEmpty) {
            primaryContact = {
              'name':
                  '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}'.trim(),
              'phone': phone.toString().trim(),
              'employeeId': user['employeeId'] ?? 'Unknown',
              'officeName': user['officeName'] ?? officeName,
            };
            print(
                '🔍 DEBUG: Found primary contact with phone: $primaryContact');
            break; // Use first user with phone number
          } else {
            print(
                '🔍 DEBUG: User has no phone number: ${user['firstName']} ${user['lastName']}');
          }
        }

        // If no user with phone found, use first user anyway
        if (primaryContact == null && response.isNotEmpty) {
          final user = response.first;
          primaryContact = {
            'name':
                '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}'.trim(),
            'phone': null,
            'employeeId': user['employeeId'] ?? 'Unknown',
            'officeName': user['officeName'] ?? officeName,
          };
        }

        _contactCache[officeName] = primaryContact;
        print('✅ Contact info cached for $officeName: $primaryContact');
        return primaryContact;
      } else {
        print('⚠️ No users found for office: $officeName');
        _contactCache[officeName] = null;
        return null;
      }
    } catch (error) {
      print('❌ Error fetching contact info for $officeName: $error');
      _contactCache[officeName] = null;
      return null;
    }
  }

  // Make phone call using url_launcher
  Future<void> _makePhoneCall(
      String phoneNumber, String contactName, String officeName) async {
    try {
      print('🔍 DEBUG: Starting phone call process...');
      print('🔍 DEBUG: Raw phone number: "$phoneNumber"');
      print('🔍 DEBUG: Contact name: "$contactName"');
      print('🔍 DEBUG: Office name: "$officeName"');

      // Clean phone number (remove spaces, dashes, etc.)
      final cleanPhone = phoneNumber.replaceAll(RegExp(r'[^\d+]'), '');
      print('🔍 DEBUG: Cleaned phone number: "$cleanPhone"');

      // Create tel URI
      final Uri phoneUri = Uri(scheme: 'tel', path: cleanPhone);
      print('🔍 DEBUG: Phone URI: $phoneUri');

      print('📞 Attempting to call $contactName at $officeName: $cleanPhone');

      // Check if the device can handle tel: URLs
      final canLaunch = await canLaunchUrl(phoneUri);
      print('🔍 DEBUG: Can launch URL: $canLaunch');

      if (canLaunch) {
        // Try to launch the phone call
        final launched = await launchUrl(
          phoneUri,
          mode: LaunchMode.externalApplication, // Force external app
        );
        print('🔍 DEBUG: Launch result: $launched');
        print('✅ Phone call initiated successfully');

        // Show success message
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Calling $contactName...'),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 2),
            ),
          );
        }
      } else {
        print('❌ Cannot launch phone call - device does not support tel: URLs');
        // Show error message to user
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Phone calling not supported on this device'),
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      }
    } catch (error) {
      print('❌ Error making phone call: $error');
      print('🔍 DEBUG: Error type: ${error.runtimeType}');
      print('🔍 DEBUG: Error details: ${error.toString()}');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error initiating call: ${error.toString()}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  @override
  void didUpdateWidget(SubmissionsSummaryCards oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.submissions != widget.submissions ||
        oldWidget.filters.formIdentifier != widget.filters.formIdentifier) {
      _calculateOfficeSummary();
    }
  }

  Future<void> _calculateOfficeSummary() async {
    if (widget.filters.formIdentifier == null) {
      // If no specific form is selected, show basic submission count
      final uniqueOffices =
          _getUniqueOfficesFromSubmissions(widget.submissions);
      setState(() {
        _summary = OfficeSubmissionSummary(
          completedOffices: uniqueOffices,
          pendingOffices: [],
          totalTargetOffices: uniqueOffices.length,
          completedCount: uniqueOffices.length,
          pendingCount: 0,
        );
      });
      return;
    }

    setState(() {
      _summaryLoading = true;
    });

    try {
      // Get completed offices from current submissions
      final completedOffices =
          _getUniqueOfficesFromSubmissions(widget.submissions);

      // Get target offices from page_configurations
      final targetOffices =
          await _getTargetOfficesForForm(widget.filters.formIdentifier!);

      // Calculate pending offices
      final pendingOffices = targetOffices
          .where((office) => !completedOffices.any((completed) =>
              completed.toLowerCase().trim() == office.toLowerCase().trim()))
          .toList();

      setState(() {
        _summary = OfficeSubmissionSummary(
          completedOffices: completedOffices,
          pendingOffices: pendingOffices,
          totalTargetOffices: targetOffices.length,
          completedCount: completedOffices.length,
          pendingCount: pendingOffices.length,
        );
      });
    } catch (error) {
      print('Error calculating office summary: $error');
      // Fallback to basic count
      final uniqueOffices =
          _getUniqueOfficesFromSubmissions(widget.submissions);
      setState(() {
        _summary = OfficeSubmissionSummary(
          completedOffices: uniqueOffices,
          pendingOffices: [],
          totalTargetOffices: uniqueOffices.length,
          completedCount: uniqueOffices.length,
          pendingCount: 0,
        );
      });
    } finally {
      setState(() {
        _summaryLoading = false;
      });
    }
  }

  List<String> _getUniqueOfficesFromSubmissions(
      List<FormSubmission> submissions) {
    final officeSet = <String>{};

    for (final submission in submissions) {
      // Look for office name in submission_data
      final submissionData = submission.submissionData;
      if (submissionData != null) {
        for (final entry in submissionData.entries) {
          final value = entry.value;
          if (value is String &&
              (value.contains(' BO') ||
                  value.contains(' SO') ||
                  value.contains(' RO') ||
                  value.contains(' HO') ||
                  value.contains(' DO') ||
                  value.contains('Office'))) {
            officeSet.add(value.trim());
            break; // Found office name, move to next submission
          }
        }
      }
    }

    return officeSet.where((office) => office.isNotEmpty).toList();
  }

  Future<List<String>> _getTargetOfficesForForm(String formIdentifier) async {
    try {
      print('🎯 Fetching target offices for form: $formIdentifier');

      final response = await Supabase.instance.client
          .from('page_configurations')
          .select('selected_offices')
          .eq('id', formIdentifier)
          .single();

      if (response['selected_offices'] == null) {
        print('No selected_offices found for form: $formIdentifier');
        return [];
      }

      // selected_offices should be an array of office names
      final selectedOffices = response['selected_offices'];
      final targetOffices =
          selectedOffices is List ? selectedOffices.cast<String>() : <String>[];

      print('🎯 Target offices for form: $targetOffices');
      return targetOffices;
    } catch (error) {
      print('Error fetching target offices: $error');
      return [];
    }
  }

  void _handleCardTap(String cardType) {
    setState(() {
      _expandedCard = _expandedCard == cardType ? null : cardType;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.loading || _summaryLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Loading submission summary...'),
          ],
        ),
      );
    }

    if (_summary == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            const Text('Unable to calculate summary'),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: widget.onRefresh,
              icon: const Icon(Icons.refresh),
              label: const Text('Refresh'),
            ),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: SingleChildScrollView(
        child: Column(
          children: [
            // Summary Cards
            Row(
              children: [
                // Completed Card
                Expanded(
                  child: _buildSummaryCard(
                    title: 'Completed',
                    subtitle: 'Offices that have submitted',
                    count: _summary!.completedCount,
                    countLabel: _summary!.completedCount == 1
                        ? 'office submitted'
                        : 'offices submitted',
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF28a745), Color(0xFF20c997)],
                    ),
                    icon: Icons.check_circle,
                    cardType: 'completed',
                  ),
                ),
                const SizedBox(width: 16),
                // Pending Card
                Expanded(
                  child: _buildSummaryCard(
                    title: 'Not Completed',
                    subtitle: 'Offices pending submission',
                    count: _summary!.pendingCount,
                    countLabel: _summary!.pendingCount == 1
                        ? 'office pending'
                        : 'offices pending',
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFFffc107), Color(0xFFfd7e14)],
                    ),
                    icon: Icons.schedule,
                    cardType: 'pending',
                  ),
                ),
              ],
            ),

            // Expanded Details
            if (_expandedCard != null) ...[
              const SizedBox(height: 16),
              _buildExpandedDetails(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryCard({
    required String title,
    required String subtitle,
    required int count,
    required String countLabel,
    required LinearGradient gradient,
    required IconData icon,
    required String cardType,
  }) {
    final isExpanded = _expandedCard == cardType;

    return GestureDetector(
      onTap: () => _handleCardTap(cardType),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        transform: Matrix4.identity()..scale(isExpanded ? 1.02 : 1.0),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: gradient,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color:
                    gradient.colors.first.withOpacity(isExpanded ? 0.3 : 0.2),
                blurRadius: isExpanded ? 15 : 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(icon, size: 32, color: Colors.white),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          subtitle,
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.9),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Center(
                child: Text(
                  count.toString(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 36,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  countLabel,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.9),
                    fontSize: 12,
                  ),
                ),
              ),
              if (isExpanded) ...[
                const SizedBox(height: 12),
                Center(
                  child: Text(
                    'Tap to view details',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 10,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildExpandedDetails() {
    return Card(
      elevation: 4,
      child: Column(
        mainAxisSize: MainAxisSize.min, // Allow column to size itself
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _expandedCard == 'completed'
                  ? const Color(0xFF28a745)
                  : const Color(0xFFffc107),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(4),
                topRight: Radius.circular(4),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  _expandedCard == 'completed'
                      ? Icons.check_circle
                      : Icons.schedule,
                  color: Colors.white,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _expandedCard == 'completed'
                        ? 'Completed Submissions'
                        : 'Pending Submissions',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => setState(() => _expandedCard = null),
                  icon: const Icon(Icons.close, color: Colors.white),
                ),
              ],
            ),
          ),
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(16),
              child: _expandedCard == 'completed'
                  ? _buildCompletedDetails()
                  : _buildPendingDetails(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCompletedDetails() {
    if (_summary!.completedOffices.isEmpty) {
      return const Center(
        child: Text('No completed submissions found'),
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min, // Allow column to size itself
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '${_summary!.completedOffices.length} offices have submitted their reports',
          style: const TextStyle(color: Colors.grey),
        ),
        const SizedBox(height: 16),
        ConstrainedBox(
          constraints: const BoxConstraints(
            maxHeight: 250, // Reduced max height
            minHeight: 100,
          ),
          child: ListView.builder(
            shrinkWrap: true, // Allow ListView to size itself
            itemCount: _summary!.completedOffices.length,
            itemBuilder: (context, index) {
              final office = _summary!.completedOffices[index];
              final officeSubmissions = _getSubmissionsForOffice(office);
              final latestSubmission =
                  officeSubmissions.isNotEmpty ? officeSubmissions.first : null;

              return FutureBuilder<Map<String, dynamic>?>(
                future: _fetchOfficeDetails(office),
                builder: (context, snapshot) {
                  final officeDetails = snapshot.data;

                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey[50],
                      border: Border.all(color: Colors.grey[300]!),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    office,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF28a745),
                                      fontSize: 14,
                                    ),
                                  ),
                                  if (officeDetails != null) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      'Type: ${officeDetails['officeType']}',
                                      style: const TextStyle(
                                          fontSize: 11, color: Colors.grey),
                                    ),
                                    Text(
                                      'Division: ${officeDetails['division']}',
                                      style: const TextStyle(
                                          fontSize: 11, color: Colors.grey),
                                    ),
                                    if (officeDetails['reportingOfficeName'] !=
                                        'No Reporting Office')
                                      Text(
                                        'Reports to: ${officeDetails['reportingOfficeName']}',
                                        style: const TextStyle(
                                            fontSize: 11, color: Colors.grey),
                                      ),
                                  ] else if (snapshot.connectionState ==
                                      ConnectionState.waiting) ...[
                                    const SizedBox(height: 4),
                                    const Text(
                                      'Loading office details...',
                                      style: TextStyle(
                                          fontSize: 11, color: Colors.grey),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFF28a745),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Text(
                                '✓ COMPLETED',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (latestSubmission != null) ...[
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: Colors.grey[200]!),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Latest Submission',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.black87,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Date: ${_formatDate(latestSubmission.submittedAt)}',
                                  style: const TextStyle(
                                      fontSize: 11, color: Colors.grey),
                                ),
                                Text(
                                  'Employee: ${latestSubmission.userName ?? latestSubmission.userId}',
                                  style: const TextStyle(
                                      fontSize: 11, color: Colors.grey),
                                ),
                                if (officeSubmissions.length > 1)
                                  Text(
                                    '+${officeSubmissions.length - 1} more submission${officeSubmissions.length > 2 ? 's' : ''}',
                                    style: const TextStyle(
                                        fontSize: 11, color: Colors.blue),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildPendingDetails() {
    if (_summary!.pendingOffices.isEmpty) {
      return const Center(
        child: Column(
          children: [
            Icon(Icons.celebration, size: 64, color: Color(0xFF28a745)),
            SizedBox(height: 16),
            Text(
              'All offices have submitted!',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF28a745),
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Every target office has completed their submission for this form.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min, // Allow column to size itself
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '${_summary!.pendingOffices.length} offices haven\'t submitted yet',
          style: const TextStyle(color: Colors.grey),
        ),
        if (widget.filters.formIdentifier != null) ...[
          const SizedBox(height: 4),
          Text(
            'Form: ${widget.filters.formIdentifier}',
            style: const TextStyle(fontSize: 12, color: Colors.grey),
          ),
        ],
        const SizedBox(height: 16),
        Flexible(
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              maxHeight: 280, // Increased max height to prevent overflow
              minHeight: 100,
            ),
            child: ListView.builder(
              shrinkWrap: true, // Allow ListView to size itself
              physics: const ClampingScrollPhysics(), // Better scroll behavior
              itemCount: _summary!.pendingOffices.length,
              itemBuilder: (context, index) {
                final office = _summary!.pendingOffices[index];

                return FutureBuilder<Map<String, dynamic>?>(
                  future: _fetchContactInfo(office),
                  builder: (context, snapshot) {
                    final contactInfo = snapshot.data;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(10), // Reduced padding
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF3CD),
                        border: Border.all(color: Colors.grey[300]!),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min, // Minimize height
                              children: [
                                Text(
                                  office,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF856404),
                                    fontSize: 14,
                                  ),
                                  maxLines:
                                      2, // Limit lines to prevent overflow
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 2), // Reduced spacing
                                const Text(
                                  'Awaiting submission',
                                  style: TextStyle(
                                      fontSize: 12, color: Colors.grey),
                                ),
                                if (contactInfo != null) ...[
                                  const SizedBox(height: 2), // Reduced spacing
                                  Text(
                                    'Contact: ${contactInfo['name'] ?? 'Unknown'}',
                                    style: const TextStyle(
                                        fontSize: 11, color: Colors.grey),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  if (contactInfo['phone'] != null)
                                    Text(
                                      'Phone: ${contactInfo['phone']}',
                                      style: const TextStyle(
                                          fontSize: 11, color: Colors.grey),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                ] else if (snapshot.connectionState ==
                                    ConnectionState.waiting) ...[
                                  const SizedBox(height: 2), // Reduced spacing
                                  const Text(
                                    'Loading contact info...',
                                    style: TextStyle(
                                        fontSize: 11, color: Colors.grey),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          const SizedBox(
                              width:
                                  8), // Add spacing between content and button
                          // Use ClipRect to hard-clip any overflow and prevent the 0.643px issue
                          ClipRect(
                            child: Container(
                              height: !kIsWeb && Platform.isAndroid
                                  ? 30
                                  : 40, // Fixed height
                              width: !kIsWeb && Platform.isAndroid
                                  ? 60
                                  : 70, // Fixed width
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  // Call button (replaces pending status)
                                  if (contactInfo != null &&
                                      contactInfo['phone'] != null)
                                    Flexible(
                                      child: GestureDetector(
                                        onTap: () => _makePhoneCall(
                                          contactInfo['phone'],
                                          contactInfo['name'] ?? 'Contact',
                                          office,
                                        ),
                                        child: Container(
                                          padding: EdgeInsets.all(
                                              !kIsWeb && Platform.isAndroid
                                                  ? 4
                                                  : 8),
                                          decoration: BoxDecoration(
                                            color: Colors.green,
                                            borderRadius: BorderRadius.circular(
                                                !kIsWeb && Platform.isAndroid
                                                    ? 16
                                                    : 20),
                                          ),
                                          child: Icon(
                                            Icons.phone,
                                            color: Colors.white,
                                            size: !kIsWeb && Platform.isAndroid
                                                ? 14
                                                : 18,
                                          ),
                                        ),
                                      ),
                                    )
                                  else if (contactInfo != null &&
                                      contactInfo['phone'] == null)
                                    Flexible(
                                      child: Container(
                                        padding: EdgeInsets.symmetric(
                                          horizontal:
                                              !kIsWeb && Platform.isAndroid
                                                  ? 2
                                                  : 3,
                                          vertical:
                                              !kIsWeb && Platform.isAndroid
                                                  ? 0
                                                  : 1,
                                        ),
                                        constraints: BoxConstraints(
                                          maxHeight:
                                              !kIsWeb && Platform.isAndroid
                                                  ? 12
                                                  : 22,
                                          maxWidth:
                                              !kIsWeb && Platform.isAndroid
                                                  ? 40
                                                  : 60,
                                        ),
                                        decoration: BoxDecoration(
                                          color: Colors.grey,
                                          borderRadius:
                                              BorderRadius.circular(6),
                                        ),
                                        child: FittedBox(
                                          fit: BoxFit.scaleDown,
                                          child: Text(
                                            'No Phone',
                                            style: TextStyle(
                                              color: Colors.white,
                                              fontSize:
                                                  !kIsWeb && Platform.isAndroid
                                                      ? 5
                                                      : 8,
                                              fontWeight: FontWeight.w600,
                                              height: 1.0,
                                            ),
                                            textAlign: TextAlign.center,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ),
                                    )
                                  else if (snapshot.connectionState ==
                                      ConnectionState.waiting)
                                    Flexible(
                                      child: Container(
                                        padding: EdgeInsets.all(
                                            !kIsWeb && Platform.isAndroid
                                                ? 1
                                                : 2),
                                        constraints: BoxConstraints(
                                          maxHeight:
                                              !kIsWeb && Platform.isAndroid
                                                  ? 12
                                                  : 22,
                                          maxWidth:
                                              !kIsWeb && Platform.isAndroid
                                                  ? 12
                                                  : 22,
                                        ),
                                        decoration: BoxDecoration(
                                          color: Colors.grey[300],
                                          borderRadius:
                                              BorderRadius.circular(6),
                                        ),
                                        child: SizedBox(
                                          width: !kIsWeb && Platform.isAndroid
                                              ? 10
                                              : 16,
                                          height: !kIsWeb && Platform.isAndroid
                                              ? 10
                                              : 16,
                                          child: CircularProgressIndicator(
                                            strokeWidth:
                                                !kIsWeb && Platform.isAndroid
                                                    ? 1.0
                                                    : 1.2,
                                            valueColor:
                                                const AlwaysStoppedAnimation<
                                                    Color>(Colors.grey),
                                          ),
                                        ),
                                      ),
                                    )
                                  else
                                    Flexible(
                                      child: Container(
                                        padding: EdgeInsets.symmetric(
                                          horizontal:
                                              !kIsWeb && Platform.isAndroid
                                                  ? 2
                                                  : 3,
                                          vertical:
                                              !kIsWeb && Platform.isAndroid
                                                  ? 0
                                                  : 1,
                                        ),
                                        constraints: BoxConstraints(
                                          maxHeight:
                                              !kIsWeb && Platform.isAndroid
                                                  ? 12
                                                  : 22,
                                          maxWidth:
                                              !kIsWeb && Platform.isAndroid
                                                  ? 50
                                                  : 70,
                                        ),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFffc107),
                                          borderRadius:
                                              BorderRadius.circular(6),
                                        ),
                                        child: FittedBox(
                                          fit: BoxFit.scaleDown,
                                          child: Text(
                                            '📞 PENDING',
                                            style: TextStyle(
                                              color: Colors.black87,
                                              fontSize:
                                                  !kIsWeb && Platform.isAndroid
                                                      ? 5
                                                      : 8,
                                              fontWeight: FontWeight.w600,
                                              height: 1.0,
                                            ),
                                            textAlign: TextAlign.center,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ), // ClipRect closing bracket
                        ],
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ),
      ],
    );
  }

  List<FormSubmission> _getSubmissionsForOffice(String officeName) {
    return widget.submissions.where((submission) {
      final submissionData = submission.submissionData;
      if (submissionData != null) {
        for (final entry in submissionData.entries) {
          if (entry.value is String &&
              entry.value.toString().trim() == officeName) {
            return true;
          }
        }
      }
      return false;
    }).toList()
      ..sort((a, b) => b.submittedAt.compareTo(a.submittedAt));
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      return 'Today ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} days ago';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }
}

// Data model for office submission summary
class OfficeSubmissionSummary {
  final List<String> completedOffices;
  final List<String> pendingOffices;
  final int totalTargetOffices;
  final int completedCount;
  final int pendingCount;

  OfficeSubmissionSummary({
    required this.completedOffices,
    required this.pendingOffices,
    required this.totalTargetOffices,
    required this.completedCount,
    required this.pendingCount,
  });
}
