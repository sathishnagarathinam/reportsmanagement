# API Reference - India Post Reports Management System

## Overview
This document provides detailed API reference for all services and methods used in the India Post Reports Management System.

## Authentication Services

### FirebaseAuthService

#### signIn()
```dart
Future<UserCredential> signIn(String email, String password)
```
**Description**: Authenticates user with email and password  
**Parameters**:
- `email` (String): User's email address
- `password` (String): User's password

**Returns**: `UserCredential` object  
**Throws**: `FirebaseAuthException` on authentication failure

#### register()
```dart
Future<UserCredential> register(String email, String password, Map<String, dynamic> userData)
```
**Description**: Registers new user and creates profile  
**Parameters**:
- `email` (String): User's email address
- `password` (String): User's password
- `userData` (Map): Additional user profile data

**Returns**: `UserCredential` object  
**Throws**: `FirebaseAuthException` on registration failure

#### signOut()
```dart
Future<void> signOut()
```
**Description**: Signs out current user  
**Returns**: `void`  
**Throws**: `FirebaseAuthException` on sign out failure

## Form Configuration Services

### FormConfigService

#### getFormConfigurations()
```dart
Future<List<Map<String, dynamic>>> getFormConfigurations({String? officeFilter})
```
**Description**: Retrieves form configurations assigned to user's office  
**Parameters**:
- `officeFilter` (String, optional): Filter forms by specific office

**Returns**: List of form configuration objects  
**Throws**: `Exception` on database error

#### submitFormData()
```dart
Future<void> submitFormData({
  required String formIdentifier,
  required Map<String, dynamic> submissionData,
  required String userId,
})
```
**Description**: Submits form data to database  
**Parameters**:
- `formIdentifier` (String): Unique form identifier
- `submissionData` (Map): Form field data
- `userId` (String): Submitting user's ID

**Returns**: `void`  
**Throws**: `Exception` on submission failure

#### saveFormConfiguration()
```dart
Future<void> saveFormConfiguration({
  required String title,
  required List<Map<String, dynamic>> fields,
  required List<String> selectedOffices,
  required String reportFrequency,
})
```
**Description**: Saves new form configuration (Admin only)  
**Parameters**:
- `title` (String): Form title
- `fields` (List): Form field definitions
- `selectedOffices` (List): Assigned offices
- `reportFrequency` (String): Report frequency

**Returns**: `void`  
**Throws**: `Exception` on save failure

## Reports Services

### ReportsService

#### getReportsData()
```dart
Future<List<Map<String, dynamic>>> getReportsData({
  String? officeFilter,
  DateTime? startDate,
  DateTime? endDate,
  String? formType,
})
```
**Description**: Retrieves filtered reports data  
**Parameters**:
- `officeFilter` (String, optional): Filter by office
- `startDate` (DateTime, optional): Start date filter
- `endDate` (DateTime, optional): End date filter
- `formType` (String, optional): Filter by form type

**Returns**: List of report data objects  
**Throws**: `Exception` on query failure

#### exportToExcel()
```dart
Future<String> exportToExcel({
  required List<Map<String, dynamic>> data,
  required String fileName,
})
```
**Description**: Exports data to Excel file  
**Parameters**:
- `data` (List): Data to export
- `fileName` (String): Output file name

**Returns**: File path string  
**Throws**: `Exception` on export failure

#### getOfficeHierarchy()
```dart
Future<List<String>> getOfficeHierarchy(String userOffice)
```
**Description**: Gets office hierarchy for filtering  
**Parameters**:
- `userOffice` (String): User's office name

**Returns**: List of office names in hierarchy  
**Throws**: `Exception` on query failure

## Notification Services

### NotificationService

#### sendNotification()
```dart
Future<void> sendNotification({
  required String title,
  required String body,
  String? targetOffice,
  bool sendToAll = false,
})
```
**Description**: Sends push notification  
**Parameters**:
- `title` (String): Notification title
- `body` (String): Notification message
- `targetOffice` (String, optional): Target office
- `sendToAll` (bool): Send to all users

**Returns**: `void`  
**Throws**: `Exception` on send failure

#### getNotificationHistory()
```dart
Future<List<Map<String, dynamic>>> getNotificationHistory({
  String? userId,
  int limit = 50,
})
```
**Description**: Retrieves notification history  
**Parameters**:
- `userId` (String, optional): Filter by user
- `limit` (int): Maximum notifications to retrieve

**Returns**: List of notification objects  
**Throws**: `Exception` on query failure

#### markAsRead()
```dart
Future<void> markAsRead(String notificationId)
```
**Description**: Marks notification as read  
**Parameters**:
- `notificationId` (String): Notification ID

**Returns**: `void`  
**Throws**: `Exception` on update failure

## File Upload Services

### FileUploadService

#### uploadFile()
```dart
Future<String> uploadFile({
  required File file,
  required String path,
  Function(double)? onProgress,
})
```
**Description**: Uploads file to cloud storage  
**Parameters**:
- `file` (File): File to upload
- `path` (String): Storage path
- `onProgress` (Function, optional): Progress callback

