import React, { useState, useEffect } from 'react';
import { FormSubmissionWithUserData } from '../../services/reportsService';
import FormConfigService from '../../services/formConfigService';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface DynamicReportsTableProps {
  submissions: FormSubmissionWithUserData[];
  loading: boolean;
  onRefresh: () => void;
  isAdmin?: boolean;
}

interface TableColumn {
  key: string;
  label: string;
  type: 'form_type' | 'date' | 'field';
}

const DynamicReportsTable: React.FC<DynamicReportsTableProps> = ({
  submissions,
  loading,
  onRefresh,
  isAdmin = false
}) => {
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [processedData, setProcessedData] = useState<Array<Record<string, any>>>([]);
  const [loadingColumns, setLoadingColumns] = useState(true);
  const [editingSubmission, setEditingSubmission] = useState<FormSubmissionWithUserData | null>(null);
  const [editedData, setEditedData] = useState<Record<string, any>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Helper function to check if a value is numeric
  const isNumericValue = (value: any): boolean => {
    if (value === null || value === undefined || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && isFinite(num);
  };

  // Helper function to parse numeric value
  const parseNumericValue = (value: any): number => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Helper function to determine if a column is numeric
  const isNumericColumn = (columnKey: string, rows: Array<Record<string, any>>): boolean => {
    let hasNumericValue = false;
    let hasNonNumericValue = false;

    for (const row of rows) {
      const value = row[columnKey];
      if (value !== null && value !== undefined && value !== '') {
        if (isNumericValue(value)) {
          hasNumericValue = true;
        } else {
          hasNonNumericValue = true;
        }
      }
    }

    // Only treat as numeric if there are numeric values and no conflicting non-numeric values
    return hasNumericValue && !hasNonNumericValue;
  };

  // Handle edit button click
  const handleEditClick = (submissionId: string) => {
    const submission = submissions.find(s => s.id === submissionId);
    if (submission) {
      setEditingSubmission(submission);
      setEditedData({ ...submission.submission_data });
      setEditError(null);
    }
  };

  // Handle save edited submission
  const handleSaveEdit = async () => {
    if (!editingSubmission) return;

    setSavingEdit(true);
    setEditError(null);

    try {
      const docRef = doc(db, 'form_submissions', editingSubmission.id);
      await updateDoc(docRef, {
        submissionData: editedData,
        updatedAt: new Date().toISOString()
      });

      setEditingSubmission(null);
      setEditedData({});

      // Refresh parent data to reflect the update
      onRefresh();
    } catch (error) {
      console.error('Error updating submission:', error);
      setEditError('Failed to save changes. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle input change in edit modal
  const handleEditInputChange = (key: string, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Row selection handlers (admin only)
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(processedData.map(row => row.id as string));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleDeleteSelected = async () => {
    if (!isAdmin || selectedIds.size === 0) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedIds.size} selected submission(s)? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      const deletePromises = Array.from(selectedIds).map(id =>
        deleteDoc(doc(db, 'form_submissions', id))
      );
      await Promise.all(deletePromises);
      setSelectedIds(new Set());
      onRefresh();
    } catch (error) {
      console.error('Error deleting submissions:', error);
      setDeleteError('Failed to delete selected submissions. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Calculate aggregate values for a column
  const calculateColumnAggregate = (columnKey: string, rows: Array<Record<string, any>>): {
    sum: number;
    average: number;
    count: number;
    isNumeric: boolean;
  } => {
    const numericValues: number[] = [];
    let nonNullCount = 0;

    for (const row of rows) {
      const value = row[columnKey];
      if (value !== null && value !== undefined && value !== '') {
        nonNullCount++;
        if (isNumericValue(value)) {
          numericValues.push(parseNumericValue(value));
        }
      }
    }

    const isNumeric = isNumericColumn(columnKey, rows);
    const sum = numericValues.reduce((acc, val) => acc + val, 0);
    const average = numericValues.length > 0 ? sum / numericValues.length : 0;

    return {
      sum,
      average,
      count: nonNullCount,
      isNumeric
    };
  };

  useEffect(() => {
    buildDynamicColumns();
  }, [submissions]);

  // Clear selection when data changes to avoid stale selected IDs
  useEffect(() => {
    setSelectedIds(new Set());
  }, [submissions]);

  const buildDynamicColumns = async () => {
    if (submissions.length === 0) {
      setColumns([]);
      setProcessedData([]);
      setLoadingColumns(false);
      return;
    }

    setLoadingColumns(true);
    console.log('🏗️ Building dynamic columns for submissions:', submissions.length);

    try {
      // Get all unique form identifiers
      const formIdentifiers = Array.from(new Set(submissions.map(s => s.form_identifier)));
      console.log('📋 Unique form identifiers:', formIdentifiers);

      // Get all field mappings for all forms
      const allFieldMappings = new Map<string, Map<string, string>>();
      for (const formId of formIdentifiers) {
        const mapping = await FormConfigService.getFieldMapping(formId);
        allFieldMappings.set(formId, mapping);
      }

      // Collect all unique field labels across all forms
      const allFieldLabels = new Set<string>();
      allFieldMappings.forEach(mapping => {
        mapping.forEach(label => allFieldLabels.add(label));
      });

      console.log('🏷️ All field labels found:', Array.from(allFieldLabels));

      // Build column structure
      const newColumns: TableColumn[] = [
        { key: 'form_type', label: 'Form Type', type: 'form_type' },
        { key: 'submitted_at', label: 'Submitted', type: 'date' }
      ];

      // Add dynamic field columns
      Array.from(allFieldLabels).forEach(label => {
        newColumns.push({
          key: label,
          label: label,
          type: 'field' as const
        });
      });

      setColumns(newColumns);

      // Process submission data
      const processedSubmissions = await Promise.all(
        submissions.map(async (submission) => {
          const formMapping = allFieldMappings.get(submission.form_identifier) || new Map();
          const convertedData = await FormConfigService.convertSubmissionData(
            submission.form_identifier,
            submission.submission_data
          );

          // Debug logging to see what employee_id we're getting
          console.log(`🔍 Submission ${submission.id}:`, {
            employee_id: submission.employee_id,
            user_id: submission.user_id,
            form_identifier: submission.form_identifier,
            submission_data_keys: Object.keys(submission.submission_data)
          });

          const row: Record<string, any> = {
            id: submission.id,
            form_type: getFormTypeDisplay(submission.form_identifier),
            submitted_at: formatDate(submission.submitted_at)
          };

          // Add field values using converted labels
          Object.entries(convertedData).forEach(([label, value]) => {
            // Skip the fields we're already handling separately
            if (label !== 'officeName' && !isUserNameField(label)) {
              row[label] = formatFieldValue(value);
            }
          });

          return row;
        })
      );

      setProcessedData(processedSubmissions);
      console.log('✅ Dynamic table built successfully');

    } catch (error) {
      console.error('❌ Error building dynamic columns:', error);
    } finally {
      setLoadingColumns(false);
    }
  };

  const getFormTypeDisplay = (formIdentifier: string): string => {
    const formTypes: Record<string, string> = {
      'employee-registration': 'Employee Registration',
      'leave-request': 'Leave Request',
      'expense-report': 'Expense Report',
      'performance-review': 'Performance Review',
      'it-support-request': 'IT Support Request',
      'training-registration': 'Training Registration',
      'feedback-form': 'Feedback Form',
      'inventory-request': 'Inventory Request',
      'test': 'Test Form'
    };
    return formTypes[formIdentifier] || formIdentifier.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getUserDisplayName = (submission: FormSubmissionWithUserData): string => {
    // Try to extract name from submission data first
    const data = submission.submission_data;
    const entries = Object.entries(data);
    
    for (const [key, value] of entries) {
      if (typeof value === 'string' && value.length > 2 && value.length < 50) {
        if (value.includes('T') && value.includes(':')) continue;
        if (!isNaN(Number(value))) continue;
        if (key === 'officeName') continue;
        if (value.includes(' BO') || value.includes(' SO') || value.includes(' RO') || 
            value.includes(' HO') || value.includes(' DO') || value.includes('Office')) continue;
        
        return value;
      }
    }
    
    const formType = getFormTypeDisplay(submission.form_identifier);
    return submission.user_id ? `${formType} User ${submission.user_id.substring(0, 8)}` : `${formType} Submitter`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const formatFieldValue = (value: any): string => {
    if (value === null || value === undefined) return '';

    if (typeof value === 'string' && value.includes('T') && value.includes(':')) {
      try {
        const date = new Date(value);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } catch (e) {
        return value;
      }
    }

    return String(value);
  };



  const extractActualOfficeName = (convertedData: Record<string, any>): string => {
    // Common field names that contain office names
    const officeNameFields = [
      'Office Name', 'officeName', 'Office', 'office', 'Branch', 'branch',
      'Location', 'location', 'Workplace', 'workplace', 'Department', 'department',
      'Division', 'division', 'Unit', 'unit'
    ];

    // Try to find an office name field
    for (const field of officeNameFields) {
      if (convertedData[field] && typeof convertedData[field] === 'string') {
        const value = convertedData[field].trim();
        if (value.length > 0) {
          return value;
        }
      }
    }

    // Look for values that look like office names (contain BO, SO, RO, etc.)
    for (const [key, value] of Object.entries(convertedData)) {
      if (typeof value === 'string' &&
          (value.includes(' BO') || value.includes(' SO') || value.includes(' RO') ||
           value.includes(' HO') || value.includes(' DO') || value.includes('Office'))) {
        return value;
      }
    }

    return 'Unknown Office';
  };

  const isUserNameField = (fieldName: string): boolean => {
    const userNameFields = [
      'Employee Name', 'employeeName', 'Full Name', 'fullName', 'Name', 'name',
      'First Name', 'firstName', 'Last Name', 'lastName', 'User Name', 'userName',
      'Participant Name', 'participantName', 'Requested By', 'requestedBy',
      'Submitted By', 'submittedBy', 'Applicant Name', 'applicantName'
    ];
    return userNameFields.includes(fieldName);
  };

  const getEmployeeIdFromSubmission = (submission: any): string => {
    // 1. First try the dedicated employee_id column
    if (submission.employee_id && typeof submission.employee_id === 'string' && submission.employee_id.trim()) {
      console.log(`✅ Found employee_id in column: "${submission.employee_id}"`);
      return submission.employee_id.trim();
    }

    // 2. Try to extract from submission_data VALUES (not field IDs)
    const data = submission.submission_data || {};
    console.log(`🔍 Searching in submission_data VALUES:`, data);
    console.log(`🔍 All field values:`, Object.values(data));

    // Look through all field VALUES to find employee IDs
    for (const [fieldId, fieldValue] of Object.entries(data)) {
      if (typeof fieldValue === 'string' && fieldValue.trim().length > 0) {
        const value = fieldValue.trim();

        // Skip dates
        if (value.includes('T') && value.includes(':')) continue;

        // Skip office names
        if (value.includes(' BO') || value.includes(' SO') || value.includes(' RO') ||
            value.includes(' HO') || value.includes(' DO')) continue;

        // Skip very long values (likely not employee IDs)
        if (value.length > 50) continue;

        // Check if it looks like an employee ID pattern
        if (/^(EMP|STAFF|USER|ID)[0-9]{1,6}$/i.test(value)) {
          console.log(`✅ Found employee ID pattern in field "${fieldId}": "${value}"`);
          return value.toUpperCase();
        }

        // Check if it's a short alphanumeric code (likely an employee ID)
        if (/^[A-Z0-9]{3,15}$/i.test(value) && !value.includes(' ')) {
          console.log(`✅ Found potential employee ID in field "${fieldId}": "${value}"`);
          return value.toUpperCase();
        }
      }
    }

    // 3. Try to extract a name and create an ID from it
    for (const [fieldId, fieldValue] of Object.entries(data)) {
      if (typeof fieldValue === 'string' && fieldValue.trim().length > 0) {
        const value = fieldValue.trim();

        // Skip dates and office names
        if (value.includes('T') && value.includes(':')) continue;
        if (value.includes(' BO') || value.includes(' SO') || value.includes(' RO')) continue;

        // If it looks like a person's name (2-4 words, reasonable length)
        const words = value.split(/\s+/);
        if (words.length >= 2 && words.length <= 4 && value.length >= 5 && value.length <= 50) {
          // Check if all words are likely name parts (alphabetic)
          const isLikelyName = words.every(word => /^[A-Za-z]+$/.test(word));
          if (isLikelyName) {
            // Create ID from first name + last name initial
            const firstName = words[0].toUpperCase();
            const lastInitial = words[words.length - 1].charAt(0).toUpperCase();
            const nameId = `${firstName}${lastInitial}`;
            console.log(`✅ Generated employee ID from name "${value}": "${nameId}"`);
            return nameId;
          }
        }
      }
    }

    // 4. Final fallback: Use any reasonable text value as employee ID
    console.log(`⚠️ No specific employee ID found, trying fallback approach...`);
    for (const [fieldId, fieldValue] of Object.entries(data)) {
      if (typeof fieldValue === 'string' && fieldValue.trim().length > 0) {
        const value = fieldValue.trim();

        // Skip obvious non-employee data
        if (value.includes('T') && value.includes(':')) continue; // dates
        if (value.includes('@')) continue; // emails
        if (value.length > 100) continue; // very long text
        if (value.includes(' BO') || value.includes(' SO') || value.includes(' RO')) continue; // office names

        // Use the first reasonable text value we find
        if (value.length >= 2 && value.length <= 50) {
          // If it's a name, create an ID from it
          const words = value.split(/\s+/);
          if (words.length >= 2) {
            const nameId = words.map(word => word.charAt(0).toUpperCase()).join('') +
                          Math.random().toString(36).substring(2, 5).toUpperCase();
            console.log(`✅ Created fallback ID from "${value}": "${nameId}"`);
            return nameId;
          } else {
            // Single word, use as-is with some modification
            const singleId = value.toUpperCase().substring(0, 8) +
                           Math.random().toString(36).substring(2, 4).toUpperCase();
            console.log(`✅ Created fallback ID from single word "${value}": "${singleId}"`);
            return singleId;
          }
        }
      }
    }

    // 5. Absolute final fallback
    const fallbackId = `USER${Date.now().toString().slice(-6)}`;
    console.log(`❌ No usable data found, using absolute fallback: "${fallbackId}"`);
    return fallbackId;
  };

  const extractOfficeNameFromRawData = (rawData: Record<string, any>): string => {
    // Look for office name patterns
    for (const [key, value] of Object.entries(rawData)) {
      if (typeof value === 'string') {
        // Check if it looks like an office name
        if (value.includes(' BO') || value.includes(' SO') || value.includes(' RO') ||
            value.includes(' HO') || value.includes(' DO') || value.includes('Office')) {
          return value;
        }
      }
    }

    return 'Unknown Office';
  };



  if (loadingColumns) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
        <div>🔄 Building dynamic table structure...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
        <div>🔄 Loading submissions...</div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
        <h5>No Submissions Found</h5>
        <p>No form submissions match your current filters.</p>
        <button
          style={{
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
    <div style={{ overflowX: 'auto' }}>
      {isAdmin && selectedIds.size > 0 && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#fff3cd',
          borderBottom: '1px solid #dee2e6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontWeight: '600', color: '#856404' }}>
            {selectedIds.size} row{selectedIds.size === 1 ? '' : 's'} selected
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              style={{
                padding: '0.375rem 0.75rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: deleting ? 'not-allowed' : 'pointer',
                opacity: deleting ? 0.7 : 1
              }}
              onClick={handleDeleteSelected}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : '🗑️ Delete Selected'}
            </button>
            <button
              style={{
                padding: '0.375rem 0.75rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedIds(new Set())}
              disabled={deleting}
            >
              Clear
            </button>
          </div>
        </div>
      )}
      {deleteError && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderBottom: '1px solid #f5c6cb'
        }}>
          ⚠️ {deleteError}
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            {isAdmin && (
              <th
                style={{
                  padding: '1rem 0.75rem',
                  textAlign: 'center',
                  fontWeight: '600',
                  borderBottom: '2px solid #dee2e6',
                  whiteSpace: 'nowrap',
                  width: '50px'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.size === processedData.length && processedData.length > 0}
                  onChange={handleSelectAll}
                  title="Select all rows"
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  padding: '1rem 0.75rem',
                  textAlign: 'left',
                  fontWeight: '600',
                  borderBottom: '2px solid #dee2e6',
                  whiteSpace: 'nowrap',
                  minWidth: column.type === 'field' ? '120px' : 'auto'
                }}
              >
                {column.label}
              </th>
            ))}
            <th
              style={{
                padding: '1rem 0.75rem',
                textAlign: 'left',
                fontWeight: '600',
                borderBottom: '2px solid #dee2e6',
                whiteSpace: 'nowrap'
              }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {processedData.map((row, index) => (
            <tr key={`${row.id}-${index}`} style={{ borderBottom: '1px solid #eee' }}>
              {isAdmin && (
                <td
                  style={{
                    padding: '0.75rem',
                    verticalAlign: 'top',
                    textAlign: 'center',
                    width: '50px'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row.id as string)}
                    onChange={() => handleSelectRow(row.id as string)}
                    title="Select row"
                  />
                </td>
              )}
              {columns.map((column) => (
                <td
                  key={column.key}
                  style={{
                    padding: '0.75rem',
                    verticalAlign: 'top',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {column.type === 'form_type' && (
                    <span style={{
                      backgroundColor: '#e3f2fd',
                      color: '#1976d2',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      {row[column.key]}
                    </span>
                  )}
                  {column.type === 'date' && (
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>
                      <div>{row[column.key]?.date}</div>
                      <small>{row[column.key]?.time}</small>
                    </div>
                  )}
                  {column.type === 'field' && (
                    <span title={row[column.key] || ''}>
                      {row[column.key] || '-'}
                    </span>
                  )}
                </td>
              ))}
              <td
                style={{
                  padding: '0.75rem',
                  verticalAlign: 'top',
                  whiteSpace: 'nowrap'
                }}
              >
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => handleEditClick(row.id)}
                  title="Edit submission"
                >
                  ✏️ Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot style={{ backgroundColor: '#f8f9fa', borderTop: '2px solid #dee2e6' }}>
          <tr style={{ borderTop: '2px solid #dee2e6' }}>
            {isAdmin && (
              <td
                style={{
                  padding: '0.75rem',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  color: '#333',
                  borderTop: '2px solid #dee2e6',
                  width: '50px'
                }}
              />
            )}
            {columns.map((column) => {
              const aggregate = calculateColumnAggregate(column.key, processedData);
              const isFirstColumn = column.type === 'form_type' || column.type === 'date';
              return (
                <td
                  key={`footer-${column.key}`}
                  style={{
                    padding: '0.75rem',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    color: '#333',
                    borderTop: '2px solid #dee2e6',
                    whiteSpace: 'nowrap',
                    minWidth: column.type === 'field' ? '120px' : 'auto'
                  }}
                >
                  {isFirstColumn ? (
                    <span>
                      <strong>Count:</strong> {aggregate.count}
                    </span>
                  ) : aggregate.isNumeric ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span>
                        <strong>Sum:</strong> {aggregate.sum.toLocaleString()}
                      </span>
                      <span>
                        <strong>Avg:</strong> {aggregate.average.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                      <span>
                        <strong>Fill %:</strong> {processedData.length > 0 ? ((aggregate.count / processedData.length) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  ) : (
                    <span>
                      <strong>Count:</strong> {aggregate.count}
                    </span>
                  )}
                </td>
              );
            })}
            <td
              style={{
                padding: '0.75rem',
                fontWeight: '600',
                fontSize: '0.85rem',
                color: '#333',
                borderTop: '2px solid #dee2e6'
              }}
            >
              <strong>Count:</strong> {processedData.length}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Table Footer */}
      <div style={{
        padding: '1rem 1.5rem',
        backgroundColor: '#f8f9fa',
        borderTop: '1px solid #dee2e6',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '0.875rem', color: '#666' }}>
          Showing {submissions.length} submissions across {columns.length - 2} field types
        </div>
        <button
          style={{
            padding: '0.375rem 0.75rem',
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

      {/* Edit Modal */}
      {editingSubmission && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg" style={{ marginTop: '5rem' }}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Submission</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setEditingSubmission(null)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {editError && (
                  <div className="alert alert-danger" role="alert">
                    {editError}
                  </div>
                )}
                <div className="mb-3">
                  <strong>Office:</strong> {editingSubmission.user_office || 'Unknown Office'}
                </div>
                <div className="mb-3">
                  <strong>Submitted by:</strong> {editingSubmission.user_name || 'Unknown'}
                </div>
                <div className="mb-3">
                  <strong>Submission ID:</strong> {editingSubmission.id}
                </div>
                <hr />
                {Object.keys(editedData).length === 0 ? (
                  <div className="alert alert-info">
                    No editable fields found in this submission.
                  </div>
                ) : (
                  Object.entries(editedData).map(([key, value]) => (
                    <div className="mb-3" key={key}>
                      <label className="form-label" htmlFor={`edit-${key}`}>
                        {key}
                      </label>
                      <input
                        id={`edit-${key}`}
                        type="text"
                        className="form-control"
                        value={value === null || value === undefined ? '' : String(value)}
                        onChange={(e) => handleEditInputChange(key, e.target.value)}
                      />
                    </div>
                  ))
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingSubmission(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveEdit}
                  disabled={savingEdit || Object.keys(editedData).length === 0}
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicReportsTable;
