import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';

class FilePickerService {
  static final ImagePicker _imagePicker = ImagePicker();

  /// Pick single file using file picker
  static Future<File?> pickSingleFile({
    List<String>? allowedExtensions,
    FileType type = FileType.any,
  }) async {
    try {
      print('📁 Opening file picker...');
      
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: type,
        allowedExtensions: allowedExtensions,
        allowMultiple: false,
      );

      if (result != null && result.files.isNotEmpty) {
        final file = File(result.files.single.path!);
        print('✅ File selected: ${file.path}');
        return file;
      } else {
        print('❌ No file selected');
        return null;
      }
    } catch (error) {
      print('❌ File picker error: $error');
      return null;
    }
  }

  /// Pick multiple files
  static Future<List<File>> pickMultipleFiles({
    List<String>? allowedExtensions,
    FileType type = FileType.any,
  }) async {
    try {
      print('📁 Opening multiple file picker...');
      
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: type,
        allowedExtensions: allowedExtensions,
        allowMultiple: true,
      );

      if (result != null && result.files.isNotEmpty) {
        final files = result.files
            .where((file) => file.path != null)
            .map((file) => File(file.path!))
            .toList();
        
        print('✅ ${files.length} files selected');
        return files;
      } else {
        print('❌ No files selected');
        return [];
      }
    } catch (error) {
      print('❌ Multiple file picker error: $error');
      return [];
    }
  }

  /// Pick image from gallery
  static Future<File?> pickImageFromGallery() async {
    try {
      print('🖼️ Opening image gallery...');
      
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 80, // Compress image to 80% quality
      );

      if (image != null) {
        final file = File(image.path);
        print('✅ Image selected from gallery: ${file.path}');
        return file;
      } else {
        print('❌ No image selected from gallery');
        return null;
      }
    } catch (error) {
      print('❌ Gallery picker error: $error');
      return null;
    }
  }

  /// Pick image from camera
  static Future<File?> pickImageFromCamera() async {
    try {
      print('📷 Opening camera...');
      
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: 80, // Compress image to 80% quality
      );

      if (image != null) {
        final file = File(image.path);
        print('✅ Image captured from camera: ${file.path}');
        return file;
      } else {
        print('❌ No image captured from camera');
        return null;
      }
    } catch (error) {
      print('❌ Camera picker error: $error');
      return null;
    }
  }

  /// Show image source selection dialog
  static Future<File?> pickImageWithSourceSelection(BuildContext context) async {
    return await showDialog<File?>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Select Image Source'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.photo_library),
                title: const Text('Gallery'),
                onTap: () async {
                  Navigator.of(context).pop();
                  final file = await pickImageFromGallery();
                  Navigator.of(context).pop(file);
                },
              ),
              ListTile(
                leading: const Icon(Icons.camera_alt),
                title: const Text('Camera'),
                onTap: () async {
                  Navigator.of(context).pop();
                  final file = await pickImageFromCamera();
                  Navigator.of(context).pop(file);
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
          ],
        );
      },
    );
  }

  /// Pick documents (PDF, DOC, etc.)
  static Future<File?> pickDocument() async {
    return await pickSingleFile(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
    );
  }

  /// Pick images only
  static Future<File?> pickImage() async {
    return await pickSingleFile(
      type: FileType.image,
    );
  }

  /// Pick videos only
  static Future<File?> pickVideo() async {
    return await pickSingleFile(
      type: FileType.video,
    );
  }

  /// Pick audio files only
  static Future<File?> pickAudio() async {
    return await pickSingleFile(
      type: FileType.audio,
    );
  }

  /// Get file size in human readable format
  static String getFileSizeString(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }

  /// Get file extension
  static String getFileExtension(String filePath) {
    return filePath.split('.').last.toLowerCase();
  }

  /// Check if file is image
  static bool isImageFile(String filePath) {
    final extension = getFileExtension(filePath);
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].contains(extension);
  }

  /// Check if file is document
  static bool isDocumentFile(String filePath) {
    final extension = getFileExtension(filePath);
    return ['pdf', 'doc', 'docx', 'txt', 'rtf', 'xls', 'xlsx', 'ppt', 'pptx'].contains(extension);
  }

  /// Check if file is video
  static bool isVideoFile(String filePath) {
    final extension = getFileExtension(filePath);
    return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].contains(extension);
  }

  /// Check if file is audio
  static bool isAudioFile(String filePath) {
    final extension = getFileExtension(filePath);
    return ['mp3', 'wav', 'aac', 'ogg', 'wma', 'm4a'].contains(extension);
  }

  /// Get appropriate icon for file type
  static IconData getFileIcon(String filePath) {
    if (isImageFile(filePath)) return Icons.image;
    if (isDocumentFile(filePath)) return Icons.description;
    if (isVideoFile(filePath)) return Icons.video_file;
    if (isAudioFile(filePath)) return Icons.audio_file;
    return Icons.insert_drive_file;
  }

  /// Get file type display name
  static String getFileTypeDisplayName(String filePath) {
    if (isImageFile(filePath)) return 'Image';
    if (isDocumentFile(filePath)) return 'Document';
    if (isVideoFile(filePath)) return 'Video';
    if (isAudioFile(filePath)) return 'Audio';
    return 'File';
  }
}
