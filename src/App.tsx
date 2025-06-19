import React, { Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import Register from './components/auth/Register'; // Import the Register component
import './App.css';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme/theme';
import './components/shared/StatsCards.css';

// Lazy load components for better performance
const Dashboard = React.lazy(() => import('./components/dashboard/Dashboard'));
const EmployeesList = React.lazy(() => import('./components/employees/EmployeesList'));
const DataEntry = React.lazy(() => import('./components/DataEntry/DataEntry'));
const Reports = React.lazy(() => import('./components/Reports/Reports'));
const ReportsTest = React.lazy(() => import('./components/Reports/ReportsTest'));
const ReportsDebugScreen = React.lazy(() => import('./components/Reports/ReportsDebugScreen'));
const BasicSupabaseTest = React.lazy(() => import('./components/Reports/BasicSupabaseTest'));
const MasterAdmin = React.lazy(() => import('./components/admin/MasterAdmin'));
const AdminPage = React.lazy(() => import('./components/admin/AdminPage'));
const MMUAdmin = React.lazy(() => import('./components/admin/mmu/MMUAdmin'));
const Profile = React.lazy(() => import('./components/Profile/Profile'));
// Remove these imports
// const BusinessDevelopment = React.lazy(() => import('./components/DataEntry/BusinessDevelopment'));
// const AdminBusinessDevelopment = React.lazy(() => import('./components/admin/BusinessDevelopment'));

// Add LoadingFallback component at the top of the file
const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <p>Loading...</p>
  </div>
);

// Add ProtectedLayout component
const ProtectedLayout = () => {
  const { currentUser, loading } = useAuth();
  
  // Import StatsCards.css here to apply styles to all protected routes
   // Moved import to top level

  if (loading) {
    return <LoadingFallback />; // Show loading fallback while auth state is being determined
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// Add CardPage import at the top
import CardPage from './components/DataEntry/CardPage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <Router>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<Register />} /> {/* Add this line for the register route */}
              <Route element={<ProtectedLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/employees" element={<EmployeesList />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/reports-test" element={<ReportsTest />} />
                <Route path="/reports-debug" element={<ReportsDebugScreen />} />
                <Route path="/basic-test" element={<BasicSupabaseTest />} />
                <Route path="/master-admin" element={<MasterAdmin />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/admin/mmu" element={<MMUAdmin />} />
                <Route path="/data-entry" element={<DataEntry />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/data-entry/:cardId/*" element={<CardPage />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
