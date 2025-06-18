import React, { useEffect, useState, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../shared/Sidebar';
import ReportsService, { ReportsFilter, FormSubmissionWithUserData } from '../../services/reportsService';
import FormConfigService from '../../services/formConfigService';
import SubmissionsSummaryCards from './SubmissionsSummaryCards';
import DynamicReportsTable from './DynamicReportsTable';
import OfficeService from '../../services/officeService';
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
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'card'>(() => {
    // Get saved preference from session storage, default to table view for backward compatibility
    const savedViewMode = sessionStorage.getItem('reports-view-mode');
    return (savedViewMode === 'card' || savedViewMode === 'table') ? savedViewMode : 'table';
  });
  const [filters, setFilters] = useState<ReportsFilter>({
    limit: 50,
    offset: 0
  });
  const [summary, setSummary] = useState<any>(null);
  const [formIdentifiers, setFormIdentifiers] = useState<string[]>([]);

  // Office dropdown states
  const [officeOptions, setOfficeOptions] = useState<Array<{label: string, value: string}>>([]);
  const [officeLoading, setOfficeLoading] = useState(false);
  const [officeError, setOfficeError] = useState<string>('');

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
    fetchOfficeNames();
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [filters]);

  // Update document title based on view mode
  useEffect(() => {
    const baseTitle = 'Reports - Employee Management System';
    const viewTitle = viewMode === 'table' ? 'Table View' : 'Card View';
    document.title = `${baseTitle} - ${viewTitle}`;

    // Cleanup on unmount
    return () => {
      document.title = baseTitle;
    };
  }, [viewMode]);

  const fetchInitialData = async () => {
    try {
      const [summaryData, identifiers] = await Promise.all([
        ReportsService.getReportsSummary(),
        ReportsService.getFormIdentifiers()
      ]);
      setSummary(summaryData);
      setFormIdentifiers(identifiers);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  };

  // Fetch office names for dropdown with hierarchical filtering
  const fetchOfficeNames = useCallback(async () => {
    if (officeOptions.length > 0 && !officeError) {
      return; // Already loaded successfully
    }

    setOfficeLoading(true);
    setOfficeError('');

    try {
      console.log('🏢 Reports: Fetching office names for filter dropdown...');

      // Use user-specific filtering for Office Name dropdowns
      const officeNames = await OfficeService.fetchUserSpecificOfficeNames();
      const options = OfficeService.officeNamesToOptions(officeNames);

      setOfficeOptions(options);
      console.log('✅ Reports: Successfully loaded', options.length, 'office options');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load office names';
      setOfficeError(errorMessage);
      console.error('❌ Reports: Error fetching office names:', error);
    } finally {
      setOfficeLoading(false);
    }
  }, [officeOptions.length, officeError]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await ReportsService.getFormSubmissions(filters);
      // console.log('Raw submissions data:', data);
      setSubmissions(data);

    } catch (err) {
      console.error('Error fetching submissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (newFilters: ReportsFilter) => {
    console.log('🔍 Reports: Applying new filters:', newFilters);
    setFilters({ ...newFilters, offset: 0 }); // Reset pagination when filters change
  };

  const handleViewModeChange = (newViewMode: 'table' | 'card') => {
    setViewMode(newViewMode);
    // Save preference to session storage
    sessionStorage.setItem('reports-view-mode', newViewMode);
    console.log('📊 Reports: View mode changed to:', newViewMode);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const formatReadableData = (data: Record<string, any>) => {
    // console.log('formatReadableData called with:', data);

    // Since we're dealing with dynamic form fields with generated IDs,
    // let's create a more intelligent display
    const displayFields: string[] = [];
    const entries = Object.entries(data);

    // Filter out empty values and format nicely
    entries.forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        // Skip office name as it's shown separately
        if (key === 'officeName') return;

        // Format the value based on type and content
        let formattedValue = value;
        let fieldDescription = 'Data';

        if (typeof value === 'string' && value.includes('T') && value.includes(':')) {
          // Looks like a date
          try {
            const date = new Date(value);
            formattedValue = date.toLocaleDateString();
            fieldDescription = 'Date';
          } catch (e) {
            // Keep original value if date parsing fails
          }
        } else if (typeof value === 'string' && (value.includes(' BO') || value.includes(' SO') || value.includes(' RO'))) {
          // This is an office name
          fieldDescription = 'Office';
          formattedValue = value;
        } else if (typeof value === 'string' && value.length > 10 && !value.includes(' ')) {
          // Long string without spaces might be an ID
          fieldDescription = 'ID';
          formattedValue = value.length > 15 ? `${value.substring(0, 15)}...` : value;
        } else if (typeof value === 'number' || !isNaN(Number(value))) {
          // Numeric value
          fieldDescription = 'Value';
          formattedValue = value;
        } else if (typeof value === 'string' && value.length < 50) {
          // Short text might be a name or description
          fieldDescription = 'Text';
          formattedValue = value;
        }

        displayFields.push(`${fieldDescription}: ${formattedValue}`);
      }
    });

    // Limit to first 3 fields to avoid clutter
    const limitedFields = displayFields.slice(0, 3);
    const result = limitedFields.length > 0
      ? limitedFields.join(', ') + (displayFields.length > 3 ? '...' : '')
      : 'Form submission data';

    // console.log('Final result:', result);
    return result;
  };

  const getFormTypeDisplay = (formIdentifier: string) => {
    const formTypes: Record<string, string> = {
      'employee-registration': 'Employee Registration',
      'leave-request': 'Leave Request',
      'expense-report': 'Expense Report',
      'performance-review': 'Performance Review',
      'it-support-request': 'IT Support Request',
      'training-registration': 'Training Registration',
      'feedback-form': 'Feedback Form',
      'inventory-request': 'Inventory Request'
    };
    return formTypes[formIdentifier] || formIdentifier.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getUserDisplayName = (submission: FormSubmissionWithUserData) => {
    // console.log('getUserDisplayName called with submission:', submission);

    // Try to get name from submission data
    const data = submission.submission_data;
    // console.log('Submission data:', data);

    // Since we're dealing with dynamic fields, look for text values that might be names
    const entries = Object.entries(data);

    // Look for string values that might be names (not dates, not numbers, not office names)
    for (const [key, value] of entries) {
      if (typeof value === 'string' && value.length > 2 && value.length < 50) {
        // Skip if it looks like a date
        if (value.includes('T') && value.includes(':')) continue;
        // Skip if it's just a number
        if (!isNaN(Number(value))) continue;
        // Skip office name field
        if (key === 'officeName') continue;
        // Skip if it looks like an office name (contains BO, SO, RO, etc.)
        if (value.includes(' BO') || value.includes(' SO') || value.includes(' RO') ||
            value.includes(' HO') || value.includes(' DO') || value.includes('Office')) continue;

        // This might be a name - use it
        // console.log('Found potential name:', value);
        return value;
      }
    }

    // Look for the form identifier to create a more meaningful name
    const formType = getFormTypeDisplay(submission.form_identifier);

    // Fallback to user_id or form-based name
    if (submission.user_id) {
      const fallback = `${formType} User ${submission.user_id.substring(0, 8)}`;
      // console.log('Using form-based fallback:', fallback);
      return fallback;
    }

    const fallback = `${formType} Submitter`;
    // console.log('Using generic fallback:', fallback);
    return fallback;
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
                  office_fields: Object.entries(sub.submission_data || {}).filter(([key, value]) =>
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

        {/* Filters */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h5 style={{ marginBottom: '1rem' }}>🔍 Filters</h5>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Form Type</label>
              <select
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                value={filters.formIdentifier || ''}
                onChange={(e) => handleFiltersChange({ ...filters, formIdentifier: e.target.value || undefined })}
              >
                <option value="">All Forms</option>
                {formIdentifiers.map(identifier => (
                  <option key={identifier} value={identifier}>
                    {identifier}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Office Name</label>
              <div style={{ position: 'relative' }}>
                <select
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: officeLoading ? '#f8f9fa' : 'white'
                  }}
                  value={filters.officeName || ''}
                  onChange={(e) => handleFiltersChange({ ...filters, officeName: e.target.value || undefined })}
                  disabled={officeLoading}
                >
                  <option value="">
                    {officeLoading ? 'Loading offices...' : 'All Offices'}
                  </option>
                  {officeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {/* Loading indicator */}
                {officeLoading && (
                  <div style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '16px',
                    height: '16px'
                  }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #f3f3f3',
                      borderTop: '2px solid #007bff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                  </div>
                )}
              </div>

              {/* Error message with retry button */}
              {officeError && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#dc3545' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>⚠️ {officeError}</span>
                    <button
                      type="button"
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      onClick={fetchOfficeNames}
                      disabled={officeLoading}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {/* Success indicator */}
              {!officeLoading && !officeError && officeOptions.length > 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#28a745' }}>
                  ✅ {officeOptions.length} offices loaded
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'end', gap: '0.5rem' }}>
              <button
                style={{ padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
                onClick={() => fetchSubmissions()}
              >
                🔍 Apply
              </button>
              <button
                style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}
                onClick={() => {
                  setFilters({ limit: 50, offset: 0 });
                  handleFiltersChange({ limit: 50, offset: 0 });
                }}
              >
                ✖️ Clear
              </button>
            </div>
          </div>
        </div>

        {/* View Toggle Controls */}
        <div style={{
          background: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h5 style={{ margin: 0, color: '#333' }}>📊 Submission Data</h5>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#666' }}>
              {viewMode === 'table'
                ? 'Detailed table view with all submission fields and data'
                : 'Summary view showing completion status by office'}
            </p>
          </div>

          {/* View Mode Toggle */}
          <div style={{
            display: 'flex',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            padding: '4px',
            border: '1px solid #dee2e6'
          }}>
            <button
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: viewMode === 'table' ? '#007bff' : 'transparent',
                color: viewMode === 'table' ? 'white' : '#6c757d',
                fontWeight: viewMode === 'table' ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem'
              }}
              onClick={() => handleViewModeChange('table')}
              onMouseEnter={(e) => {
                if (viewMode !== 'table') {
                  e.currentTarget.style.backgroundColor = '#e9ecef';
                }
              }}
              onMouseLeave={(e) => {
                if (viewMode !== 'table') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              title="View submissions in a detailed table format with sortable columns"
            >
              📋 Table View
            </button>
            <button
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: viewMode === 'card' ? '#007bff' : 'transparent',
                color: viewMode === 'card' ? 'white' : '#6c757d',
                fontWeight: viewMode === 'card' ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem'
              }}
              onClick={() => handleViewModeChange('card')}
              onMouseEnter={(e) => {
                if (viewMode !== 'card') {
                  e.currentTarget.style.backgroundColor = '#e9ecef';
                }
              }}
              onMouseLeave={(e) => {
                if (viewMode !== 'card') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              title="View submissions as summary cards showing completion status"
            >
              📊 Card View
            </button>
          </div>
        </div>

        {/* Dynamic Reports Content */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {error && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderBottom: '1px solid #f5c6cb'
            }}>
              ⚠️ {error}
              <button
                style={{
                  marginLeft: '1rem',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px'
                }}
                onClick={fetchSubmissions}
              >
                Retry
              </button>
            </div>
          )}

          {/* Conditional rendering based on view mode */}
          {viewMode === 'table' ? (
            <DynamicReportsTable
              submissions={submissions}
              loading={loading}
              onRefresh={fetchSubmissions}
            />
          ) : (
            <SubmissionsSummaryCards
              submissions={submissions}
              loading={loading}
              onRefresh={fetchSubmissions}
              filters={filters}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;