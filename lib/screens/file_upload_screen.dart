import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class FileUploadScreen extends StatefulWidget {
  const FileUploadScreen({Key? key}) : super(key: key);

  @override
  State<FileUploadScreen> createState() => _FileUploadScreenState();
}

class _FileUploadScreenState extends State<FileUploadScreen> {
  final List<File> _selectedFiles = [];
  final List<Map<String, dynamic>> _uploadResults = [];
  bool _isUploading = false;
  double _uploadProgress = 0.0;
  final ImagePicker _imagePicker = ImagePicker();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('File Upload'),
        backgroundColor: Theme.of(context).primaryColor,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            const Text(
              'Upload Files',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Select files from your device to upload to cloud storage',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 24),

            // File selection buttons
            _buildFileSelectionButtons(),
            const SizedBox(height: 24),

            // Selected files list
            if (_selectedFiles.isNotEmpty) ...[
              _buildSelectedFilesList(),
              const SizedBox(height: 24),
            ],

            // Upload progress
            if (_isUploading) ...[
              _buildUploadProgress(),
              const SizedBox(height: 24),
            ],

            // Upload results
            if (_uploadResults.isNotEmpty) ...[
              _buildUploadResults(),
              const SizedBox(height: 24),
            ],

            // Action buttons
            _buildActionButtons(),
          ],
        ),
      ),
    );
  }

  Widget _buildFileSelectionButtons() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Select Files',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                ElevatedButton.icon(
                  onPressed: _isUploading ? null : _pickFiles,
                  icon: const Icon(Icons.folder_open, size: 20),
                  label: const Text('Pick Files'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: _isUploading ? null : _pickImageFromGallery,
                  icon: const Icon(Icons.photo_library, size: 20),
                  label: const Text('Gallery'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: _isUploading ? null : _pickImageFromCamera,
                  icon: const Icon(Icons.camera_alt, size: 20),
                  label: const Text('Camera'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSelectedFilesList() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Selected Files (${_selectedFiles.length})',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ...(_selectedFiles.asMap().entries.map((entry) {
              final index = entry.key;
              final file = entry.value;
              return _buildFileItem(file, index);
            })),
          ],
        ),
      ),
    );
  }

  Widget _buildFileItem(File file, int index) {
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
          onPressed: _isUploading ? null : () => _removeFile(index),
        ),
      ),
    );
  }

  Widget _buildUploadProgress() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Uploading Files...',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            LinearProgressIndicator(
              value: _uploadProgress,
              backgroundColor: Colors.grey[300],
              valueColor:
                  AlwaysStoppedAnimation<Color>(Theme.of(context).primaryColor),
            ),
            const SizedBox(height: 8),
            Text(
              '${(_uploadProgress * 100).toInt()}% complete',
              style: const TextStyle(fontSize: 14, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUploadResults() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Upload Results',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ...(_uploadResults.map((result) => _buildResultItem(result))),
          ],
        ),
      ),
    );
  }

  Widget _buildResultItem(Map<String, dynamic> result) {
    final success = result['success'] as bool;
    final fileName = result['fileName'] as String;
    final error = result['error'] as String?;
    final url = result['url'] as String?;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(
          success ? Icons.check_circle : Icons.error,
          color: success ? Colors.green : Colors.red,
        ),
        title: Text(fileName, style: const TextStyle(fontSize: 14)),
        subtitle: Text(
          success ? 'Uploaded successfully' : 'Error: $error',
          style: TextStyle(
            fontSize: 12,
            color: success ? Colors.green : Colors.red,
          ),
        ),
        trailing: success && url != null
            ? IconButton(
                icon: const Icon(Icons.copy),
                onPressed: () => _showUrlDialog(url),
                tooltip: 'Show URL',
              )
            : null,
      ),
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        if (_selectedFiles.isNotEmpty && !_isUploading)
          ElevatedButton.icon(
            onPressed: _uploadFiles,
            icon: const Icon(Icons.cloud_upload, size: 20),
            label: const Text('Upload Files'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
          ),
        const SizedBox(width: 12),
        if (_selectedFiles.isNotEmpty || _uploadResults.isNotEmpty)
          TextButton.icon(
            onPressed: _isUploading ? null : _clearAll,
            icon: const Icon(Icons.clear, size: 20),
            label: const Text('Clear All'),
          ),
      ],
    );
  }

  // File selection methods
  Future<void> _pickFiles() async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        allowMultiple: true,
        type: FileType.any,
      );

      if (result != null) {
        final files = result.files
            .where((file) => file.path != null)
            .map((file) => File(file.path!))
            .toList();

        setState(() {
          _selectedFiles.addAll(files);
        });

        _showSnackBar('${files.length} files selected', Colors.green);
      }
    } catch (error) {
      _showSnackBar('Error selecting files: $error', Colors.red);
    }
  }

  Future<void> _pickImageFromGallery() async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 80,
      );

      if (image != null) {
        setState(() {
          _selectedFiles.add(File(image.path));
        });
        _showSnackBar('Image selected from gallery', Colors.green);
      }
    } catch (error) {
      _showSnackBar('Error selecting image: $error', Colors.red);
    }
  }

  Future<void> _pickImageFromCamera() async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: 80,
      );

      if (image != null) {
        setState(() {
          _selectedFiles.add(File(image.path));
        });
        _showSnackBar('Image captured from camera', Colors.green);
      }
    } catch (error) {
      _showSnackBar('Error capturing image: $error', Colors.red);
    }
  }

  void _removeFile(int index) {
    setState(() {
      _selectedFiles.removeAt(index);
    });
  }

  Future<void> _uploadFiles() async {
    if (_selectedFiles.isEmpty) return;

    setState(() {
      _isUploading = true;
      _uploadProgress = 0.0;
      _uploadResults.clear();
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

      for (int i = 0; i < _selectedFiles.length; i++) {
        final file = _selectedFiles[i];
        final fileName =
            '${DateTime.now().millisecondsSinceEpoch}_${file.path.split('/').last}';

        try {
          // Read file bytes
          final bytes = await file.readAsBytes();

          // Upload to Supabase Storage
          await supabase.storage
              .from(
                  'uploads') // Make sure this bucket exists in your Supabase project
              .uploadBinary(
                'files/$fileName',
                bytes,
                fileOptions: const FileOptions(
                  upsert: false,
                ),
              );

          // Get public URL
          final publicUrl =
              supabase.storage.from('uploads').getPublicUrl('files/$fileName');

          _uploadResults.add({
            'success': true,
            'fileName': file.path.split('/').last,
            'url': publicUrl,
          });
        } catch (error) {
          _uploadResults.add({
            'success': false,
            'fileName': file.path.split('/').last,
            'error': error.toString(),
          });
        }

        // Update progress
        setState(() {
          _uploadProgress = (i + 1) / _selectedFiles.length;
        });
      }

      final successCount =
          _uploadResults.where((r) => r['success'] == true).length;
      _showSnackBar(
        '$successCount/${_selectedFiles.length} files uploaded successfully',
        successCount == _selectedFiles.length ? Colors.green : Colors.orange,
      );
    } catch (error) {
      _showSnackBar('Upload failed: $error', Colors.red);
    } finally {
      setState(() {
        _isUploading = false;
      });
    }
  }

  void _clearAll() {
    setState(() {
      _selectedFiles.clear();
      _uploadResults.clear();
      _uploadProgress = 0.0;
    });
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

  void _showSnackBar(String message, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: color,
        duration: const Duration(seconds: 3),
      ),
    );
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
}
