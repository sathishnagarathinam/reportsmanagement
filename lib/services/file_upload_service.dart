import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:mime/mime.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class FileUploadResult {
  final bool success;
  final String? url;
  final String? fileName;
  final String? error;
  final int? fileSize;

  FileUploadResult({
    required this.success,
    this.url,
    this.fileName,
    this.error,
    this.fileSize,
  });
}

class FileUploadService {
  static final SupabaseClient _supabase = Supabase.instance.client;

  /// Upload file to Supabase Storage
  static Future<FileUploadResult> uploadToSupabase({
    required File file,
    required String bucket,
    String? folder,
    String? customFileName,
    Function(double)? onProgress,
  }) async {
    try {
      print('📤 Starting Supabase upload...');

      // Generate unique filename if not provided
      final fileName = customFileName ?? _generateFileName(file.path);
      final filePath = folder != null ? '$folder/$fileName' : fileName;

      print('📤 Upload path: $filePath');
      print('📤 File size: ${await file.length()} bytes');

      // Read file bytes
      final bytes = await file.readAsBytes();

      // Get MIME type
      final mimeType = lookupMimeType(file.path) ?? 'application/octet-stream';

      // Upload to Supabase Storage
      final response = await _supabase.storage.from(bucket).uploadBinary(
            filePath,
            bytes,
            fileOptions: FileOptions(
              contentType: mimeType,
              upsert: false, // Don't overwrite existing files
            ),
          );

      print('✅ Supabase upload successful: $response');

      // Get public URL
      final publicUrl = _supabase.storage.from(bucket).getPublicUrl(filePath);

      return FileUploadResult(
        success: true,
        url: publicUrl,
        fileName: fileName,
        fileSize: bytes.length,
      );
    } catch (error) {
      print('❌ Supabase upload error: $error');
      return FileUploadResult(
        success: false,
        error: error.toString(),
      );
    }
  }

  /// Upload file to custom server endpoint
  static Future<FileUploadResult> uploadToServer({
    required File file,
    required String uploadUrl,
    Map<String, String>? headers,
    Map<String, String>? additionalFields,
    Function(double)? onProgress,
  }) async {
    try {
      print('📤 Starting server upload to: $uploadUrl');

      final fileName = file.path.split('/').last;
      final mimeType = lookupMimeType(file.path) ?? 'application/octet-stream';

      // Create multipart request
      final request = http.MultipartRequest('POST', Uri.parse(uploadUrl));

      // Add headers
      if (headers != null) {
        request.headers.addAll(headers);
      }

      // Add additional fields
      if (additionalFields != null) {
        request.fields.addAll(additionalFields);
      }

      // Add file
      final multipartFile = await http.MultipartFile.fromPath(
        'file', // Field name - adjust based on your server API
        file.path,
        // contentType will be automatically detected
      );
      request.files.add(multipartFile);

      print(
          '📤 File: $fileName, Type: $mimeType, Size: ${multipartFile.length} bytes');

      // Send request
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200 || response.statusCode == 201) {
        print('✅ Server upload successful: ${response.body}');

        // Parse response to get file URL (adjust based on your server response)
        // This is a generic example - modify based on your server's response format
        return FileUploadResult(
          success: true,
          url: response.body, // Assuming server returns the file URL
          fileName: fileName,
          fileSize: multipartFile.length,
        );
      } else {
        throw Exception('Upload failed with status: ${response.statusCode}');
      }
    } catch (error) {
      print('❌ Server upload error: $error');
      return FileUploadResult(
        success: false,
        error: error.toString(),
      );
    }
  }

  /// Upload multiple files
  static Future<List<FileUploadResult>> uploadMultipleFiles({
    required List<File> files,
    required String bucket,
    String? folder,
    Function(int, int)? onProgress, // (completed, total)
  }) async {
    final results = <FileUploadResult>[];

    for (int i = 0; i < files.length; i++) {
      final result = await uploadToSupabase(
        file: files[i],
        bucket: bucket,
        folder: folder,
      );

      results.add(result);
      onProgress?.call(i + 1, files.length);
    }

    return results;
  }

  /// Generate unique filename with timestamp
  static String _generateFileName(String originalPath) {
    final extension = originalPath.split('.').last;
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    return 'file_$timestamp.$extension';
  }

  /// Validate file before upload
  static bool validateFile({
    required File file,
    List<String>? allowedExtensions,
    int? maxSizeInBytes,
  }) {
    // Check file exists
    if (!file.existsSync()) {
      print('❌ File does not exist');
      return false;
    }

    // Check file extension
    if (allowedExtensions != null) {
      final extension = file.path.split('.').last.toLowerCase();
      if (!allowedExtensions.contains(extension)) {
        print('❌ File extension not allowed: $extension');
        return false;
      }
    }

    // Check file size
    if (maxSizeInBytes != null) {
      final fileSize = file.lengthSync();
      if (fileSize > maxSizeInBytes) {
        print('❌ File too large: $fileSize bytes (max: $maxSizeInBytes)');
        return false;
      }
    }

    return true;
  }

  /// Get file info
  static Future<Map<String, dynamic>> getFileInfo(File file) async {
    final stat = await file.stat();
    final mimeType = lookupMimeType(file.path);

    return {
      'name': file.path.split('/').last,
      'path': file.path,
      'size': stat.size,
      'mimeType': mimeType,
      'modified': stat.modified,
      'extension': file.path.split('.').last.toLowerCase(),
    };
  }
}
