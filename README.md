# India Post Reports Management System

<div align="center">
  <img src="assets/images/Indiapost_Logo.png" alt="India Post Logo" width="200"/>

  <h3>Western Region Reports Management System</h3>
  <p>A comprehensive mobile application for India Post Western Region to streamline report management, data collection, and administrative processes.</p>

  [![Flutter](https://img.shields.io/badge/Flutter-3.3.0+-blue.svg)](https://flutter.dev/)
  [![Firebase](https://img.shields.io/badge/Firebase-Latest-orange.svg)](https://firebase.google.com/)
  [![Supabase](https://img.shields.io/badge/Supabase-Latest-green.svg)](https://supabase.com/)
  [![License](https://img.shields.io/badge/License-Proprietary-red.svg)](#)
</div>

## 📱 Overview

The India Post Reports Management System is a Flutter-based mobile application designed to digitize and streamline reporting processes across India Post Western Region offices. The app provides a comprehensive solution for data collection, report generation, and administrative management with role-based access control.

## ✨ Key Features

### 🔐 Authentication & User Management
- Secure Firebase Authentication
- Role-based access (Division/Office users)
- User profile management
- Multi-device login support

### 📊 Dynamic Form System
- Admin-configurable forms
- Office-based form assignment
- Multiple field types (text, dropdown, file upload, date)
- Real-time validation and duplicate prevention

### 📈 Reports & Analytics
- Dynamic report generation
- Office hierarchy filtering
- Date range filtering
- Excel export functionality
- Real-time data updates

### 🏢 Office Hierarchy Management
- Multi-level office structure (Region → Division → Office)
- Recursive office filtering
- Hierarchical data access control

### 🔔 Notification System
- Push notifications via Firebase Cloud Messaging
- Division-level broadcast capabilities
- Targeted office-specific messaging
- Notification history tracking

### 📁 File Management
- Multiple file type support (images, documents, PDFs)
- Cloud storage integration (Firebase + Supabase)
- Progress tracking for uploads
- File size and type validation

### 📋 Status Tracking
- Real-time submission status
- Pending forms counter
- Progress monitoring
- Office performance metrics

## 🛠 Technology Stack

### Frontend
- **Flutter 3.3.0+** - Cross-platform mobile framework
- **Dart** - Programming language
- **Material Design** - UI/UX framework

### Backend Services
- **Firebase**
  - Authentication
  - Firestore Database
  - Cloud Storage
  - Cloud Messaging
- **Supabase**
  - PostgreSQL Database
  - Real-time subscriptions
  - Storage buckets

### Key Dependencies
```yaml
dependencies:
  flutter: sdk: flutter
  firebase_auth: ^4.19.6
  firebase_core: ^2.31.1
  cloud_firestore: ^4.17.4
  firebase_messaging: ^14.9.4
  supabase_flutter: ^2.5.6
  dropdown_search: ^5.0.6
  url_launcher: ^6.2.5
  excel: ^4.0.6
  file_picker: ^8.0.0+1
  image_picker: ^1.0.7
  table_calendar: ^3.0.9
  intl: ^0.19.0
```

## 🚀 Quick Start

### Prerequisites
- Flutter SDK 3.3.0 or higher
- Dart SDK 3.0.0 or higher
- Android Studio / VS Code
- Firebase project
- Supabase project

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd mobile_app_flutter
```

2. **Install dependencies**
```bash
flutter pub get
```

3. **Configure Firebase**
   - Add `google-services.json` to `android/app/`
   - Add `GoogleService-Info.plist` to `ios/Runner/`

4. **Configure Supabase**
   - Update Supabase URL and anon key in `main.dart`

5. **Run the application**
```bash
flutter run
```

### Build for Production

#### Android
```bash
flutter build apk --release
```

#### iOS
```bash
flutter build ios --release
```

## 📖 Documentation

### Complete Documentation Suite
- **[📚 Comprehensive Documentation](COMPREHENSIVE_DOCUMENTATION.md)** - Complete system overview
- **[🔧 API Reference](API_REFERENCE.md)** - Detailed API documentation
- **[👤 User Manual](USER_MANUAL.md)** - End-user guide
- **[🚀 Deployment Guide](DEPLOYMENT_GUIDE.md)** - Production deployment instructions

### Quick Links
- [Installation & Setup](COMPREHENSIVE_DOCUMENTATION.md#installation--setup)
- [User Guide](USER_MANUAL.md#getting-started)
- [Developer Guide](COMPREHENSIVE_DOCUMENTATION.md#developer-guide)
- [Database Schema](COMPREHENSIVE_DOCUMENTATION.md#database-schema)
- [Troubleshooting](USER_MANUAL.md#troubleshooting)

## 🏗 Project Structure

```
lib/
├── main.dart                 # Application entry point
├── firebase_options.dart     # Firebase configuration
├── screens/                  # UI screens
│   ├── dashboard_screen.dart
│   ├── login_screen.dart
│   ├── data_entry_screen.dart
│   ├── reports_screen.dart
│   ├── notifications_screen.dart
│   └── ...
├── services/                 # Business logic services
│   ├── form_config_service.dart
│   ├── reports_service.dart
│   ├── notification_service.dart
│   └── ...
├── widgets/                  # Reusable UI components
│   ├── dynamic_reports_table.dart
│   ├── file_upload_widget.dart
│   └── ...
└── themes/                   # App theming
    └── app_theme.dart
```

## 👥 User Roles

### Division Users
- Access to comprehensive reports across all offices
- Notification sending capabilities
- Administrative functions
- Cross-office data visibility

### Office Users
- Office-specific data entry and reporting
- Limited to assigned office data
- Form submission and status tracking
- Basic notification receiving

## 🔒 Security Features

- **Authentication**: Firebase Authentication with email/password
- **Authorization**: Role-based access control
- **Data Encryption**: All data encrypted in transit and at rest
- **Input Validation**: Comprehensive client and server-side validation
- **Audit Trail**: All user actions logged
- **File Security**: File type and size validation

## 📊 Database Schema

### Firebase Firestore Collections
- `employees` - User profile data
- `pages` - Form configurations
- `notifications` - Notification data

### Supabase Tables
- `user_profiles` - Extended user information
- `page_configurations` - Form configurations
- `dynamic_form_submissions` - Form submission data
- `offices` - Office hierarchy data

## 🔧 Configuration

### Environment Variables
```dart
// Firebase Configuration
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  // ...
};

// Supabase Configuration
const supabaseUrl = 'your-supabase-url';
const supabaseAnonKey = 'your-supabase-anon-key';
```

### App Configuration
```yaml
# pubspec.yaml
name: mobile_app_flutter
description: India Post Western Region Reports Management System
version: 1.0.0+1

environment:
  sdk: '^3.3.0'
```

## 🧪 Testing

### Run Tests
```bash
# Unit tests
flutter test

# Integration tests
flutter test integration_test/

# Widget tests
flutter test test/widget_test.dart
```

### Test Coverage
```bash
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html
```

## 📱 Supported Platforms

- **Android**: API level 23+ (Android 6.0+)
- **iOS**: iOS 12.0+
- **Web**: Modern browsers (Chrome, Firefox, Safari, Edge)

## 🔄 Version History

### Version 1.0.0 (Current)
- Initial release
- Complete form management system
- Reports and analytics
- Notification system
- File upload functionality
- Office hierarchy management

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- Follow [Dart Style Guide](https://dart.dev/guides/language/effective-dart/style)
- Use meaningful variable and function names
- Add comprehensive documentation
- Write unit tests for new features

## 📞 Support

### Technical Support
- **Email**: sathishsat04@gmail.com
- **Issues**: [GitHub Issues](link-to-issues)
- **Documentation**: [Complete Documentation](COMPREHENSIVE_DOCUMENTATION.md)

### Contact Information
- **Developer**: Sathish Nagarathinam
- **Email**: sathishsat04@gmail.com
- **Organization**: India Post Western Region

## 📄 License

This project is proprietary software developed for India Post Western Region. All rights reserved.

## 🙏 Acknowledgments

- India Post Western Region for project requirements and support
- Flutter team for the excellent framework
- Firebase and Supabase teams for backend services
- Open source community for various packages and tools

---

<div align="center">
  <p><strong>India Post Western Region Reports Management System</strong></p>
  <p>© 2025 All rights reserved</p>
  <p>Developed with ❤️ for India Post</p>
</div>
# reportsmanagement