**Returns**: Download URL string  
**Throws**: `Exception` on upload failure

#### deleteFile()
```dart
Future<void> deleteFile(String path)
```
**Description**: Deletes file from storage  
**Parameters**:
- `path` (String): File path to delete

**Returns**: `void`  
**Throws**: `Exception` on deletion failure

#### getFileMetadata()
```dart
Future<Map<String, dynamic>> getFileMetadata(String path)
```
**Description**: Gets file metadata  
**Parameters**:
- `path` (String): File path

**Returns**: Metadata map  
**Throws**: `Exception` on query failure

## Office Services

### OfficeService

#### getOffices()
```dart
Future<List<Map<String, dynamic>>> getOffices({
  String? region,
  String? division,
})
```
**Description**: Retrieves office list  
**Parameters**:
- `region` (String, optional): Filter by region
- `division` (String, optional): Filter by division

**Returns**: List of office objects  
**Throws**: `Exception` on query failure

#### getOfficesByHierarchy()
```dart
Future<List<String>> getOfficesByHierarchy(String userOffice)
```
**Description**: Gets offices in user's hierarchy  
**Parameters**:
- `userOffice` (String): User's office name

**Returns**: List of office names  
**Throws**: `Exception` on query failure

#### validateOfficeAccess()
```dart
Future<bool> validateOfficeAccess(String userId, String officeName)
```
**Description**: Validates user access to office  
**Parameters**:
- `userId` (String): User ID
- `officeName` (String): Office to validate

**Returns**: Boolean access result  
**Throws**: `Exception` on validation failure

## User Profile Services

### UserProfileService

#### getUserProfile()
```dart
Future<Map<String, dynamic>?> getUserProfile(String userId)
```
**Description**: Retrieves user profile data  
**Parameters**:
- `userId` (String): User ID

**Returns**: User profile map or null  
**Throws**: `Exception` on query failure

#### updateUserProfile()
```dart
Future<void> updateUserProfile({
  required String userId,
  required Map<String, dynamic> profileData,
})
```
**Description**: Updates user profile  
**Parameters**:
- `userId` (String): User ID
- `profileData` (Map): Updated profile data

**Returns**: `void`  
**Throws**: `Exception` on update failure

#### getUsersByOffice()
```dart
Future<List<Map<String, dynamic>>> getUsersByOffice(String officeName)
```
**Description**: Gets users in specific office  
**Parameters**:
- `officeName` (String): Office name

**Returns**: List of user objects  
**Throws**: `Exception` on query failure

## Status Services

### StatusService

#### getSubmissionStatus()
```dart
Future<Map<String, dynamic>> getSubmissionStatus({
  required String userId,
  String? officeFilter,
})
```
**Description**: Gets form submission status  
**Parameters**:
- `userId` (String): User ID
- `officeFilter` (String, optional): Office filter

**Returns**: Status summary map  
**Throws**: `Exception` on query failure

#### getPendingForms()
```dart
Future<List<Map<String, dynamic>>> getPendingForms({
  required String userId,
  String? officeFilter,
})
```
**Description**: Gets pending forms for user  
**Parameters**:
- `userId` (String): User ID
- `officeFilter` (String, optional): Office filter

**Returns**: List of pending form objects  
**Throws**: `Exception` on query failure

#### updateSubmissionStatus()
```dart
Future<void> updateSubmissionStatus({
  required String submissionId,
  required String status,
})
```
**Description**: Updates submission status  
**Parameters**:
- `submissionId` (String): Submission ID
- `status` (String): New status

**Returns**: `void`  
**Throws**: `Exception` on update failure

## Error Handling

### Common Exception Types

#### AuthenticationException
```dart
class AuthenticationException implements Exception {
  final String message;
  final String code;
  
  AuthenticationException(this.message, this.code);
}
```

#### DatabaseException
```dart
class DatabaseException implements Exception {
  final String message;
  final String operation;
  
  DatabaseException(this.message, this.operation);
}
```

#### ValidationException
```dart
class ValidationException implements Exception {
  final String message;
  final Map<String, String> fieldErrors;
  
  ValidationException(this.message, this.fieldErrors);
}
```

#### NetworkException
```dart
class NetworkException implements Exception {
  final String message;
  final int? statusCode;
  
  NetworkException(this.message, this.statusCode);
}
```

## Response Formats

### Standard Success Response
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully"
}
```

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {}
  }
}
```

### Pagination Response
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

## Rate Limiting

### API Limits
- **Authentication**: 10 requests per minute
- **Data Queries**: 100 requests per minute
- **File Uploads**: 20 requests per minute
- **Notifications**: 50 requests per minute

### Best Practices
- Implement exponential backoff
- Cache frequently accessed data
- Use pagination for large datasets
- Batch operations when possible

---

**Document Version**: 1.0.0  
**Last Updated**: January 2025  
**Maintained By**: Development Team
