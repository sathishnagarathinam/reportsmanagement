# Supabase Storage Bucket Setup Guide

## 🎯 Quick Fix for "Bucket not found" Error

The error you're seeing indicates that the "uploads" bucket doesn't exist in your Supabase project. Here's how to fix it:

## 🔧 Method 1: Create Bucket via Supabase Dashboard (Recommended)

### Step 1: Access Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your project

### Step 2: Create Storage Bucket
1. Click on **"Storage"** in the left sidebar
2. Click **"New Bucket"** button
3. Enter bucket details:
   - **Name**: `uploads`
   - **Public bucket**: ✅ **Enable** (for public file access)
   - **File size limit**: `50 MB` (optional)
   - **Allowed MIME types**: Leave empty for all types
4. Click **"Create bucket"**

### Step 3: Set Bucket Policies (Optional but Recommended)
1. Go to **"Storage"** → **"Policies"**
2. Click **"New Policy"** for `storage.objects`
3. Add these policies:

#### Allow Authenticated Uploads:
```sql
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND 
  bucket_id = 'uploads'
);
```

#### Allow Public Downloads:
```sql
CREATE POLICY "Allow public downloads" ON storage.objects
FOR SELECT USING (bucket_id = 'uploads');
```

#### Allow Users to Delete Own Files:
```sql
CREATE POLICY "Allow users to delete own files" ON storage.objects
FOR DELETE USING (
  auth.role() = 'authenticated' AND 
  bucket_id = 'uploads'
);
```

## 🔧 Method 2: Create Bucket via SQL (Alternative)

If you prefer using SQL, go to **"SQL Editor"** in Supabase Dashboard and run:

```sql
-- Create the uploads bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true);

-- Set up policies
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND 
  bucket_id = 'uploads'
);

CREATE POLICY "Allow public downloads" ON storage.objects
FOR SELECT USING (bucket_id = 'uploads');

CREATE POLICY "Allow users to delete own files" ON storage.objects
FOR DELETE USING (
  auth.role() = 'authenticated' AND 
  bucket_id = 'uploads'
);
```

## ✅ Verify Setup

After creating the bucket:

1. Go to **"Storage"** in Supabase Dashboard
2. You should see the "uploads" bucket listed
3. Click on it to verify it's accessible
4. Try uploading a test file through the dashboard

## 🧪 Test File Upload

Once the bucket is created:

1. **Open your Flutter app**
2. **Navigate to a form with file upload field**
3. **Select and upload a file**
4. **Check Supabase Storage** to see if the file appears in `uploads/form-files/`

## 📁 Expected File Structure

After successful uploads, your Supabase Storage should look like:

```
uploads/
├── form-files/
│   ├── 1734567890123_document.pdf
│   ├── 1734567890124_image.jpg
│   └── 1734567890125_report.docx
└── files/
    ├── 1734567890126_photo.png
    └── 1734567890127_spreadsheet.xlsx
```

## 🔍 Troubleshooting

### If you still get "Bucket not found":
1. **Double-check bucket name**: Ensure it's exactly `uploads` (lowercase)
2. **Verify project**: Make sure you're in the correct Supabase project
3. **Check permissions**: Ensure your user has storage access
4. **Refresh app**: Restart your Flutter app after creating the bucket

### If uploads fail after bucket creation:
1. **Check file size**: Ensure files are under the size limit
2. **Verify file types**: Check if MIME types are allowed
3. **Check policies**: Ensure RLS policies allow your operations
4. **Test authentication**: Verify user is properly authenticated

## 🚀 Production Considerations

### Security:
- Set appropriate file size limits
- Restrict allowed MIME types if needed
- Implement proper RLS policies
- Consider virus scanning for uploaded files

### Performance:
- Use CDN for file delivery
- Implement file compression
- Set up automatic cleanup for old files
- Monitor storage usage

### Backup:
- Set up automated backups
- Consider cross-region replication
- Implement file versioning if needed

## 📞 Support

If you continue to have issues:
1. Check Supabase documentation: [https://supabase.com/docs/guides/storage](https://supabase.com/docs/guides/storage)
2. Visit Supabase community: [https://github.com/supabase/supabase/discussions](https://github.com/supabase/supabase/discussions)
3. Check your project's API logs in Supabase Dashboard

## ✨ Success Indicators

You'll know everything is working when:
- ✅ No "Bucket not found" errors
- ✅ Files upload successfully
- ✅ File URLs are generated and accessible
- ✅ Files appear in Supabase Storage dashboard
- ✅ Form submissions include file URLs in the data
