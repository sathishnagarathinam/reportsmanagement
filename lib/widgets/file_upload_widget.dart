import 'dart:io';
import 'package:flutter/material.dart';
import '../services/file_picker_service.dart';
import '../services/file_upload_service.dart';

class FileUploadWidget extends StatefulWidget {
  final String title;
  final String? subtitle;
  final bool allowMultiple;
  final List<String>? allowedExtensions;
  final int? maxFileSizeInMB;
  final String uploadBucket;
  final String? uploadFolder;
  final Function(List<FileUploadResult>)? onUploadComplete;
  final Function(String)? onError;

  const FileUploadWidget({
    Key? key,
    this.title = 'Upload Files',
    this.subtitle,
    this.allowMultiple = false,
    this.allowedExtensions,
    this.maxFileSizeInMB,
    required this.uploadBucket,
    this.uploadFolder,
    this.onUploadComplete,
    this.onError,
  }) : super(key: key);

  @override
  State<FileUploadWidget> createState() => _FileUploadWidgetState();
}

class _FileUploadWidgetState extends State<FileUploadWidget> {
  List<File> _selectedFiles = [];
  List<FileUploadResult> _uploadResults = [];
  bool _isUploading = false;
  double _uploadProgress = 0.0;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Icon(Icons.cloud_upload, color: Theme.of(context).primaryColor),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.title,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (widget.subtitle != null)
                        Text(
                          widget.subtitle!,
                          style: const TextStyle(
                            fontSize: 14,
                            color: Colors.grey,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // File selection buttons
            _buildFileSelectionButtons(),
            const SizedBox(height: 16),

            // Selected files list
            if (_selectedFiles.isNotEmpty) ...[
              _buildSelectedFilesList(),
              const SizedBox(height: 16),
            ],

            // Upload progress
            if (_isUploading) ...[
              _buildUploadProgress(),
              const SizedBox(height: 16),
            ],

            // Upload results
            if (_uploadResults.isNotEmpty) ...[
              _buildUploadResults(),
              const SizedBox(height: 16),
            ],

            // Action buttons
            _buildActionButtons(),
          ],
        ),
      ),
    );
  }

  Widget _buildFileSelectionButtons() {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        ElevatedButton.icon(
          onPressed: _isUploading ? null : _pickFiles,
          icon: const Icon(Icons.folder_open, size: 18),
          label: Text(widget.allowMultiple ? 'Select Files' : 'Select File'),
        ),
        ElevatedButton.icon(
          onPressed: _isUploading ? null : _pickImage,
          icon: const Icon(Icons.image, size: 18),
          label: const Text('Pick Image'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
          ),
        ),
        ElevatedButton.icon(
          onPressed: _isUploading ? null : _pickDocument,
          icon: const Icon(Icons.description, size: 18),
          label: const Text('Pick Document'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.orange,
            foregroundColor: Colors.white,
          ),
        ),
      ],
    );
  }

  Widget _buildSelectedFilesList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Selected Files (${_selectedFiles.length})',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        ...(_selectedFiles.asMap().entries.map((entry) {
          final index = entry.key;
          final file = entry.value;
          return _buildFileItem(file, index);
        })),
      ],
    );
  }

  Widget _buildFileItem(File file, int index) {
    final fileName = file.path.split('/').last;
    final fileSize = FilePickerService.getFileSizeString(file.lengthSync());
    final fileIcon = FilePickerService.getFileIcon(file.path);

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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Uploading...',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        LinearProgressIndicator(
          value: _uploadProgress,
          backgroundColor: Colors.grey[300],
          valueColor: AlwaysStoppedAnimation<Color>(Theme.of(context).primaryColor),
        ),
        const SizedBox(height: 4),
        Text(
          '${(_uploadProgress * 100).toInt()}% complete',
          style: const TextStyle(fontSize: 12, color: Colors.grey),
        ),
      ],
    );
  }

  Widget _buildUploadResults() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Upload Results',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        ...(_uploadResults.map((result) => _buildResultItem(result))),
      ],
    );
  }

  Widget _buildResultItem(FileUploadResult result) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(
          result.success ? Icons.check_circle : Icons.error,
          color: result.success ? Colors.green : Colors.red,
        ),
        title: Text(
          result.fileName ?? 'Unknown file',
          style: const TextStyle(fontSize: 14),
        ),
        subtitle: Text(
          result.success 
              ? 'Uploaded successfully'
              : 'Error: ${result.error}',
          style: TextStyle(
            fontSize: 12,
            color: result.success ? Colors.green : Colors.red,
          ),
        ),
        trailing: result.success && result.url != null
            ? IconButton(
                icon: const Icon(Icons.copy),
                onPressed: () => _copyUrlToClipboard(result.url!),
                tooltip: 'Copy URL',
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
            icon: const Icon(Icons.cloud_upload, size: 18),
            label: const Text('Upload'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
            ),
          ),
        const SizedBox(width: 8),
        if (_selectedFiles.isNotEmpty || _uploadResults.isNotEmpty)
          TextButton.icon(
            onPressed: _isUploading ? null : _clearAll,
            icon: const Icon(Icons.clear, size: 18),
            label: const Text('Clear All'),
          ),
      ],
    );
  }

  // File selection methods
  Future<void> _pickFiles() async {
    if (widget.allowMultiple) {
      final files = await FilePickerService.pickMultipleFiles(
        allowedExtensions: widget.allowedExtensions,
      );
      _addFiles(files);
    } else {
      final file = await FilePickerService.pickSingleFile(
        allowedExtensions: widget.allowedExtensions,
      );
      if (file != null) _addFiles([file]);
    }
  }

  Future<void> _pickImage() async {
    final file = await FilePickerService.pickImageWithSourceSelection(context);
    if (file != null) _addFiles([file]);
  }

  Future<void> _pickDocument() async {
    final file = await FilePickerService.pickDocument();
    if (file != null) _addFiles([file]);
  }

  void _addFiles(List<File> files) {
    setState(() {
      for (final file in files) {
        if (_validateFile(file)) {
          if (!widget.allowMultiple) {
            _selectedFiles.clear();
          }
          _selectedFiles.add(file);
        }
      }
    });
  }

  bool _validateFile(File file) {
    // Check file size
    if (widget.maxFileSizeInMB != null) {
      final maxSizeInBytes = widget.maxFileSizeInMB! * 1024 * 1024;
      if (file.lengthSync() > maxSizeInBytes) {
        _showError('File too large. Maximum size: ${widget.maxFileSizeInMB}MB');
        return false;
      }
    }

    return FileUploadService.validateFile(
      file: file,
      allowedExtensions: widget.allowedExtensions,
      maxSizeInBytes: widget.maxFileSizeInMB != null 
          ? widget.maxFileSizeInMB! * 1024 * 1024 
          : null,
    );
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
      final results = await FileUploadService.uploadMultipleFiles(
        files: _selectedFiles,
        bucket: widget.uploadBucket,
        folder: widget.uploadFolder,
        onProgress: (completed, total) {
          setState(() {
            _uploadProgress = completed / total;
          });
        },
      );

      setState(() {
        _uploadResults = results;
        _isUploading = false;
      });

      widget.onUploadComplete?.call(results);

    } catch (error) {
      setState(() {
        _isUploading = false;
      });
      _showError('Upload failed: $error');
    }
  }

  void _clearAll() {
    setState(() {
      _selectedFiles.clear();
      _uploadResults.clear();
      _uploadProgress = 0.0;
    });
  }

  void _copyUrlToClipboard(String url) {
    // Implementation depends on your clipboard package
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('URL copied: $url'),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _showError(String message) {
    widget.onError?.call(message);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }
}
