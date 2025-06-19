import 'package:flutter/material.dart';
import '../services/reports_routing_service.dart';
import 'reports_screen.dart';
import 'simple_reports_screen.dart';

/// Test screen to manually verify the routing logic
class ReportsTestScreen extends StatefulWidget {
  const ReportsTestScreen({Key? key}) : super(key: key);

  @override
  State<ReportsTestScreen> createState() => _ReportsTestScreenState();
}

class _ReportsTestScreenState extends State<ReportsTestScreen> {
  String _testResults = 'Tap "Test Routing" to check office type detection';
  bool _isLoading = false;

  Future<void> _testRouting() async {
    setState(() {
      _isLoading = true;
      _testResults = 'Testing routing logic...';
    });

    try {
      print('🧪 === MANUAL ROUTING TEST ===');

      // Clear cache first for fresh test
      ReportsRoutingService.clearCache();
      print('🧪 Test: Cache cleared for fresh analysis');

      // Test the routing service
      final officeName = await ReportsRoutingService.getCurrentUserOfficeName();
      print('🧪 Test: Office name from service: $officeName');

      // Test direct division logic
      bool directDivisionTest = false;
      if (officeName != null && officeName.trim().isNotEmpty) {
        directDivisionTest =
            officeName.trim().toLowerCase().endsWith('division');
        print('🧪 Test: Direct division logic result: $directDivisionTest');
      }

      final shouldShowComprehensive =
          await ReportsRoutingService.shouldShowComprehensiveReports();
      final officeInfo = await ReportsRoutingService.getUserOfficeInfo();

      print('🧪 Test: shouldShowComprehensive: $shouldShowComprehensive');
      print('🧪 Test: officeInfo: $officeInfo');

      final results = StringBuffer();
      results.writeln('🧪 ROUTING TEST RESULTS:');
      results.writeln('');
      results.writeln('Office Name: ${officeName ?? "NOT FOUND"}');
      results.writeln('');
      if (officeName != null) {
        results.writeln('Office Analysis:');
        results.writeln('- Trimmed: "${officeName.trim()}"');
        results.writeln('- Lowercase: "${officeName.toLowerCase()}"');
        results.writeln(
            '- Ends with "division": ${officeName.toLowerCase().endsWith('division')}');
        results.writeln('');
        results.writeln('🧪 Direct Division Test: $directDivisionTest');
        results.writeln('');
      }
      results.writeln('Should Show Comprehensive: $shouldShowComprehensive');
      results.writeln('');
      results.writeln('Expected Screen:');
      if (shouldShowComprehensive) {
        results.writeln('📊 Report Screen 1 (Comprehensive)');
        results.writeln('- Summary + Submissions + Table View tabs');
      } else {
        results.writeln('📋 Report Screen 2 (Simple)');
        results.writeln('- Table View only');
      }
      results.writeln('');
      results.writeln(
          'Office Info isDivisionUser: ${officeInfo['isDivisionUser']}');
      results.writeln('Office Info accessLevel: ${officeInfo['accessLevel']}');
      results.writeln('Office Info reportType: ${officeInfo['reportType']}');
      results.writeln('');
      results.writeln('Full Office Info: $officeInfo');

      setState(() {
        _testResults = results.toString();
        _isLoading = false;
      });
    } catch (error) {
      setState(() {
        _testResults = 'ERROR: $error';
        _isLoading = false;
      });
    }
  }

  void _navigateToReportScreen1() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const ReportsScreen()),
    );
  }

  void _navigateToReportScreen2() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const SimpleReportsScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1E3A8A),
      appBar: AppBar(
        title: const Text('🧪 Reports Routing Test'),
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Container(
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
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 20),

                // Test Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _isLoading ? null : _testRouting,
                    icon: _isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.bug_report),
                    label:
                        Text(_isLoading ? 'Testing...' : 'Test Routing Logic'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E3A8A),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 20),

                // Manual Navigation Buttons
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _navigateToReportScreen1,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: const Text('📊 Screen 1\n(Comprehensive)'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _navigateToReportScreen2,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: const Text('📋 Screen 2\n(Table Only)'),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // Results
                const Text(
                  'Test Results:',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),

                Expanded(
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: SingleChildScrollView(
                      child: Text(
                        _testResults,
                        style: const TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 20),

                // Instructions
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.blue.shade200),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '📝 Instructions:',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                          '1. Tap "Test Routing Logic" to check your office type'),
                      Text('2. Verify the office name and routing decision'),
                      Text('3. Use manual buttons to test both screens'),
                      Text('4. Check console logs for detailed debugging'),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
