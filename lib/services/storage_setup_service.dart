import 'dart:typed_data';
import 'package:supabase_flutter/supabase_flutter.dart';

class StorageSetupService {
  static final SupabaseClient _supabase = Supabase.instance.client;

  /// Check if required storage buckets exist and create them if needed
  static Future<bool> ensureStorageBucketsExist() async {
    try {
      print('🔍 Checking storage buckets...');

      // List of required buckets
      const requiredBuckets = ['uploads'];

      // Get existing buckets
      final existingBuckets = await _supabase.storage.listBuckets();
      final existingBucketNames = existingBuckets.map((b) => b.name).toSet();

      print('📦 Existing buckets: $existingBucketNames');

      // Create missing buckets
      for (final bucketName in requiredBuckets) {
        if (!existingBucketNames.contains(bucketName)) {
          print('🔨 Creating bucket: $bucketName');
          await _createBucket(bucketName);
        } else {
          print('✅ Bucket exists: $bucketName');
        }
      }

      print('✅ All required buckets are available');
      return true;
    } catch (error) {
      print('❌ Error setting up storage buckets: $error');
      return false;
    }
  }

  /// Create a storage bucket with public access
  static Future<void> _createBucket(String bucketName) async {
    try {
      await _supabase.storage.createBucket(
        bucketName,
        const BucketOptions(
          public: true, // Allow public access to files
          allowedMimeTypes: [
            // Images
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/bmp',

            // Documents
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'application/rtf',

            // Spreadsheets
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

            // Videos
            'video/mp4',
            'video/avi',
            'video/quicktime',
            'video/x-msvideo',

            // Audio
            'audio/mpeg',
            'audio/wav',
            'audio/aac',
            'audio/ogg',
          ],
          fileSizeLimit: '50MB', // 50MB limit
        ),
      );

      print('✅ Created bucket: $bucketName');

      // Set up RLS policies for the bucket
      await _setupBucketPolicies(bucketName);
    } catch (error) {
      print('❌ Error creating bucket $bucketName: $error');
      rethrow;
    }
  }

  /// Set up Row Level Security policies for the bucket
  static Future<void> _setupBucketPolicies(String bucketName) async {
    try {
      print('🔐 Setting up RLS policies for bucket: $bucketName');

      // Note: RLS policies are typically set up via SQL in the Supabase dashboard
      // or through the Supabase CLI. The policies below are examples of what
      // should be created in the Supabase SQL editor:

      /*
      -- Allow authenticated users to upload files
      CREATE POLICY "Allow authenticated uploads" ON storage.objects
      FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        bucket_id = 'uploads'
      );

      -- Allow public read access
      CREATE POLICY "Allow public downloads" ON storage.objects
      FOR SELECT USING (bucket_id = 'uploads');

      -- Allow users to delete their own files (optional)
      CREATE POLICY "Allow users to delete own files" ON storage.objects
      FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        bucket_id = 'uploads'
      );
      */

      print('ℹ️ RLS policies should be set up manually in Supabase dashboard');
    } catch (error) {
      print('⚠️ Note: RLS policies should be set up manually: $error');
    }
  }

  /// Test bucket access by uploading a small test file
  static Future<bool> testBucketAccess(String bucketName) async {
    try {
      print('🧪 Testing bucket access: $bucketName');

      // Create a small test file
      final testData = 'Test file for bucket access verification';
      final testFileName = 'test_${DateTime.now().millisecondsSinceEpoch}.txt';

      // Upload test file
      await _supabase.storage.from(bucketName).uploadBinary(
            'test/$testFileName',
            Uint8List.fromList(testData.codeUnits),
            fileOptions: const FileOptions(
              contentType: 'text/plain',
              upsert: true,
            ),
          );

      // Get public URL
      final publicUrl =
          _supabase.storage.from(bucketName).getPublicUrl('test/$testFileName');

      print('✅ Bucket access test successful');
      print('📄 Test file URL: $publicUrl');

      // Clean up test file
      try {
        await _supabase.storage.from(bucketName).remove(['test/$testFileName']);
        print('🧹 Test file cleaned up');
      } catch (cleanupError) {
        print('⚠️ Could not clean up test file: $cleanupError');
      }

      return true;
    } catch (error) {
      print('❌ Bucket access test failed: $error');
      return false;
    }
  }

  /// Get storage usage information
  static Future<Map<String, dynamic>> getStorageInfo() async {
    try {
      final buckets = await _supabase.storage.listBuckets();

      final info = <String, dynamic>{
        'totalBuckets': buckets.length,
        'buckets': [],
      };

      for (final bucket in buckets) {
        try {
          final files = await _supabase.storage.from(bucket.name).list();

          info['buckets'].add({
            'name': bucket.name,
            'id': bucket.id,
            'public': bucket.public,
            'fileCount': files.length,
            'createdAt': bucket.createdAt,
            'updatedAt': bucket.updatedAt,
          });
        } catch (listError) {
          print('⚠️ Could not list files in bucket ${bucket.name}: $listError');
          info['buckets'].add({
            'name': bucket.name,
            'id': bucket.id,
            'public': bucket.public,
            'fileCount': 'Unknown',
            'error': listError.toString(),
          });
        }
      }

      return info;
    } catch (error) {
      print('❌ Error getting storage info: $error');
      return {'error': error.toString()};
    }
  }

  /// Initialize storage setup (call this when app starts)
  static Future<bool> initializeStorage() async {
    try {
      print('🚀 Initializing storage setup...');

      // Ensure buckets exist
      final bucketsReady = await ensureStorageBucketsExist();
      if (!bucketsReady) {
        print('❌ Failed to set up storage buckets');
        return false;
      }

      // Test bucket access
      final accessTest = await testBucketAccess('uploads');
      if (!accessTest) {
        print('⚠️ Bucket access test failed, but bucket exists');
        // Don't fail initialization if test fails - bucket might still work
      }

      // Get storage info
      final storageInfo = await getStorageInfo();
      print('📊 Storage info: $storageInfo');

      print('✅ Storage initialization complete');
      return true;
    } catch (error) {
      print('❌ Storage initialization failed: $error');
      return false;
    }
  }

  /// Manual bucket creation helper (for debugging)
  static Future<void> createUploadsManually() async {
    try {
      print('🔨 Manually creating uploads bucket...');
      await _createBucket('uploads');
      print('✅ Uploads bucket created successfully');
    } catch (error) {
      print('❌ Manual bucket creation failed: $error');
      rethrow;
    }
  }
}
