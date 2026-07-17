import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../shared/Sidebar';
import ReportsService, { ReportsFilter, FormSubmissionWithUserData } from '../../services/reportsService';
import FormConfigService from '../../services/formConfigService';
import ReportBuilder from './ReportBuilder';
import SavedReportsSection from './SavedReportsSection';
import '../dashboard/Dashboard.css';

// Add CSS for loading spinner animation
const spinnerStyle = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject the CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = spinnerStyle;
  document.head.appendChild(style);
}

const Reports: React.FC = () => {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [submissions, setSubmissions] = useState<FormSubmissionWithUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const filters: ReportsFilter = {
    limit: 50,
    offset: 0
  };
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        const userRef = doc(db, 'employees', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }
      }
    };
    fetchUserData();
  }, [currentUser]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchInitialData = async () => {
    try {
      const summaryData = await ReportsService.getReportsSummary();
      setSummary(summaryData);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  };

  const fetchSubmissions = async () => {
    try {
      setLoading(true);

      const data = await ReportsService.getFormSubmissions(filters);
      // console.log('Raw submissions data:', data);
      setSubmissions(data);

    } catch (err) {
      console.error('Error fetching submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const csvContent = await ReportsService.exportToCSV(filters);

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `form_submissions_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error('Error exporting data:', err);
      alert('Failed to export data. Please try again.');
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar userData={userData} />

      {/* Main Content */}
      <div className="main-content">
        <div className="page-title">
          Reports
          <button
            className="btn btn-primary ms-3"
            onClick={handleExport}
            disabled={loading || submissions.length === 0}
            style={{ marginLeft: '1rem', padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            📥 Export CSV
          </button>
          <button
            onClick={async () => {
              if (submissions.length > 0) {
                const firstSubmission = submissions[0];
                console.log('🔍 Testing with first submission:', firstSubmission);

                try {
                  const convertedData = await FormConfigService.convertSubmissionData(
                    firstSubmission.form_identifier,
                    firstSubmission.submission_data
                  );

                  alert(`Form: ${firstSubmission.form_identifier}\n\nRaw Data Keys: ${Object.keys(firstSubmission.submission_data).join(', ')}\n\nConverted Data Keys: ${Object.keys(convertedData).join(', ')}\n\nConverted Data: ${JSON.stringify(convertedData, null, 2)}`);
                } catch (error) {
                  alert(`Error: ${error}`);
                }
              } else {
                alert('No submissions available to test');
              }
            }}
            style={{ marginLeft: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            🔍 Debug Data
          </button>
          <button
            onClick={() => {
              if (submissions.length > 0) {
                const officeData = submissions.map(sub => ({
                  id: sub.id,
                  user_office: sub.user_office,
                  submission_data_office: sub.submission_data?.officeName,
                  all_submission_fields: Object.keys(sub.submission_data || {}),
                  office_fields: Object.entries(sub.submission_data || {}).filter(([, value]) =>
                    typeof value === 'string' && (
                      value.includes(' RO') || value.includes(' BO') || value.includes(' SO') ||
                      value.includes(' HO') || value.includes(' DO') || value.includes('Office')
                    )
                  )
                }));
                console.log('🏢 Office Debug Data:', officeData);
                alert(`Office Debug:\n\n${JSON.stringify(officeData.slice(0, 3), null, 2)}`);
              } else {
                alert('No submissions to debug');
              }
            }}
            style={{ marginLeft: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            🏢 Debug Offices
          </button>
        </div>

        {/* Reports Summary */}
        {summary && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {[
                { icon: '📄', value: summary.totalSubmissions, label: 'Total Submissions', color: '#007bff' },
                { icon: '📋', value: summary.uniqueForms, label: 'Unique Forms', color: '#28a745' },
                { icon: '👥', value: summary.uniqueUsers, label: 'Active Users', color: '#17a2b8' },
                { icon: '📅', value: summary.submissionsToday, label: 'Today', color: '#ffc107' },
                { icon: '📆', value: summary.submissionsThisWeek, label: 'This Week', color: '#fd7e14' },
                { icon: '🗓️', value: summary.submissionsThisMonth, label: 'This Month', color: '#6f42c1' }
              ].map((card, index) => (
                <div key={index} style={{
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  textAlign: 'center',
                  minWidth: '150px',
                  flex: '1'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{card.icon}</div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: card.color, marginBottom: '0.25rem' }}>
                    {card.value.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {card.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report Builder */}
        <ReportBuilder 
          userId={currentUser?.uid || ''}
          onReportGenerated={(data) => {
            setSubmissions(data);
          }}
        />

        {/* Saved Reports Section */}
        <SavedReportsSection userId={currentUser?.uid || ''} />
      </div>
    </div>
  );
};

export default Reports;
