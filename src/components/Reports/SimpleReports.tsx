import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ReportsService, { ReportsFilter, FormSubmissionWithUserData } from '../../services/reportsService';
import OfficeService from '../../services/officeService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../shared/Sidebar';
import '../dashboard/Dashboard.css';

interface SimpleReportsProps {}

/**
 * Simple Reports Component for non-Division users
 * Shows only table view with data from their own office
 */
const SimpleReports: React.FC<SimpleReportsProps> = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [submissions, setSubmissions] = useState<FormSubmissionWithUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formIdentifiers, setFormIdentifiers] = useState<string[]>([]);
  const [officeHierarchy, setOfficeHierarchy] = useState<string[]>([]); // User's office + reporting offices

  // Date range filtering
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [filters, setFilters] = useState<ReportsFilter>({
    limit: 50,
    offset: 0
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        try {
          const userRef = doc(db, 'employees', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setUserData(userData);
            console.log('✅ SimpleReports: User data loaded:', userData);

            // Fetch office hierarchy for this user
            try {
              const hierarchy = await OfficeService.fetchUserSpecificOfficeNames();
              setOfficeHierarchy(hierarchy);
              console.log('✅ SimpleReports: Office hierarchy loaded:', hierarchy);
            } catch (hierarchyErr) {
              console.error('❌ SimpleReports: Error fetching office hierarchy:', hierarchyErr);
              // Fallback to just user's office
              if (userData?.officeName) {
                setOfficeHierarchy([userData.officeName]);
              }
            }
          }
        } catch (err) {
          console.error('❌ SimpleReports: Error fetching user data:', err);
        }
      }
    };
    fetchUserData();
  }, [currentUser]);

  useEffect(() => {
    fetchFormIdentifiers();
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [filters, userData, officeHierarchy, fromDate, toDate]);

  const fetchFormIdentifiers = async () => {
    try {
      const identifiers = await ReportsService.getFormIdentifiers();
      setFormIdentifiers(identifiers);
    } catch (err) {
      console.error('❌ SimpleReports: Error fetching form identifiers:', err);
    }
  };

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Wait for office hierarchy to be loaded
      if (officeHierarchy.length === 0 && userData?.officeName) {
        console.log('⏳ SimpleReports: Waiting for office hierarchy to load...');
        // Use fallback with just user's office if hierarchy isn't loaded yet
        const fallbackHierarchy = [userData.officeName];

        // Apply office hierarchy filtering for simple reports
        let allSubmissions: FormSubmissionWithUserData[] = [];

        console.log('📊 SimpleReports: Fetching submissions for office hierarchy:', fallbackHierarchy);

        for (const officeName of fallbackHierarchy) {
          const officeFilteredFilters: ReportsFilter = {
            ...filters,
            officeName: officeName,
          };

          const officeSubmissions = await ReportsService.getFormSubmissions(officeFilteredFilters);

          // Apply date filtering if dates are selected
          const filteredSubmissions = (fromDate || toDate) ?
            filterSubmissionsByDate(officeSubmissions) : officeSubmissions;

          allSubmissions = allSubmissions.concat(filteredSubmissions);
          console.log('📊 SimpleReports: Fetched', filteredSubmissions.length, '/', officeSubmissions.length, 'submissions for office:', officeName, '(after date filter)');
        }

        // Remove duplicates based on submission ID
        const uniqueSubmissions = allSubmissions.reduce((acc, submission) => {
          acc[submission.id] = submission;
          return acc;
        }, {} as Record<string, FormSubmissionWithUserData>);

        const finalSubmissions = Object.values(uniqueSubmissions);

        // Sort by submission date (newest first)
        finalSubmissions.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

        setSubmissions(finalSubmissions);
        console.log('✅ SimpleReports: Total unique submissions:', finalSubmissions.length);
        return;
      }

      // Apply office hierarchy filtering for simple reports
      let allSubmissions: FormSubmissionWithUserData[] = [];

      if (officeHierarchy.length > 0) {
        console.log('📊 SimpleReports: Fetching submissions for', officeHierarchy.length, 'offices in hierarchy:', officeHierarchy);

        for (const officeName of officeHierarchy) {
          const officeFilteredFilters: ReportsFilter = {
            ...filters,
            officeName: officeName,
          };

          const officeSubmissions = await ReportsService.getFormSubmissions(officeFilteredFilters);

          // Apply date filtering if dates are selected
          const filteredSubmissions = (fromDate || toDate) ?
            filterSubmissionsByDate(officeSubmissions) : officeSubmissions;

          allSubmissions = allSubmissions.concat(filteredSubmissions);
          console.log('📊 SimpleReports: Fetched', filteredSubmissions.length, '/', officeSubmissions.length, 'submissions for office:', officeName, '(after date filter)');
        }

        // Remove duplicates based on submission ID
        const uniqueSubmissions = allSubmissions.reduce((acc, submission) => {
          acc[submission.id] = submission;
          return acc;
        }, {} as Record<string, FormSubmissionWithUserData>);

        const finalSubmissions = Object.values(uniqueSubmissions);

        // Sort by submission date (newest first)
        finalSubmissions.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

        setSubmissions(finalSubmissions);
        console.log('✅ SimpleReports: Total unique submissions:', finalSubmissions.length);
        console.log('📋 SimpleReports: Office hierarchy:', officeHierarchy);
      } else {
        console.log('⚠️ SimpleReports: No office hierarchy available, fetching all submissions');
        // Fallback: fetch all submissions if hierarchy is not available
        const data = await ReportsService.getFormSubmissions(filters);
        setSubmissions(data);
        console.log('✅ SimpleReports: Fetched', data.length, 'submissions (fallback)');
      }

    } catch (err) {
      console.error('❌ SimpleReports: Error fetching submissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (newFilters: ReportsFilter) => {
    console.log('🔍 SimpleReports: Applying new filters:', newFilters);
    setFilters({ ...newFilters, offset: 0 }); // Reset pagination when filters change
  };

  const clearFilters = () => {
    setFilters({ limit: 50, offset: 0 });
    setFromDate('');
    setToDate('');
  };

  // Filter submissions by date range based on form data dates
  const filterSubmissionsByDate = (submissions: FormSubmissionWithUserData[]) => {
    return submissions.filter(submission => {
      // Look for date fields in the form data
      const formDate = extractDateFromFormData(submission.submission_data);

      if (!formDate) return true; // Include if no date found

      // Apply date range filtering
      if (fromDate && formDate < fromDate) {
        return false;
      }
      if (toDate && formDate > toDate) {
        return false;
      }

      return true;
    });
  };

  // Extract date from form data by looking for common date field patterns
  const extractDateFromFormData = (formData: any): string | null => {
    if (!formData || typeof formData !== 'object') return null;

    // Common date field patterns to look for
    const dateFieldPatterns = [
      'date',
      'Date',
      'DATE',
      'reportDate',
      'submissionDate',
      'entryDate',
      'formDate',
    ];

    for (const pattern of dateFieldPatterns) {
      for (const [key, value] of Object.entries(formData)) {
        if (key.toLowerCase().includes(pattern.toLowerCase()) && value) {
          try {
            // Try to parse as date and return in YYYY-MM-DD format
            const date = new Date(value as string);
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          } catch (e) {
            // Continue searching if this field can't be parsed as date
            continue;
          }
        }
      }
    }

    return null; // No date field found
  };

  const formatFieldValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getTableColumns = () => {
    if (submissions.length === 0) return [];
    
    const allFields = new Set<string>();
    submissions.forEach(submission => {
      Object.keys(submission.submission_data || {}).forEach(field => {
        allFields.add(field);
      });
    });

    return ['Form Type', 'Submitted Date', 'User', ...Array.from(allFields)];
  };

  const getTableData = () => {
    const columns = getTableColumns();
    return submissions.map(submission => {
      const row: { [key: string]: string } = {
        'Form Type': submission.form_identifier,
        'Submitted Date': new Date(submission.submitted_at).toLocaleDateString(),
        'User': submission.user_name || submission.user_id || 'Unknown',
      };

      // Add submission data fields
      columns.slice(3).forEach(field => {
        row[field] = formatFieldValue(submission.submission_data?.[field]);
      });

      return row;
    });
  };

  return (
    <div className="dashboard-container">
      <Sidebar userData={userData} />
      <div className="main-content">
        {/* Header Section - Dashboard Theme */}
        <div style={{
          background: 'linear-gradient(135deg, #1E3A8A, #3B82F6)',
          color: 'white',
          padding: '2rem',
          borderRadius: '0 0 30px 30px',
          marginBottom: '2rem'
        }}>
          {/* Back Button and Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '12px',
                color: 'white',
                padding: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              ←
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '60px',
                height: '60px',
                backgroundColor: 'white',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '2rem', color: '#1E3A8A' }}>📊</span>
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>
                  Office Reports
                </h1>
                <p style={{ margin: 0, opacity: 0.9, fontSize: '1.1rem' }}>
                  Table view - Office data only
                </p>
              </div>
            </div>
          </div>

          {/* Office Context Banner */}
          {userData?.officeName && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🏢</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                    Office Data View
                  </div>
                  <div style={{ opacity: 0.9, fontSize: '0.9rem' }}>
                    {userData.officeName}
                  </div>
                </div>
                <div style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  Table View Only
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filters Section */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h5 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🔍 Office Data Filters
            </h5>
            <div style={{ fontSize: '0.875rem', color: '#666' }}>
              📊 Table View Only
            </div>
          </div>

          {/* Date Range Filters */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  // If to date is before from date, clear it
                  if (toDate && e.target.value && toDate < e.target.value) {
                    setToDate('');
                  }
                }}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div style={{ flex: '1', minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>To Date</label>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
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
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                style={{ padding: '0.5rem 1rem', backgroundColor: '#1E3A8A', color: 'white', border: 'none', borderRadius: '4px' }}
                onClick={() => fetchSubmissions()}
              >
                🔄 Refresh
              </button>
              <button
                style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}
                onClick={clearFilters}
              >
                ✖️ Clear
              </button>
            </div>
          </div>
        </div>

        {/* Table View Only */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee' }}>
            <h5 style={{ margin: 0 }}>📋 Office Data Table ({submissions.length} records)</h5>
          </div>
          
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ marginBottom: '1rem' }}>Loading table data...</div>
              <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #1E3A8A', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
            </div>
          ) : error ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#dc3545' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
              <div>Error: {error}</div>
              <button
                style={{ marginTop: '1rem', padding: '0.5rem 1rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}
                onClick={fetchSubmissions}
              >
                Retry
              </button>
            </div>
          ) : submissions.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</div>
              <div>No data found for your office</div>
              <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                {userData?.officeName ? `Office: ${userData.officeName}` : 'Check your office configuration'}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0 }}>
                  <tr>
                    {getTableColumns().map((column, index) => (
                      <th key={index} style={{
                        padding: '1rem',
                        textAlign: 'left',
                        borderBottom: '2px solid #dee2e6',
                        fontWeight: '600',
                        fontSize: '0.875rem',
                        color: '#495057'
                      }}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getTableData().map((row, rowIndex) => (
                    <tr key={rowIndex} style={{
                      borderBottom: '1px solid #dee2e6'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      {getTableColumns().map((column, colIndex) => (
                        <td key={colIndex} style={{
                          padding: '0.75rem 1rem',
                          fontSize: '0.875rem',
                          color: '#495057',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {row[column] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleReports;
