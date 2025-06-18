# India Post Reports Management System - Web Application

<div align="center">
  <img src="public/Indiapost_Logo.png" alt="India Post Logo" width="200"/>
  
  <h3>Western Region Reports Management System - Web Portal</h3>
  <p>A comprehensive web application for India Post Western Region to manage reports, forms, and administrative processes.</p>
  
  [![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
  [![Firebase](https://img.shields.io/badge/Firebase-11.7.1-orange.svg)](https://firebase.google.com/)
  [![Material-UI](https://img.shields.io/badge/Material--UI-7.1.0-blue.svg)](https://mui.com/)
</div>

## 🌐 Live Demo

**[View Live Application](https://your-username.github.io/india-post-web-app)**

## 📱 Overview

This is the web portal companion to the India Post Reports Management System mobile app. It provides administrators and division users with comprehensive tools for managing forms, reports, and office operations across the India Post Western Region.

## ✨ Key Features

### 🔐 Authentication & User Management
- Secure Firebase Authentication
- Role-based access control (Admin/Division/Office users)
- User profile management
- Session management

### 📊 Dynamic Form Management
- Create and configure dynamic forms
- Drag-and-drop form builder
- Field type management (text, dropdown, date, file upload)
- Office-based form assignment
- Form validation and preview

### 📈 Advanced Reporting
- Real-time data visualization
- Office hierarchy filtering
- Date range analytics
- Export functionality (Excel, PDF)
- Interactive charts and graphs

### 🏢 Office Hierarchy Management
- Multi-level office structure management
- Region → Division → Office hierarchy
- Office assignment and permissions
- Hierarchical data access control

### 🔔 Notification System
- Broadcast notifications to users
- Targeted messaging by office/division
- Notification history and tracking
- Push notification integration

### 📋 Administrative Dashboard
- Comprehensive admin panel
- User management and permissions
- System configuration
- Analytics and insights

## 🛠 Technology Stack

### Frontend
- **React 18.2.0** - Modern React with hooks
- **TypeScript 5.8.3** - Type-safe development
- **Material-UI 7.1.0** - Professional UI components
- **React Router DOM 7.6.0** - Client-side routing
- **React DnD 16.0.1** - Drag and drop functionality

### Backend Integration
- **Firebase 11.7.1** - Authentication and database
- **Supabase** - Additional database and real-time features

### Build Tools
- **React Scripts 5.0.1** - Build and development tools
- **TypeScript** - Compilation and type checking

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Firebase project setup
- Supabase project setup

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/india-post-web-app.git
cd india-post-web-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
# Create .env file with your Firebase and Supabase credentials
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_key
```

4. **Start development server**
```bash
npm start
```

5. **Build for production**
```bash
npm run build
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Main application pages
├── services/           # API and business logic
├── contexts/           # React contexts for state management
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── config/             # Configuration files
└── theme/              # Material-UI theme configuration
```

## 🔧 Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## 🌐 Deployment

### GitHub Pages
This application is configured for deployment on GitHub Pages:

1. **Build the application**
```bash
npm run build
```

2. **Deploy to GitHub Pages**
```bash
# The build folder is included in the repository for GitHub Pages
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

## 🔒 Security Features

- **Authentication**: Firebase Authentication with email/password
- **Authorization**: Role-based access control
- **Data Validation**: Input validation and sanitization
- **HTTPS**: Secure data transmission
- **Environment Variables**: Secure configuration management

## 📊 Features Overview

### Admin Dashboard
- User management and role assignment
- Form configuration and management
- System analytics and reporting
- Office hierarchy management

### Form Builder
- Drag-and-drop interface
- Multiple field types
- Validation rules
- Preview functionality

### Reports & Analytics
- Real-time data visualization
- Filtering and search capabilities
- Export functionality
- Interactive charts

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

### Technical Support
- **Email**: sathishsat04@gmail.com
- **Issues**: [GitHub Issues](https://github.com/your-username/india-post-web-app/issues)

### Contact Information
- **Developer**: Sathish Nagarathinam
- **Email**: sathishsat04@gmail.com
- **Organization**: India Post Western Region

## 📄 License

This project is proprietary software developed for India Post Western Region. All rights reserved.

## 🙏 Acknowledgments

- India Post Western Region for project requirements
- React and TypeScript communities
- Material-UI team for excellent components
- Firebase and Supabase teams for backend services

---

<div align="center">
  <p><strong>India Post Western Region Reports Management System</strong></p>
  <p>© 2025 All rights reserved</p>
  <p>Developed with ❤️ for India Post</p>
</div>
