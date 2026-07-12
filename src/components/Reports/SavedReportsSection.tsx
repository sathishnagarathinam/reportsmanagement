import React, { useState, useEffect } from 'react';
import ReportMetadataService, { ReportConfiguration } from '../../services/reportMetadataService';
import ReportsService from '../../services/reportsService';
import './SavedReportsSection.css';

// Helper function to format field IDs to human-readable labels
const formatFieldLabel = (fieldId: string): string => {
  // Check if it's a raw field ID like FIELD_1782892627761
  if (fieldId.startsWith('FIELD_') || /^[A-Z]+_\d+$/.test(fieldId)) {
    // Try to extract a meaningful name or return formatted version
    return fieldId
      .replace(/^FIELD_/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }
  
  // Standard formatting for snake_case or camelCase
  return fieldId
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\s+/, '')
    .replace(/\b\w/g, l => l.toUpperCase());
};

// Get display label for a field key
const getFieldDisplayLabel = (key: string, fields?: { id: string; label: string }[]): string => {
  // First try to find in the report's field configuration
  if (fields) {
    const fieldConfig = fields.find(f => f.id === key);
    if (fieldConfig?.label) {
      return fieldConfig.label;
    }
  }
  
  // Fall back to formatting the key
  return formatFieldLabel(key);
};

interface SavedReportsSectionProps {
  userId: string;
}

