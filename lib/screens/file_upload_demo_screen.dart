import 'package:flutter/material.dart';
import '../widgets/file_upload_widget.dart';
import '../services/file_upload_service.dart';

class FileUploadDemoScreen extends StatefulWidget {
  const FileUploadDemoScreen({Key? key}) : super(key: key);

  @override
  State<FileUploadDemoScreen> createState() => _FileUploadDemoScreenState();
}

class _FileUploadDemoScreenState extends State<FileUploadDemoScreen> {
  final List<FileUploadResult> _allUploadResults = [];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('File Upload Demo'),
        backgroundColor: Theme.of(context).primaryColor,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Page header
            const Text(
              'File Upload Examples',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Choose from different upload configurations below:',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 24),

            // Single file upload
            FileUploadWidget(
              title: 'Single File Upload',
              subtitle: 'Upload one file at a time',
              allowMultiple: false,
              maxFileSizeInMB: 10,
              uploadBucket: 'uploads', // Replace with your Supabase bucket name
              uploadFolder: 'single-files',
              onUploadComplete: _handleUploadComplete,
              onError: _handleUploadError,
            ),
            const SizedBox(height: 24),

            // Multiple file upload
            FileUploadWidget(
              title: 'Multiple File Upload',
              subtitle: 'Upload multiple files at once',
              allowMultiple: true,
              maxFileSizeInMB: 5,
              uploadBucket: 'uploads', // Replace with your Supabase bucket name
              uploadFolder: 'multiple-files',
              onUploadComplete: _handleUploadComplete,
              onError: _handleUploadError,
            ),
            const SizedBox(height: 24),

            // Image only upload
            FileUploadWidget(
              title: 'Image Upload Only',
              subtitle: 'Only image files allowed',
              allowMultiple: true,
              allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
              maxFileSizeInMB: 5,
              uploadBucket: 'uploads', // Replace with your Supabase bucket name
              uploadFolder: 'images',
              onUploadComplete: _handleUploadComplete,
              onError: _handleUploadError,
            ),
            const SizedBox(height: 24),

            // Document only upload
            FileUploadWidget(
              title: 'Document Upload Only',
              subtitle: 'PDF, DOC, and text files only',
              allowMultiple: true,
              allowedExtensions: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
              maxFileSizeInMB: 20,
              uploadBucket: 'uploads', // Replace with your Supabase bucket name
              uploadFolder: 'documents',
              onUploadComplete: _handleUploadComplete,
              onError: _handleUploadError,
            ),
            const SizedBox(height: 24),

            // All upload results summary
            if (_allUploadResults.isNotEmpty) ...[
              _buildUploadSummary(),
              const SizedBox(height: 24),
            ],

            // Instructions
            _buildInstructions(),
          ],
        ),
      ),
    );
  }

  Widget _buildUploadSummary() {
    final successCount = _allUploadResults.where((r) => r.success).length;
    final failureCount = _allUploadResults.length - successCount;

    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.summarize, color: Theme.of(context).primaryColor),
                const SizedBox(width: 8),
                const Text(
                  'Upload Summary',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildSummaryCard(
                    'Total Uploads',
                    _allUploadResults.length.toString(),
                    Colors.blue,
                    Icons.cloud_upload,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildSummaryCard(
                    'Successful',
                    successCount.toString(),
                    Colors.green,
                    Icons.check_circle,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildSummaryCard(
                    'Failed',
                    failureCount.toString(),
                    Colors.red,
                    Icons.error,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _clearAllResults,
              icon: const Icon(Icons.clear_all, size: 18),
              label: const Text('Clear Summary'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.grey,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryCard(String title, String value, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            title,
            style: TextStyle(
              fontSize: 12,
              color: color,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildInstructions() {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.info, color: Theme.of(context).primaryColor),
                const SizedBox(width: 8),
                const Text(
                  'Setup Instructions',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text(
              '1. Configure Supabase Storage:',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const Text(
              '   • Create a bucket named "uploads" in your Supabase project\n'
              '   • Set appropriate permissions for file uploads\n'
              '   • Update bucket name in the code if different',
              style: TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 12),
            const Text(
              '2. Permissions:',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const Text(
              '   • Add camera and storage permissions to AndroidManifest.xml\n'
              '   • Add photo library permissions to Info.plist for iOS',
              style: TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 12),
            const Text(
              '3. File Types:',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const Text(
              '   • Images: JPG, PNG, GIF, WebP\n'
              '   • Documents: PDF, DOC, DOCX, TXT, RTF\n'
              '   • Custom extensions can be configured',
              style: TextStyle(fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }

  void _handleUploadComplete(List<FileUploadResult> results) {
    setState(() {
      _allUploadResults.addAll(results);
    });

    final successCount = results.where((r) => r.success).length;
    final message = successCount == results.length
        ? '✅ All ${results.length} files uploaded successfully!'
        : '⚠️ ${successCount}/${results.length} files uploaded successfully';

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: successCount == results.length ? Colors.green : Colors.orange,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _handleUploadError(String error) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Upload Error: $error'),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  void _clearAllResults() {
    setState(() {
      _allUploadResults.clear();
    });
  }
}
