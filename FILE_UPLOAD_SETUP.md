# File Upload Setup Guide

## 🎯 Overview
This guide will help you set up the file upload functionality in your Flutter app. The implementation includes:
- File selection from device storage
- Camera and gallery access for images
- Upload to Supabase Storage
- Progress tracking and error handling
- Dashboard integration

## 📋 Prerequisites
- Flutter project with Supabase integration
- Supabase project with authentication set up
- Android/iOS permissions configured

## 🔧 Setup Steps

### 1. Supabase Storage Configuration

#### Create Storage Bucket:
1. Go to your Supabase Dashboard
2. Navigate to **Storage** section
3. Click **"New Bucket"**
4. Create a bucket named `uploads`
5. Set bucket to **Public** if you want public file access

#### Set Storage Policies (Optional):
```sql
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow public read access
CREATE POLICY "Allow public downloads" ON storage.objects
FOR SELECT USING (bucket_id = 'uploads');

-- Allow users to delete their own files
CREATE POLICY "Allow users to delete own files" ON storage.objects
FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);
```

### 2. Dependencies Verification
Ensure these packages are in your `pubspec.yaml`:
```yaml
dependencies:
  file_picker: ^8.0.0+1
  image_picker: ^1.0.7
  supabase_flutter: ^2.5.0
  http: ^1.2.0
  mime: ^1.0.4
```

### 3. Platform Permissions

#### Android Permissions (Already Added):
File: `android/app/src/main/AndroidManifest.xml`
```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
```

#### iOS Permissions (Already Added):
File: `ios/Runner/Info.plist`
```xml
<key>NSCameraUsageDescription</key>
<string>This app needs camera access to take photos for uploads</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>This app needs photo library access to select images for uploads</string>
<key>NSMicrophoneUsageDescription</key>
<string>This app needs microphone access to record audio files</string>
```

## 🚀 Usage

### Access File Upload Screen:
1. Open the app
2. Go to Dashboard
3. Tap the **"Upload"** card in the grid
4. The File Upload screen will open

### Upload Process:
1. **Select Files**: Choose from:
   - **Pick Files**: Any file type from device storage
   - **Gallery**: Images from photo library
   - **Camera**: Take new photos
2. **Review Selection**: See selected files with size info
3. **Upload**: Tap "Upload Files" button
4. **Monitor Progress**: Watch upload progress bar
5. **View Results**: See success/failure status for each file

## 📁 File Structure
```
lib/
├── screens/
│   └── file_upload_screen.dart          # Main upload screen
├── services/
│   ├── file_upload_service.dart         # Upload logic (advanced)
│   └── file_picker_service.dart         # File selection (advanced)
└── widgets/
    └── file_upload_widget.dart          # Reusable widget (advanced)
```

## 🔧 Configuration Options

### Change Upload Bucket:
In `file_upload_screen.dart`, line 280:
```dart
await supabase.storage
    .from('uploads') // Change bucket name here
    .uploadBinary(
```

### File Size Limits:
Add validation before upload:
```dart
if (file.lengthSync() > 10 * 1024 * 1024) { // 10MB limit
  _showSnackBar('File too large (max 10MB)', Colors.red);
  return;
}
```

### Allowed File Types:
Modify file picker to restrict types:
```dart
FilePickerResult? result = await FilePicker.platform.pickFiles(
  allowMultiple: true,
  type: FileType.custom,
  allowedExtensions: ['jpg', 'png', 'pdf', 'doc'], // Restrict types
);
```

## 🐛 Troubleshooting

### Common Issues:

#### 1. "Bucket not found" Error:
- Ensure bucket named `uploads` exists in Supabase Storage
- Check bucket name spelling in code

#### 2. Permission Denied:
- Verify storage policies allow uploads
- Check user authentication status

#### 3. File Upload Fails:
- Check internet connection
- Verify Supabase project URL and anon key
- Check file size limits

#### 4. Camera/Gallery Not Working:
- Verify platform permissions are added
- Test on physical device (not simulator)
- Check app permissions in device settings

### Debug Steps:
1. Check Flutter console for error messages
2. Verify Supabase connection in app
3. Test with small files first
4. Check Supabase Storage dashboard for uploaded files

## 📊 Features Included

### ✅ Current Implementation:
- File selection from device storage
- Camera and gallery access
- Upload to Supabase Storage
- Progress tracking
- Error handling
- Dashboard integration
- File type detection
- File size display

### 🔄 Potential Enhancements:
- File compression before upload
- Multiple bucket support
- Drag & drop interface
- File preview thumbnails
- Upload queue management
- Offline upload support

## 🔗 Related Files
- `lib/screens/dashboard_screen.dart` - Dashboard integration
- `android/app/src/main/AndroidManifest.xml` - Android permissions
- `ios/Runner/Info.plist` - iOS permissions
- `pubspec.yaml` - Dependencies

## 📞 Support
If you encounter issues:
1. Check this setup guide
2. Review Flutter console logs
3. Verify Supabase configuration
4. Test with different file types/sizes