const SavedReportsSection: React.FC<SavedReportsSectionProps> = ({ userId }) => {
  const [savedReports, setSavedReports] = useState<ReportConfiguration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingReportId, setGeneratingReportId] = useState<string | null>(null);
  const [generatedData, setGeneratedData] = useState<any[] | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportConfiguration | null>(null);

  useEffect(() => {
    if (userId) {
      loadSavedReports();
    }
  }, [userId]);

  const loadSavedReports = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('📋 SavedReportsSection - Loading reports for userId:', userId);
      const reports = await ReportMetadataService.getUserConfigurations(userId);
      console.log('📋 SavedReportsSection - Loaded reports:', reports.map(r => ({
        id: r.id,
        name: r.name,
        aggregations: r.aggregations,
        aggregationsLength: r.aggregations?.length,
        arithmeticOperations: r.arithmeticOperations,
        arithmeticOperationsLength: r.arithmeticOperations?.length
      })));
      setSavedReports(reports);
    } catch (err: any) {
      console.error('Failed to load saved reports:', err);
      const errorMessage = err?.message || 'Failed to load saved reports';
      setError(`${errorMessage} - Please check console for details`);
    } finally {
      setLoading(false);
    }
  };

  // Export functions
  const exportToCSV = (data: any[]) => {
    if (!data || data.length === 0) return;
    
    // Get the report configuration for field labels
    const reportStr = localStorage.getItem('last_generated_report');
    const report = reportStr ? JSON.parse(reportStr) : null;
    
    const headers = Object.keys(data[0]);
    const headerLabels = headers.map(key => getFieldDisplayLabel(key, report?.fields));
    
    const csvContent = [
      headerLabels.join(','),
      ...data.map(row => headers.map(h => {
        const val = row[h];
        // Escape values containing commas or quotes
        const strVal = String(val ?? '');
        if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToExcel = (data: any[]) => {
    // For now, CSV works as a universal format that opens in Excel
    // In a production app, you would use a library like xlsx
    exportToCSV(data);
    alert('Report downloaded as CSV (opens in Excel)');
  };

  const exportToPDF = (data: any[]) => {
    // Get the report configuration for field labels
    const reportStr = localStorage.getItem('last_generated_report');
    const report = reportStr ? JSON.parse(reportStr) : null;
    
    // Simple PDF generation using window.print()
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export PDF');
      return;
    }
    
    const headers = Object.keys(data[0]);
    const headerLabels = headers.map(key => getFieldDisplayLabel(key, report?.fields));
    
    const html = `
      <html>
        <head>
          <title>Report Export</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            h1 { color: #333; }
            .meta { color: #666; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Report Export</h1>
          <p class="meta">Generated on: ${new Date().toLocaleString()}</p>
          <p class="meta">Total Records: ${data.length}</p>
          <table>
            <thead>
              <tr>${headerLabels.map(h => `<th>${h}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${data.map(row => `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Auto-trigger print dialog after a brief delay to allow content to render
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleGenerateReport = async (report: ReportConfiguration) => {
    setGeneratingReportId(report.id);
    setError(null);
    setSelectedReport(report);
    
    // Store the report in localStorage for the exports to use
    localStorage.setItem('last_generated_report', JSON.stringify(report));
    
    try {
      // Build filters from report configuration
      const filters: any = {
        limit: 1000,
        offset: 0
      };

      if (report.formIdentifiers && report.formIdentifiers.length === 1) {
        filters.formIdentifier = report.formIdentifiers[0];
      }

      // Apply saved filters
      report.filters?.forEach(filter => {
        if (filter.fieldId === 'form_identifier' && filter.operator === 'equals') {
          filters.formIdentifier = filter.value;
        }
        if (filter.fieldId === 'user_office' && filter.operator === 'equals') {
          filters.officeName = filter.value;
        }
      });

      let submissions = await ReportsService.getFormSubmissions(filters);
      
      // Apply arithmetic operations if configured
      if (report.arithmeticOperations && report.arithmeticOperations.length > 0) {
        submissions = applyArithmeticOperations(submissions, report.arithmeticOperations);
      }
      
      // Apply aggregations if configured
      let processedData = submissions;
      if (report.groupBy && report.aggregations && report.aggregations.length > 0) {
        processedData = applyAggregations(submissions, report.groupBy, report.aggregations);
      }
      
      // Filter to only selected fields if specified
      if (report.fields && report.fields.length > 0) {
        processedData = processedData.map((row: any) => {
          const filteredRow: any = {};
          report.fields?.forEach(field => {
            const fieldId = field.id;
            // Try to get value from various sources
            filteredRow[fieldId] = row[fieldId] ?? row.submission_data?.[fieldId] ?? '-';
          });
          
          // Include arithmetic operation result fields
          report.arithmeticOperations?.forEach(op => {
            filteredRow[op.resultFieldName] = row[op.resultFieldName] ?? row.submission_data?.[op.resultFieldName] ?? '-';
          });
          
          return filteredRow;
        });
      }
      
      setGeneratedData(processedData);
      
      // Scroll to results
      setTimeout(() => {
        const resultsElement = document.getElementById('report-results');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      
    } catch (err) {
      console.error('Failed to generate report:', err);
      setError('Failed to generate report');
    } finally {
      setGeneratingReportId(null);
    }
  };

  const applyAggregations = (data: any[], groupByField: string, aggregations: any[]) => {
    const grouped = data.reduce((acc, item) => {
      const groupKey = item[groupByField] || item.submission_data?.[groupByField] || 'Unknown';
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(item);
      return acc;
    }, {});

    return Object.entries(grouped).map(([groupKey, items]: [string, any]) => {
      const result: any = {
        [groupByField]: groupKey,
        count: items.length
      };

      aggregations.forEach(agg => {
        const fieldId = agg.fieldId;
        const values = items.map((item: any) => {
          const val = item[fieldId] || item.submission_data?.[fieldId];
          return parseFloat(val) || 0;
        }).filter((v: number) => !isNaN(v));

        switch (agg.type) {
          case 'sum':
            result[`${fieldId}_sum`] = values.reduce((a: number, b: number) => a + b, 0);
            break;
          case 'avg':
            result[`${fieldId}_avg`] = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
            break;
          case 'min':
            result[`${fieldId}_min`] = values.length > 0 ? Math.min(...values) : 0;
            break;
          case 'max':
            result[`${fieldId}_max`] = values.length > 0 ? Math.max(...values) : 0;
            break;
          case 'count':
            result[`${fieldId}_count`] = values.length;
            break;
        }
      });

      return result;
    });
  };

  const applyArithmeticOperations = (data: any[], operations: any[]) => {
    return data.map(item => {
      const newItem = { ...item, submission_data: { ...item.submission_data } };
      
      operations.forEach(op => {
        let result = 0;
        
        switch (op.operation) {
          case 'add': {
            const val1 = parseFloat(item.submission_data?.[op.fieldId1] || item[op.fieldId1]) || 0;
            const val2 = parseFloat(item.submission_data?.[op.fieldId2] || item[op.fieldId2]) || 0;
            result = val1 + val2;
            break;
          }
          case 'subtract': {
            const val1 = parseFloat(item.submission_data?.[op.fieldId1] || item[op.fieldId1]) || 0;
            const val2 = parseFloat(item.submission_data?.[op.fieldId2] || item[op.fieldId2]) || 0;
            result = val1 - val2;
            break;
          }
          case 'multiply': {
            const val1 = parseFloat(item.submission_data?.[op.fieldId1] || item[op.fieldId1]) || 0;
            const val2 = parseFloat(item.submission_data?.[op.fieldId2] || item[op.fieldId2]) || 0;
            result = val1 * val2;
            break;
          }
          case 'divide': {
            const val1 = parseFloat(item.submission_data?.[op.fieldId1] || item[op.fieldId1]) || 0;
            const val2 = parseFloat(item.submission_data?.[op.fieldId2] || item[op.fieldId2]) || 0;
            result = val2 !== 0 ? val1 / val2 : 0;
            break;
          }
          case 'sum': {
            // Sum multiple fields - fieldId1 contains comma-separated field IDs
            const fieldIds = op.fieldId1.split(',').map((id: string) => id.trim());
            result = fieldIds.reduce((sum: number, fieldId: string) => {
              const val = parseFloat(item.submission_data?.[fieldId] || item[fieldId]) || 0;
              return sum + val;
            }, 0);
            break;
          }
          case 'custom': {
            // Custom formula calculation
            if (op.customFormula) {
              try {
                // Replace field references [fieldName] with actual values
                const formula = op.customFormula.replace(/\[([^\]]+)\]/g, (match: string, fieldName: string) => {
                  const value = parseFloat(item.submission_data?.[fieldName] || item[fieldName]) || 0;
                  return value.toString();
                });
                // Safely evaluate the formula
                result = Function('"use strict"; return (' + formula + ')')();
              } catch (e) {
                console.error('Error evaluating custom formula:', e);
                result = 0;
              }
            }
            break;
          }
        }
        
        // Add the computed value to the item
        newItem.submission_data[op.resultFieldName] = result;
        newItem[op.resultFieldName] = result;
      });
      
      return newItem;
    });
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    
    try {
      await ReportMetadataService.deleteConfiguration(reportId);
      setSavedReports(prev => prev.filter(r => r.id !== reportId));
      if (generatedData) setGeneratedData(null);
    } catch (err) {
      console.error('Failed to delete report:', err);
      setError('Failed to delete report');
    }
  };

  if (loading) {
    return (
      <div className="saved-reports-section">
        <h3>📁 Saved Reports</h3>
        <div className="loading-state">Loading saved reports...</div>
      </div>
    );
  }

  if (savedReports.length === 0) {
    return (
      <div className="saved-reports-section">
        <h3>📁 Saved Reports</h3>
        <div className="no-reports-message">
          <p>No saved reports yet.</p>
          <p className="hint">Create a report using the Report Builder above and save it for quick access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="saved-reports-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>📁 Saved Reports</h3>
        <button 
          onClick={loadSavedReports} 
          disabled={loading}
          className="btn btn-secondary"
          style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
        >
          {loading ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
      </div>
      {error && (
        <div className="error-message" style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8d7da', color: '#721c24', borderRadius: '4px' }}>
          <strong>Error:</strong> {error}
          <br />
          <small>Check browser console (F12) for detailed error logs</small>
        </div>
      )}
      
      <div className="saved-reports-grid">
        {savedReports.map(report => (
          <div key={report.id} className="saved-report-card">
            <div className="saved-report-header">
              <h4>{report.name}</h4>
              <button 
                className="delete-btn"
                onClick={() => handleDeleteReport(report.id)}
                title="Delete report"
              >
                🗑️
              </button>
            </div>
            
            {report.description && (
              <p className="saved-report-description">{report.description}</p>
            )}
            
            <div className="saved-report-meta">
              <span>📋 {report.formIdentifiers?.length || 0} forms</span>
              <span>📊 {report.fields?.length || 0} fields</span>
              {report.aggregations && report.aggregations.length > 0 && (
                <span>🔢 {report.aggregations.length} aggregations</span>
              )}
            </div>
            
            <div className="saved-report-footer">
              <span className="saved-date">
                Saved: {new Date(report.updatedAt).toLocaleDateString()}
              </span>
              <button
                className="generate-btn"
                onClick={() => handleGenerateReport(report)}
                disabled={generatingReportId === report.id}
              >
                {generatingReportId === report.id ? '⏳ Generating...' : '📊 Generate Report'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Generated Results Section */}
      {generatedData && generatedData.length > 0 && (
        <div id="report-results" className="generated-results">
          <h4>📈 Generated Report Results ({generatedData.length} rows)</h4>
          
          {/* Export Buttons */}
          <div className="export-buttons">
            <button className="btn btn-export excel" onClick={() => exportToExcel(generatedData)}>
              📊 Excel
            </button>
            <button className="btn btn-export csv" onClick={() => exportToCSV(generatedData)}>
              📄 CSV
            </button>
            <button className="btn btn-export pdf" onClick={() => exportToPDF(generatedData)}>
              📕 PDF
            </button>
          </div>
          
          <div className="results-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  {Object.keys(generatedData[0]).map(key => {
                    // Check if this is an arithmetic result column
                    const isArithmeticResult = selectedReport?.arithmeticOperations?.some(
                      op => op.resultFieldName === key
                    );
                    // Use the helper function to get human-readable label
                    const displayLabel = getFieldDisplayLabel(key, selectedReport?.fields);
                    return (
                      <th 
                        key={key} 
                        className={isArithmeticResult ? 'arithmetic-result-header' : ''}
                        title={isArithmeticResult ? 'Calculated field' : undefined}
                      >
                        {displayLabel}
                        {isArithmeticResult && <span className="arithmetic-badge">🧮</span>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {generatedData.slice(0, 50).map((row, idx) => (
                  <tr key={idx}>
                    {Object.entries(row).map(([key, val], i) => {
                      // Check if this column is an arithmetic result
                      const isArithmeticResult = selectedReport?.arithmeticOperations?.some(
                        op => op.resultFieldName === key
                      );
                      
                      // Format values nicely
                      let displayValue = String(val);
                      if (val === null || val === undefined || val === '') {
                        displayValue = '-';
                      } else if (typeof val === 'number') {
                        displayValue = val.toLocaleString();
                      }
                      return (
                        <td 
                          key={i} 
                          className={isArithmeticResult ? 'arithmetic-result-cell' : ''}
                          title={isArithmeticResult ? 'Calculated field' : undefined}
                        >
                          {displayValue}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {generatedData.length > 50 && (
            <p className="results-more">... and {generatedData.length - 50} more rows</p>
          )}
          <button 
            className="btn btn-secondary"
            onClick={() => setGeneratedData(null)}
          >
            Clear Results
          </button>
        </div>
      )}
    </div>
  );
};

export default SavedReportsSection;