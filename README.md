# India Post Reports Management System

<div align="center">
  <img src="public/Indiapost_Logo.png" alt="India Post Logo" width="200"/>

  <h3>Western Region Reports Management System</h3>
  <p>A comprehensive cross-platform solution for India Post Western Region to streamline report management, data collection, and administrative processes.</p>

  [![Flutter](https://img.shields.io/badge/Flutter-3.3.0+-blue.svg)](https://flutter.dev/)
  [![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
  [![Firebase](https://img.shields.io/badge/Firebase-11.7.1-orange.svg)](https://firebase.google.com/)
  [![Supabase](https://img.shields.io/badge/Supabase-Latest-green.svg)](https://supabase.com/)
  [![Material-UI](https://img.shields.io/badge/Material--UI-7.1.0-blue.svg)](https://mui.com/)
</div>

## 🌐 Live Demo

**[View Live Web Application](https://sathishnagarathinam.github.io/reportsmanagement)**

## 📱 Overview

The India Post Reports Management System is a comprehensive cross-platform solution featuring both a Flutter mobile application and a React web portal. It's designed to digitize and streamline reporting processes across India Post Western Region offices, providing tools for data collection, report generation, and administrative management with role-based access control.

### 📱 Mobile App (Flutter)
A feature-rich mobile application for field users, office staff, and administrators to manage forms, submit reports, and track progress on-the-go.

### 🌐 Web Portal (React)
A comprehensive web-based administrative portal for division users and administrators to manage forms, generate reports, and oversee operations across multiple offices.

## ✨ Key Features

### 🔐 Authentication & User Management
- Secure Firebase Authentication
- Role-based access control (Admin/Division/Office users)
- User profile management
- Multi-device login support
- Session management

### 📊 Dynamic Form System
- **Web Portal**: Create and configure dynamic forms with drag-and-drop form builder
- **Mobile App**: Admin-configurable forms with office-based assignment
- Multiple field types (text, dropdown, date, file upload)
- Real-time validation and duplicate prevention
- Form validation and preview

### 📈 Reports & Analytics
- **Web Portal**: Real-time data visualization with interactive charts and graphs
- **Mobile App**: Dynamic report generation with Excel export
- Office hierarchy filtering and date range analytics
- Export functionality (Excel, PDF)
- Real-time data updates

### 🏢 Office Hierarchy Management
- Multi-level office structure (Region → Division → Office)
- Recursive office filtering and hierarchical data access control
- Office assignment and permissions
- **Web Portal**: Advanced office structure management
- **Mobile App**: Office-based data filtering

### 🔔 Notification System
- Push notifications via Firebase Cloud Messaging
- Division-level broadcast capabilities
- Targeted messaging by office/division
- Notification history and tracking
- **Web Portal**: Advanced notification management interface

### 📁 File Management
- Multiple file type support (images, documents, PDFs)
- Cloud storage integration (Firebase + Supabase)
- Progress tracking for uploads
- File size and type validation

### 📋 Status Tracking & Dashboard
- **Web Portal**: Comprehensive admin panel with system configuration
- **Mobile App**: Real-time submission status and pending forms counter
- Progress monitoring and office performance metrics
- User management and permissions
- Analytics and insights

## 🛠 Technology Stack

### Web Portal (React)
- **React 18.2.0** - Modern React with hooks
- **TypeScript 5.8.3** - Type-safe development
- **Material-UI 7.1.0** - Professional UI components
- **React Router DOM 7.6.0** - Client-side routing
- **React DnD 16.0.1** - Drag and drop functionality

### Mobile App (Flutter)
- **Flutter 3.3.0+** - Cross-platform mobile framework
- **Dart** - Programming language
- **Material Design** - UI/UX framework

### Backend Services (Shared)
- **Firebase**
  - Authentication
  - Firestore Database
  - Cloud Storage
  - Cloud Messaging
- **Supabase**
  - PostgreSQL Database
  - Real-time subscriptions
  - Storage buckets

### Build Tools
- **React Scripts 5.0.1** - Web build and development tools
- **Flutter Build System** - Mobile build tools
- **TypeScript** - Compilation and type checking

### Key Dependencies

#### Web Portal
```json
{
  "react": "^18.2.0",
  "typescript": "^5.8.3",
  "@mui/material": "^7.1.0",
  "firebase": "^11.7.1",
  "@supabase/supabase-js": "^2.39.0"
}
```

#### Mobile App
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
- **Web Portal**: Node.js 16+ and npm
- **Mobile App**: Flutter SDK 3.3.0+, Dart SDK 3.0.0+, Android Studio/VS Code
- Firebase project setup
- Supabase project setup

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/sathishnagarathinam/reportsmanagement.git
cd reportsmanagement
```

### Web Portal Setup

2. **Navigate to web app**
```bash
cd web-app
```

3. **Install dependencies**
```bash
npm install
```

4. **Configure environment variables**
```bash
# Create .env file with your Firebase and Supabase credentials
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_key
```

5. **Start development server**
```bash
npm start
```

6. **Build for production**
```bash
npm run build
```

### Mobile App Setup

2. **Navigate to mobile app**
```bash
cd mobile_app_flutter
```

3. **Install dependencies**
```bash
flutter pub get
```

4. **Configure Firebase**
   - Add `google-services.json` to `android/app/`
   - Add `GoogleService-Info.plist` to `ios/Runner/`

5. **Configure Supabase**
   - Update Supabase URL and anon key in `main.dart`

6. **Run the application**
```bash
flutter run
```

### Build for Production

#### Web Portal
```bash
npm run build
```

#### Mobile App - Android
```bash
flutter build apk --release
```

#### Mobile App - iOS
```bash
flutter build ios --release
```

## 📁 Project Structure

### Web Portal Structure
```
web-app/
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/              # Main application pages
│   ├── services/           # API and business logic
│   ├── contexts/           # React contexts for state management
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── config/             # Configuration files
│   └── theme/              # Material-UI theme configuration
├── public/                 # Static assets
└── build/                  # Production build
```

### Mobile App Structure
```
mobile_app_flutter/
├── lib/
│   ├── main.dart                 # Application entry point
│   ├── firebase_options.dart     # Firebase configuration
│   ├── screens/                  # UI screens
│   │   ├── dashboard_screen.dart
│   │   ├── login_screen.dart
│   │   ├── data_entry_screen.dart
│   │   ├── reports_screen.dart
│   │   ├── notifications_screen.dart
│   │   └── ...
│   ├── services/                 # Business logic services
│   │   ├── form_config_service.dart
│   │   ├── reports_service.dart
│   │   ├── notification_service.dart
│   │   └── ...
│   ├── widgets/                  # Reusable UI components
│   │   ├── dynamic_reports_table.dart
│   │   ├── file_upload_widget.dart
│   │   └── ...
│   └── themes/                   # App theming
│       └── app_theme.dart
├── android/                      # Android-specific files
├── ios/                         # iOS-specific files
└── assets/                      # App assets
```

## 🔧 Available Scripts

### Web Portal
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

### Mobile App
- `flutter run` - Run in development mode
- `flutter build apk` - Build Android APK
- `flutter build ios` - Build iOS app
- `flutter test` - Run tests

## 🌐 Deployment

### GitHub Pages (Web Portal)
This web application is configured for deployment on GitHub Pages:

1. **Build the application**
```bash
cd web-app
npm run build
```

2. **Deploy to GitHub Pages**
```bash
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

3. **Configure GitHub Pages**
- Go to repository Settings → Pages
- Select "Deploy from a branch"
- Choose "main" branch and "/build" folder
- Save settings

### Other Deployment Options
- **Netlify**: Connect your GitHub repository
- **Vercel**: Import your GitHub repository
- **Firebase Hosting**: Use Firebase CLI
- **AWS S3**: Upload build folder to S3 bucket

## 📖 Documentation

### Complete Documentation Suite
- **[📚 Comprehensive Documentation](mobile_app_flutter/COMPREHENSIVE_DOCUMENTATION.md)** - Complete system overview
- **[🔧 API Reference](mobile_app_flutter/API_REFERENCE.md)** - Detailed API documentation
- **[👤 User Manual](mobile_app_flutter/USER_MANUAL.md)** - End-user guide
- **[🚀 Deployment Guide](mobile_app_flutter/DEPLOYMENT_GUIDE.md)** - Production deployment instructions

### Quick Links
- [Installation & Setup](#quick-start)
- [User Guide](mobile_app_flutter/USER_MANUAL.md#getting-started)
- [Developer Guide](mobile_app_flutter/COMPREHENSIVE_DOCUMENTATION.md#developer-guide)
- [Database Schema](mobile_app_flutter/COMPREHENSIVE_DOCUMENTATION.md#database-schema)
- [Troubleshooting](mobile_app_flutter/USER_MANUAL.md#troubleshooting)

## 👥 User Roles

### Division Users
- Access to comprehensive reports across all offices
- Notification sending capabilities
- Administrative functions
- Cross-office data visibility
- **Web Portal**: Advanced form builder and system configuration
- **Mobile App**: Full administrative access

### Office Users
- Office-specific data entry and reporting
- Limited to assigned office data
- Form submission and status tracking
- Basic notification receiving
- **Web Portal**: Office-level reporting and management
- **Mobile App**: Field data entry and basic reporting

## 🔒 Security Features

- **Authentication**: Firebase Authentication with email/password
- **Authorization**: Role-based access control
- **Data Encryption**: All data encrypted in transit and at rest
- **Input Validation**: Comprehensive client and server-side validation
- **Audit Trail**: All user actions logged
- **File Security**: File type and size validation
- **HTTPS**: Secure data transmission
- **Environment Variables**: Secure configuration management

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

#### Web Portal (.env)
```bash
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_SUPABASE_URL=your-supabase-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

#### Mobile App (firebase_options.dart)
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

### Web Portal Tests
```bash
cd web-app
npm test
```

### Mobile App Tests
```bash
cd mobile_app_flutter

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

- **Web Portal**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **Mobile App**:
  - **Android**: API level 23+ (Android 6.0+)
  - **iOS**: iOS 12.0+

## 🔄 Version History

### Version 1.0.0 (Current)
- Initial release with both web portal and mobile app
- Complete form management system
- Reports and analytics
- Notification system
- File upload functionality
- Office hierarchy management
- Cross-platform synchronization

## 📊 Features Overview

### Web Portal Features
- **Admin Dashboard**: User management, form configuration, system analytics
- **Form Builder**: Drag-and-drop interface with validation rules
- **Reports & Analytics**: Real-time data visualization with interactive charts
- **Office Management**: Comprehensive office hierarchy management

### Mobile App Features
- **Field Data Entry**: Offline-capable form submission
- **Real-time Sync**: Automatic data synchronization
- **File Upload**: Multiple file type support with progress tracking
- **Push Notifications**: Real-time updates and alerts

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- **Web Portal**: Follow React/TypeScript best practices
- **Mobile App**: Follow [Dart Style Guide](https://dart.dev/guides/language/effective-dart/style)
- Use meaningful variable and function names
- Add comprehensive documentation
- Write unit tests for new features

## 📞 Support

### Technical Support
- **Email**: sathishsat04@gmail.com
- **Issues**: [GitHub Issues](https://github.com/sathishnagarathinam/reportsmanagement/issues)
- **Documentation**: [Complete Documentation](mobile_app_flutter/COMPREHENSIVE_DOCUMENTATION.md)

### Contact Information
- **Developer**: Sathish Nagarathinam
- **Email**: sathishsat04@gmail.com
- **Organization**: India Post Western Region

## 📄 License

This project is proprietary software developed for India Post Western Region. All rights reserved.

## 🙏 Acknowledgments

- India Post Western Region for project requirements and support
- React and TypeScript communities for web development
- Flutter team for the excellent mobile framework
- Material-UI team for excellent web components
- Firebase and Supabase teams for backend services
- Open source community for various packages and tools

---

<div align="center">
  <p><strong>India Post Western Region Reports Management System</strong></p>
  <p>© 2025 All rights reserved</p>
  <p>Developed with ❤️ for India Post</p>
</div>
