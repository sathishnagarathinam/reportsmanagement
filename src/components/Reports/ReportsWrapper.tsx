import React, { useEffect, useState } from 'react';
import ReportsRoutingService from '../../services/reportsRoutingService';
import Reports from './Reports';
import SimpleReports from './SimpleReports';
import Sidebar from '../shared/Sidebar';

interface OfficeInfo {
  officeName: string | null;
  isDivisionUser: boolean;
  accessLevel: string;
  reportType: string;
  description: string;
}

/**
 * Wrapper component that determines which type of reports to show
 * Report Screen 1: Division users → Comprehensive reports (Summary + Submissions + Table View)
 * Report Screen 2: Other users → Simple table view only with office-specific data
 */
const ReportsWrapper: React.FC = () => {
  const [shouldShowComprehensive, setShouldShowComprehensive] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [officeInfo, setOfficeInfo] = useState<OfficeInfo | null>(null);

  useEffect(() => {
    determineReportType();
  }, []);

  const determineReportType = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🚀 === ReportsWrapper: Starting report type determination ===');
      console.log('📋 ReportsWrapper: Determining report screen type for user...');

      // Log detailed access information for debugging
      await ReportsRoutingService.logUserAccessInfo();

      // Get comprehensive office information
      const officeInfo = await ReportsRoutingService.getUserOfficeInfo();
      const shouldShowComprehensive = await ReportsRoutingService.shouldShowComprehensiveReports();

      setShouldShowComprehensive(shouldShowComprehensive);
      setOfficeInfo(officeInfo);
      setIsLoading(false);

      console.log('✅ ReportsWrapper: Report screen type determined - Comprehensive:', shouldShowComprehensive);

    } catch (error) {
      console.error('❌ ReportsWrapper: Error determining report screen type:', error);
      
      setError(error instanceof Error ? error.message : 'Unknown error');
      setIsLoading(false);
      setShouldShowComprehensive(false); // Default to simple reports on error
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} onRetry={determineReportType} />;
  }

  // Show appropriate reports screen based on user's office type
  if (shouldShowComprehensive === true) {
    console.log('📋 ReportsWrapper: Showing Report Screen 1 - Comprehensive Reports (Division user)');
    console.log('📋 ReportsWrapper: Features: Summary + Submissions + Table View tabs');
    return <Reports />; // Report Screen 1: Full comprehensive reports
  } else {
    console.log('📋 ReportsWrapper: Showing Report Screen 2 - Simple Table View (Office user)');
    console.log('📋 ReportsWrapper: Features: Table View only with office-specific data');
    return <SimpleReports />; // Report Screen 2: Table view only
  }
};

const LoadingScreen: React.FC = () => {
  return (
    <div className="dashboard-container">
      <Sidebar userData={null} />
      <div className="main-content" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1E3A8A, #3B82F6)'
      }}>
        <div style={{
          textAlign: 'center',
          color: 'white',
          padding: '2rem'
        }}>
          {/* Logo */}
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: 'white',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            fontSize: '2.5rem'
          }}>
            📊
          </div>
          
          {/* Loading indicator */}
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          
          {/* Loading text */}
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: '600' }}>
            Determining Report Screen...
          </h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem' }}>
            Checking your office type
          </p>
        </div>
      </div>
    </div>
  );
};

interface ErrorScreenProps {
  error: string;
  onRetry: () => void;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({ error, onRetry }) => {
  return (
    <div className="dashboard-container">
      <Sidebar userData={null} />
      <div className="main-content" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1E3A8A, #3B82F6)'
      }}>
        <div style={{
          textAlign: 'center',
          color: 'white',
          padding: '2rem',
          maxWidth: '500px'
        }}>
          {/* Error icon */}
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            fontSize: '2.5rem',
            color: '#ef4444'
          }}>
            ⚠️
          </div>
          
          {/* Error title */}
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
            Unable to Load Reports
          </h2>
          
          {/* Error message */}
          <p style={{ margin: '0 0 1.5rem', opacity: 0.9, fontSize: '0.9rem' }}>
            Error: {error}
          </p>
          
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={onRetry}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'white',
                color: '#1E3A8A',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              🔄 Retry
            </button>
            <button
              onClick={() => window.location.href = '/reports-comprehensive'}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'transparent',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Continue with Table View Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add CSS animation for loading spinner
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

export default ReportsWrapper;
