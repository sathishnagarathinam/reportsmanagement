import 'package:flutter/material.dart';
import '../services/reports_routing_service.dart';
import 'reports_screen.dart';
import 'simple_reports_screen.dart';

/// Wrapper screen that determines which type of reports to show
/// Report Screen 1: Division users → Comprehensive reports (Summary + Submissions + Table View)
/// Report Screen 2: Other users → Simple table view only with office-specific data
class ReportsWrapperScreen extends StatefulWidget {
  const ReportsWrapperScreen({Key? key}) : super(key: key);

  @override
  State<ReportsWrapperScreen> createState() => _ReportsWrapperScreenState();
}

class _ReportsWrapperScreenState extends State<ReportsWrapperScreen> {
  bool? _shouldShowComprehensive;
  bool _isLoading = true;
  String? _error;
  Map<String, dynamic>? _officeInfo;

  @override
  void initState() {
    super.initState();
    _determineReportType();
  }

  Future<void> _determineReportType() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      print('🚀 === ReportsWrapper: Starting report type determination ===');
      print('📋 ReportsWrapper: Determining report screen type for user...');

      // Log detailed access information for debugging
      await ReportsRoutingService.logUserAccessInfo();

      // Clear cache first to ensure fresh data
      ReportsRoutingService.clearCache();
      print('🗑️ ReportsWrapper: Cache cleared for fresh analysis');

      // Get comprehensive office information (this now includes direct division logic)
      final officeInfo = await ReportsRoutingService.getUserOfficeInfo();

      // Extract the division status from office info (which uses direct logic)
      final shouldShowComprehensive =
          officeInfo['isDivisionUser'] as bool? ?? false;

      print('🔍 ReportsWrapper: Office info result: $officeInfo');
      print(
          '🔍 ReportsWrapper: Extracted shouldShowComprehensive: $shouldShowComprehensive');

      if (mounted) {
        setState(() {
          _shouldShowComprehensive = shouldShowComprehensive;
          _officeInfo = officeInfo;
          _isLoading = false;
        });
      }

      print(
          '✅ ReportsWrapper: Report screen type determined - Comprehensive: $shouldShowComprehensive');

      if (shouldShowComprehensive) {
        print(
            '🎯 ReportsWrapper: Division user detected → Will show Report Screen 1 (Comprehensive)');
      } else {
        print(
            '🎯 ReportsWrapper: Office user detected → Will show Report Screen 2 (Table Only)');
      }
    } catch (error) {
      print('❌ ReportsWrapper: Error determining report screen type: $error');

      if (mounted) {
        setState(() {
          _error = error.toString();
          _isLoading = false;
          _shouldShowComprehensive =
              false; // Default to simple reports on error
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return _buildLoadingScreen();
    }

    if (_error != null) {
      return _buildErrorScreen();
    }

    // Show appropriate reports screen based on user's office type
    if (_shouldShowComprehensive == true) {
      print(
          '📋 ReportsWrapper: Showing Report Screen 1 - Comprehensive Reports (Division user)');
      print(
          '📋 ReportsWrapper: Features: Summary + Submissions + Table View tabs');
      return const ReportsScreen(); // Report Screen 1: Full comprehensive reports
    } else {
      print(
          '📋 ReportsWrapper: Showing Report Screen 2 - Simple Table View (Office user)');
      print(
          '📋 ReportsWrapper: Features: Table View only with office-specific data');
      return const SimpleReportsScreen(); // Report Screen 2: Table view only
    }
  }

  Widget _buildLoadingScreen() {
    return Scaffold(
      backgroundColor: const Color(0xFF1E3A8A),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Logo
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.assessment,
                color: Color(0xFF1E3A8A),
                size: 40,
              ),
            ),
            const SizedBox(height: 24),

            // Loading indicator
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
            ),
            const SizedBox(height: 16),

            // Loading text
            const Text(
              'Determining Report Screen...',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Checking your office type',
              style: TextStyle(
                color: Colors.white70,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorScreen() {
    return Scaffold(
      backgroundColor: const Color(0xFF1E3A8A),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Error icon
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(
                  Icons.error_outline,
                  color: Colors.red,
                  size: 40,
                ),
              ),
              const SizedBox(height: 24),

              // Error title
              const Text(
                'Unable to Load Reports',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),

              // Error message
              Text(
                'Error: $_error',
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 14,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),

              // Retry button
              ElevatedButton.icon(
                onPressed: _determineReportType,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF1E3A8A),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Fallback button
              TextButton(
                onPressed: () {
                  // Navigate to simple reports as fallback
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(
                      builder: (context) => const SimpleReportsScreen(),
                    ),
                  );
                },
                child: const Text(
                  'Continue with Table View Reports',
                  style: TextStyle(
                    color: Colors.white70,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
