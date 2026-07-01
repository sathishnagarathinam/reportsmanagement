import React, { useState, useEffect } from 'react';
import { FormSubmissionWithUserData, ReportsFilter } from '../../services/reportsService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface SubmissionsSummaryCardsProps {
  submissions: FormSubmissionWithUserData[];
  loading: boolean;
  onRefresh: () => void;
  filters: ReportsFilter;
}

interface OfficeSubmissionSummary {
  completedOffices: string[];
  pendingOffices: string[];
  totalTargetOffices: number;
  completedCount: number;
  pendingCount: number;
}

const SubmissionsSummaryCards: React.FC<SubmissionsSummaryCardsProps> = ({
  submissions,
  loading,
  onRefresh,
  filters
}) => {
  const [summary, setSummary] = useState<OfficeSubmissionSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  // Default to showing pending offices list so users can see Not Completed offices immediately
  const [expandedCard, setExpandedCard] = useState<'completed' | 'pending' | null>('pending');

  useEffect(() => {
    calculateOfficeSummary();
  }, [submissions, filters]);

  const calculateOfficeSummary = async () => {
    if (!filters.formIdentifier) {
      // If no specific form is selected, show basic submission count
      const uniqueOffices = getUniqueOfficesFromSubmissions(submissions);
      setSummary({
        completedOffices: uniqueOffices,
        pendingOffices: [],
        totalTargetOffices: uniqueOffices.length,
        completedCount: uniqueOffices.length,
        pendingCount: 0
      });
      return;
    }

    setSummaryLoading(true);
    try {
      // Get completed offices from current submissions
      const completedOffices = getUniqueOfficesFromSubmissions(submissions);

      // Get target offices from page_configurations
      const targetOffices = await getTargetOfficesForForm(filters.formIdentifier);

      // Build a lookup map for facility IDs that may be stored in selectedOffices
      const officeNameByFacilityId = await getOfficeNameByFacilityIdMap(targetOffices);

      // Calculate pending offices with cross-matching
      const pendingOffices = targetOffices.filter(office => {
        const normalizedOffice = office.toLowerCase().trim();
        const normalizedCompletedOffices = completedOffices.map(o => o.toLowerCase().trim());

        // Direct match
        if (normalizedCompletedOffices.includes(normalizedOffice)) return false;

        // Facility ID match: target is a facility ID, completed is an office name
        const officeNameForFacilityId = officeNameByFacilityId[normalizedOffice];
        if (officeNameForFacilityId &&
            normalizedCompletedOffices.includes(officeNameForFacilityId.toLowerCase().trim())) {
          return false;
        }

        // Substring match for partial names
        return !normalizedCompletedOffices.some(completed =>
          completed.includes(normalizedOffice) || normalizedOffice.includes(completed)
        );
      });

      setSummary({
        completedOffices,
        pendingOffices,
        totalTargetOffices: targetOffices.length,
        completedCount: completedOffices.length,
        pendingCount: pendingOffices.length
      });

    } catch (error) {
      console.error('Error calculating office summary:', error);
      // Fallback to basic count
      const uniqueOffices = getUniqueOfficesFromSubmissions(submissions);
      setSummary({
        completedOffices: uniqueOffices,
        pendingOffices: [],
        totalTargetOffices: uniqueOffices.length,
        completedCount: uniqueOffices.length,
        pendingCount: 0
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  const getOfficeNameByFacilityIdMap = async (targetOffices: string[]): Promise<Record<string, string>> => {
    const result: Record<string, string> = {};
    try {
      // Identify values that look like facility IDs rather than office names
      const facilityIds = targetOffices.filter(office => {
        const value = office.toLowerCase().trim();
        return value.length > 0 && !value.includes('office') && !value.includes(' so') && !value.includes(' bo') && !value.includes(' ro') && !value.includes(' ho');
      });

      for (const facilityId of facilityIds) {
        try {
          const officeDoc = await getDoc(doc(db, 'offices', facilityId));
          if (officeDoc.exists()) {
            const data = officeDoc.data();
            const officeName = data?.officeName || data?.office_name || data?.name || '';
            if (officeName) {
              result[facilityId.toLowerCase().trim()] = officeName.trim();
            }
          }
        } catch (e) {
          // Ignore per-document errors
        }
      }
    } catch (error) {
      console.error('Error building facility ID map:', error);
    }
    return result;
  };

  const getUniqueOfficesFromSubmissions = (submissions: FormSubmissionWithUserData[]): string[] => {
    const officeSet = new Set<string>();

    submissions.forEach(submission => {
      // Primary: use user_office if it's set and valid (this is the most reliable source)
      if (submission.user_office &&
          submission.user_office.trim() !== '' &&
          submission.user_office !== 'Unknown Office') {
        officeSet.add(submission.user_office.trim());
        return; // Move to next submission
      }

      // Fallback: look for office name in submission_data
      if (submission.submission_data) {
        for (const [key, value] of Object.entries(submission.submission_data)) {
          if (typeof value === 'string' && value.trim() !== '' && (
            value.includes(' BO') || value.includes(' SO') || value.includes(' RO') ||
            value.includes(' HO') || value.includes(' DO') || value.includes('Office') ||
            value.includes('office') || value.includes('Branch') || value.includes('branch')
          )) {
            officeSet.add(value.trim());
            break; // Found office name, move to next submission
          }
        }
      }
    });

    return Array.from(officeSet).filter(office => office.length > 0);
  };

  const getTargetOfficesForForm = async (formIdentifier: string): Promise<string[]> => {
    try {
      console.log('🎯 Fetching target offices for form:', formIdentifier);

      const docRef = doc(db, 'page_configurations', formIdentifier);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.log('No page configuration found for form:', formIdentifier);
        return [];
      }

      const data = docSnap.data();
      const selectedOffices = data?.selectedOffices || data?.selected_offices || [];

      // selectedOffices should be an array of office names (or facility IDs)
      const targetOffices = Array.isArray(selectedOffices) ? selectedOffices : [];

      console.log('🎯 Target offices for form:', targetOffices);
      return targetOffices;

    } catch (error) {
      console.error('Error fetching target offices:', error);
      return [];
    }
  };

  const handleCardClick = (cardType: 'completed' | 'pending') => {
    setExpandedCard(expandedCard === cardType ? null : cardType);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  if (loading || summaryLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
        <div>🔄 Loading submission summary...</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
        <div>📊 Unable to calculate summary</div>
        <button
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
          onClick={onRefresh}
        >
          🔄 Refresh
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Completed Card */}
        <div
          style={{
            flex: 1,
            background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
            color: 'white',
            padding: '2rem',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: expandedCard === 'completed' 
              ? '0 8px 25px rgba(40, 167, 69, 0.3)' 
              : '0 4px 15px rgba(40, 167, 69, 0.2)'
          }}
          onClick={() => handleCardClick('completed')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '2.5rem', marginRight: '1rem' }}>✅</div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Completed</h3>
              <p style={{ margin: 0, opacity: 0.9 }}>Offices that have submitted</p>
            </div>
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 'bold', textAlign: 'center' }}>
            {summary.completedCount}
          </div>
          <div style={{ textAlign: 'center', opacity: 0.9, fontSize: '0.9rem' }}>
            {summary.completedCount === 1 ? 'office submitted' : 'offices submitted'}
          </div>
          {expandedCard === 'completed' && (
            <div style={{ 
              marginTop: '1rem', 
              fontSize: '0.8rem', 
              opacity: 0.8,
              textAlign: 'center'
            }}>
              Click to view details
            </div>
          )}
        </div>

        {/* Pending Card */}
        <div
          style={{
            flex: 1,
            background: 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)',
            color: 'white',
            padding: '2rem',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: expandedCard === 'pending' 
              ? '0 8px 25px rgba(255, 193, 7, 0.3)' 
              : '0 4px 15px rgba(255, 193, 7, 0.2)'
          }}
          onClick={() => handleCardClick('pending')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '2.5rem', marginRight: '1rem' }}>⏳</div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Not Completed</h3>
              <p style={{ margin: 0, opacity: 0.9 }}>Offices pending submission</p>
            </div>
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 'bold', textAlign: 'center' }}>
            {summary.pendingCount}
          </div>
          <div style={{ textAlign: 'center', opacity: 0.9, fontSize: '0.9rem' }}>
            {summary.pendingCount === 1 ? 'office pending' : 'offices pending'}
          </div>
          {expandedCard === 'pending' && (
            <div style={{ 
              marginTop: '1rem', 
              fontSize: '0.8rem', 
              opacity: 0.8,
              textAlign: 'center'
            }}>
              Click to view details
            </div>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expandedCard && (
        <div style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '1.5rem',
            backgroundColor: expandedCard === 'completed' ? '#28a745' : '#ffc107',
            color: 'white'
          }}>
            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
              {expandedCard === 'completed' ? '✅ Completed Submissions' : '⏳ Pending Submissions'}
              <button
                style={{
                  marginLeft: 'auto',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                onClick={() => setExpandedCard(null)}
              >
                ✕
              </button>
            </h4>
          </div>
          
          <div style={{ padding: '1.5rem' }}>
            {expandedCard === 'completed' ? (
              <CompletedSubmissionsDetails 
                submissions={submissions}
                completedOffices={summary.completedOffices}
                formatDate={formatDate}
              />
            ) : (
              <PendingSubmissionsDetails 
                pendingOffices={summary.pendingOffices}
                formIdentifier={filters.formIdentifier}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Component for showing completed submission details
const CompletedSubmissionsDetails: React.FC<{
  submissions: FormSubmissionWithUserData[];
  completedOffices: string[];
  formatDate: (dateString: string) => { date: string; time: string };
}> = ({ submissions, completedOffices, formatDate }) => {

  const getSubmissionsForOffice = (officeName: string) => {
    return submissions.filter(submission => {
      if (submission.submission_data) {
        for (const [key, value] of Object.entries(submission.submission_data)) {
          if (typeof value === 'string' && value.trim() === officeName) {
            return true;
          }
        }
      }
      return submission.user_office === officeName;
    });
  };

  return (
    <div>
      <div style={{ marginBottom: '1rem', color: '#666' }}>
        {completedOffices.length} offices have submitted their reports
      </div>

      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {completedOffices.map((office, index) => {
          const officeSubmissions = getSubmissionsForOffice(office);
          const latestSubmission = officeSubmissions.sort((a, b) =>
            new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
          )[0];

          return (
            <div key={index} style={{
              padding: '1rem',
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              marginBottom: '0.5rem',
              backgroundColor: '#f8f9fa'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <h6 style={{ margin: '0 0 0.5rem 0', color: '#28a745', fontWeight: 'bold' }}>
                    {office}
                  </h6>
                  {latestSubmission && (
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                      <div>
                        <strong>Latest submission:</strong> {formatDate(latestSubmission.submitted_at).date} at {formatDate(latestSubmission.submitted_at).time}
                      </div>
                      <div>
                        <strong>Employee:</strong> {latestSubmission.user_name || latestSubmission.employee_id || 'Unknown'}
                      </div>
                      {officeSubmissions.length > 1 && (
                        <div style={{ color: '#007bff' }}>
                          +{officeSubmissions.length - 1} more submission{officeSubmissions.length > 2 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}>
                  ✓ COMPLETED
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Component for showing pending submission details
const PendingSubmissionsDetails: React.FC<{
  pendingOffices: string[];
  formIdentifier?: string;
}> = ({ pendingOffices, formIdentifier }) => {

  if (pendingOffices.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#28a745', padding: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h5>All offices have submitted!</h5>
        <p>Every target office has completed their submission for this form.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1rem', color: '#666' }}>
        {pendingOffices.length} offices haven't submitted yet
        {formIdentifier && (
          <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Form: <strong>{formIdentifier}</strong>
          </div>
        )}
      </div>

      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {pendingOffices.map((office, index) => (
          <div key={index} style={{
            padding: '1rem',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            marginBottom: '0.5rem',
            backgroundColor: '#fff3cd'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h6 style={{ margin: '0 0 0.25rem 0', color: '#856404', fontWeight: 'bold' }}>
                  {office}
                </h6>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  Awaiting submission
                </div>
              </div>
              <div style={{
                backgroundColor: '#ffc107',
                color: '#212529',
                padding: '0.25rem 0.5rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }}>
                ⏳ PENDING
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubmissionsSummaryCards;
