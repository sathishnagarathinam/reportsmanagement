import React, { useState, useEffect, useRef } from 'react';
import ReportMetadataService, {
  ReportConfiguration,
  ReportField,
  ReportFilterConfig,
  REPORT_TEMPLATES
} from '../../services/reportMetadataService';
import ReportsService, { FormSubmissionWithUserData } from '../../services/reportsService';
import { evaluateArithmeticOperation, formatArithmeticOperation } from '../../utils/reportArithmetic';
import './ReportBuilder.css';

interface ReportBuilderProps {
  userId: string;
  onReportGenerated?: (data: any[], config: ReportConfiguration) => void;
}

const ReportBuilder: React.FC<ReportBuilderProps> = ({ userId, onReportGenerated }) => {
  // State for report configuration
  const [config, setConfig] = useState<Partial<ReportConfiguration>>({
    name: '',
    description: '',
    formIdentifiers: [],
    fields: [],
    filters: [],
    columns: [],
    sortBy: [],
    groupBy: undefined,
    aggregations: [],
    arithmeticOperations: []
  });

  // Ref to always access latest config (fixes stale closure issues)
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // UI State
  const [step, setStep] = useState<'template' | 'forms' | 'fields' | 'filters' | 'pivot' | 'preview'>('template');
  const [availableForms, setAvailableForms] = useState<string[]>([]);
  const [discoveredFields, setDiscoveredFields] = useState<ReportField[]>([]);
  const [savedReports, setSavedReports] = useState<ReportConfiguration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<FormSubmissionWithUserData[]>([]);

  // Load initial data
  useEffect(() => {
    loadAvailableForms();
  }, []);

  // Load saved reports when userId is available
  useEffect(() => {
    if (userId) {
      loadSavedReports();
    }
  }, [userId]);

  // Discover fields when forms are selected
  useEffect(() => {
    if (config.formIdentifiers && config.formIdentifiers.length > 0) {
      discoverFields(config.formIdentifiers);
    }
  }, [config.formIdentifiers]);

  const loadAvailableForms = async () => {
    try {
      const identifiers = await ReportsService.getFormIdentifiers();
      setAvailableForms(identifiers);
    } catch (err) {
      console.error('Failed to load form identifiers:', err);
      setError('Failed to load available forms');
    }
  };

  const loadSavedReports = async () => {
    try {
      const reports = await ReportMetadataService.getUserConfigurations(userId);
      setSavedReports(reports);
    } catch (err) {
      console.error('Failed to load saved reports:', err);
    }
  };

  const discoverFields = async (formIds: string[]) => {
    setLoading(true);
    try {
      const fields = await ReportMetadataService.discoverFields(formIds);
      setDiscoveredFields(fields);
      // Auto-select default fields
      if (config.fields?.length === 0) {
        const defaultFields = fields.filter(f => 
          ['form_identifier', 'user_office', 'submitted_at'].includes(f.id)
        );
        updateConfig('fields', defaultFields);
      }
    } catch (err) {
      console.error('Failed to discover fields:', err);
      setError('Failed to discover available fields');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (key: keyof ReportConfiguration, value: any) => {
    console.log('⚙️ updateConfig called:', { key, value });
    setConfig(prev => {
      const newConfig = { ...prev, [key]: value };
      console.log('⚙️ Config updated:', { 
        key, 
        newValue: value, 
        aggregations: newConfig.aggregations,
        aggregationsLength: newConfig.aggregations?.length,
        fullConfigKeys: Object.keys(newConfig)
      });
      return newConfig;
    });
  };

  const handleSelectTemplate = (template: Partial<ReportConfiguration>) => {
    // Convert field-level aggregation property to aggregations array format
    const aggregationsFromFields = template.fields
      ?.filter((f: any) => f.aggregation && f.aggregation !== 'none')
      .map((f: any) => ({
        fieldId: f.id,
        type: f.aggregation as 'sum' | 'avg' | 'count' | 'min' | 'max'
      })) || [];

    console.log('Template aggregations conversion:', {
      templateFields: template.fields,
      aggregationsFromFields,
      templateAggregations: template.aggregations
    });

    setConfig(prev => ({
      ...prev,
      name: template.name || '',
      description: template.description,
      fields: template.fields || [],
      groupBy: template.groupBy,
      aggregations: template.aggregations || aggregationsFromFields,
      arithmeticOperations: template.arithmeticOperations || []
    }));
    setStep('forms');
  };

  const handleFormSelection = (formId: string, checked: boolean) => {
    const current = config.formIdentifiers || [];
    if (checked) {
      updateConfig('formIdentifiers', [...current, formId]);
    } else {
      updateConfig('formIdentifiers', current.filter(id => id !== formId));
    }
  };

  const handleFieldToggle = (field: ReportField, checked: boolean) => {
    const current = config.fields || [];
    if (checked) {
      updateConfig('fields', [...current, field]);
    } else {
      updateConfig('fields', current.filter(f => f.id !== field.id));
    }
  };

  const handleAddFilter = (filter: ReportFilterConfig) => {
    const current = config.filters || [];
    updateConfig('filters', [...current, filter]);
  };

  const handleRemoveFilter = (filterId: string) => {
    const current = config.filters || [];
    updateConfig('filters', current.filter(f => f.id !== filterId));
  };

  const handleGeneratePreview = async () => {
    setLoading(true);
    try {
      const filters: any = {
        limit: 100,
        offset: 0
      };

      if (config.formIdentifiers && config.formIdentifiers.length === 1) {
        filters.formIdentifier = config.formIdentifiers[0];
      }

      // Apply custom filters
      config.filters?.forEach(filter => {
        if (filter.fieldId === 'form_identifier' && filter.operator === 'equals') {
          filters.formIdentifier = filter.value;
        }
        if (filter.fieldId === 'user_office' && filter.operator === 'equals') {
          filters.officeName = filter.value;
        }
      });

      const submissions = await ReportsService.getFormSubmissions(filters);
      
      // Apply arithmetic operations to calculate result fields
      const processedSubmissions = submissions.map(row => {
        const processedRow = { ...row };
        
        // Process each arithmetic operation
        config.arithmeticOperations?.forEach(op => {
          const result = evaluateArithmeticOperation(processedRow as any, op, config.fields || []);
          
          // Store the result in the row
          (processedRow as any)[op.resultFieldName] = result;
          
          // Also store in submission_data if it exists
          if ((processedRow as any).submission_data) {
            (processedRow as any).submission_data[op.resultFieldName] = result;
          }
        });
        
        return processedRow;
      });
      
      setPreviewData(processedSubmissions);
      
      if (onReportGenerated) {
        onReportGenerated(processedSubmissions, config as ReportConfiguration);
      }
    } catch (err) {
      console.error('Failed to generate preview:', err);
      setError('Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReport = async () => {
    // Read the ACTUAL current state from React's state
    let currentConfigSnapshot: Partial<ReportConfiguration> | null = null;
    
    // Use functional update to read state without changing it
    await new Promise<void>(resolve => {
      setConfig(prev => {
        currentConfigSnapshot = { ...prev };
        console.log('🔄 SNAPSHOT - Current config state:', {
          aggregations: prev.aggregations,
          aggregationsLength: prev.aggregations?.length
        });
        resolve();
        return prev; // Don't change state
      });
    });
    
    const latestConfig = currentConfigSnapshot!;
    
    if (!latestConfig.name) {
      setError('Please provide a report name');
      return;
    }

    console.log('📝 handleSaveReport - Using SNAPSHOT config:', {
      name: latestConfig.name,
      aggregations: latestConfig.aggregations,
      aggregationsLength: latestConfig.aggregations?.length,
      arithmeticOperations: latestConfig.arithmeticOperations
    });

    const configToSave = {
      ...latestConfig,
      aggregations: latestConfig.aggregations || [],
      arithmeticOperations: latestConfig.arithmeticOperations || []
    };

    setLoading(true);
    try {
      const reportConfig = await ReportMetadataService.createConfiguration({
        ...configToSave as ReportConfiguration,
        createdBy: userId
      });

      console.log('✅ handleSaveReport - Saved:', {
        id: reportConfig.id,
        aggregations: reportConfig.aggregations,
        aggregationsLength: reportConfig.aggregations?.length
      });

      setSavedReports(prev => [reportConfig, ...prev]);
      setError(null);
      alert('Report saved successfully!');
    } catch (err) {
      console.error('❌ Failed to save report:', err);
      setError('Failed to save report');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadReport = (report: ReportConfiguration) => {
    // Ensure aggregations and arithmeticOperations are always arrays
    const normalizedReport = {
      ...report,
      aggregations: report.aggregations || [],
      arithmeticOperations: report.arithmeticOperations || []
    };

    console.log('📂 handleLoadReport - Loading report:', {
      id: normalizedReport.id,
      name: normalizedReport.name,
      aggregations: normalizedReport.aggregations,
      aggregationsLength: normalizedReport.aggregations?.length,
      arithmeticOperations: normalizedReport.arithmeticOperations,
      arithmeticOperationsLength: normalizedReport.arithmeticOperations?.length
    });

    setConfig(normalizedReport);
    setStep('preview');
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    
    try {
      await ReportMetadataService.deleteConfiguration(reportId);
      setSavedReports(prev => prev.filter(r => r.id !== reportId));
    } catch (err) {
      console.error('Failed to delete report:', err);
      setError('Failed to delete report');
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 'template':
        return (
          <div className="report-builder-step">
            <h3>Choose a Starting Point</h3>
            <div className="template-grid">
              <div 
                className="template-card blank"
                onClick={() => setStep('forms')}
              >
                <div className="template-icon">+</div>
                <h4>Start from Scratch</h4>
                <p>Build a custom report from the ground up</p>
              </div>
              {REPORT_TEMPLATES.map((template, idx) => (
                <div 
                  key={idx}
                  className="template-card"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <div className="template-icon">📊</div>
                  <h4>{template.name}</h4>
                  <p>{template.description}</p>
                </div>
              ))}
            </div>
            
            {savedReports.length > 0 && (
              <div className="saved-reports-section">
                <h4>Your Saved Reports</h4>
                <div className="saved-reports-list">
                  {savedReports.map(report => (
                    <div key={report.id} className="saved-report-item">
                      <div className="saved-report-info" onClick={() => handleLoadReport(report)}>
                        <span className="saved-report-name">{report.name}</span>
                        <span className="saved-report-date">
                          {new Date(report.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <button 
                        className="delete-btn"
                        onClick={() => handleDeleteReport(report.id)}
                        title="Delete report"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'forms':
        return (
          <div className="report-builder-step">
            <h3>Select Forms</h3>
            <p className="step-description">Choose which forms to include in your report</p>
            
            <div className="form-selection-list">
              {availableForms.length === 0 ? (
                <div className="loading-state">Loading available forms...</div>
              ) : (
                availableForms.map(formId => (
                  <label key={formId} className="form-selection-item">
                    <input
                      type="checkbox"
                      checked={config.formIdentifiers?.includes(formId)}
                      onChange={(e) => handleFormSelection(formId, e.target.checked)}
                    />
                    <span className="form-name">{formId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                  </label>
                ))
              )}
            </div>

            <div className="step-actions">
              <button className="btn btn-secondary" onClick={() => setStep('template')}>
                Back
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => setStep('fields')}
                disabled={!config.formIdentifiers || config.formIdentifiers.length === 0}
              >
                Next: Select Fields
              </button>
            </div>
          </div>
        );

      case 'fields':
        return (
          <div className="report-builder-step">
            <h3>Select Fields</h3>
            <p className="step-description">Choose which fields to include in your report</p>
            
            {loading ? (
              <div className="loading-state">Discovering available fields...</div>
            ) : (
              <div className="field-selection-list">
                {discoveredFields.map(field => (
                  <label key={field.id} className="field-selection-item">
                    <input
                      type="checkbox"
                      checked={config.fields?.some(f => f.id === field.id)}
                      onChange={(e) => handleFieldToggle(field, e.target.checked)}
                    />
                    <span className="field-info">
                      <span className="field-label">{field.label}</span>
                      <span className="field-meta">
                        {field.source === 'metadata' ? '📋 Metadata' : field.source === 'calculated' ? '🔢 Calculated' : '📝 Form Data'} 
                        • {field.type}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}

            <div className="step-actions">
              <button className="btn btn-secondary" onClick={() => setStep('forms')}>
                Back
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => setStep('filters')}
                disabled={!config.fields || config.fields.length === 0}
              >
                Next: Add Filters
              </button>
            </div>
          </div>
        );

      case 'filters':
        return (
          <div className="report-builder-step">
            <h3>Add Filters</h3>
            <p className="step-description">Optionally add filters to narrow down your report data</p>
            
            <div className="filter-builder">
              {config.filters?.length === 0 ? (
                <p className="no-filters">No filters added. All data will be included.</p>
              ) : (
                config.filters.map((filter, idx) => (
                  <div key={filter.id} className="filter-row">
                    <span className="filter-number">{idx + 1}</span>
                    <span className="filter-field">{config.fields?.find(f => f.id === filter.fieldId)?.label || filter.fieldId}</span>
                    <span className="filter-operator">{filter.operator.replace(/_/g, ' ')}</span>
                    <span className="filter-value">{String(filter.value)}</span>
                    <button 
                      className="remove-filter-btn"
                      onClick={() => handleRemoveFilter(filter.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
              
              <div className="add-filter-form">
                <h4>Add New Filter</h4>
                <div className="filter-form-row">
                  <select 
                    id="filterField"
                    className="filter-select"
                  >
                    <option value="">Select field...</option>
                    {config.fields?.map(field => (
                      <option key={field.id} value={field.id}>{field.label}</option>
                    ))}
                  </select>
                  
                  <select id="filterOperator" className="filter-select">
                    <option value="equals">equals</option>
                    <option value="not_equals">not equals</option>
                    <option value="contains">contains</option>
                    <option value="starts_with">starts with</option>
                    <option value="ends_with">ends with</option>
                    <option value="greater_than">greater than</option>
                    <option value="less_than">less than</option>
                  </select>
                  
                  <input 
                    id="filterValue"
                    type="text" 
                    placeholder="Value..."
                    className="filter-input"
                  />
                  
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      const fieldId = (document.getElementById('filterField') as HTMLSelectElement)?.value;
                      const operator = (document.getElementById('filterOperator') as HTMLSelectElement)?.value as ReportFilterConfig['operator'];
                      const value = (document.getElementById('filterValue') as HTMLInputElement)?.value;
                      
                      if (fieldId && value) {
                        handleAddFilter({
                          id: `filter_${Date.now()}`,
                          fieldId,
                          operator,
                          value,
                          logic: 'and'
                        });
                        // Reset form
                        (document.getElementById('filterField') as HTMLSelectElement).value = '';
                        (document.getElementById('filterValue') as HTMLInputElement).value = '';
                      }
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="step-actions">
              <button className="btn btn-secondary" onClick={() => setStep('fields')}>
                Back
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => setStep('pivot')}
              >
                Next: Pivot & Aggregations
              </button>
            </div>
          </div>
        );

      case 'pivot':
        return (
          <div className="report-builder-step">
            <h3>📊 Pivot & Aggregations</h3>
            <p className="step-description">Configure data aggregations and pivot table options</p>
            
            <div className="pivot-section">
              <h4>Group By (Row Fields)</h4>
              <p className="section-help">Select fields to group your data by</p>
              <div className="pivot-field-list">
                {config.fields?.filter(f => f.type === 'text' || f.type === 'dropdown').map(field => (
                  <label key={field.id} className="pivot-field-item">
                    <input
                      type="radio"
                      name="groupBy"
                      checked={config.groupBy === field.id}
                      onChange={() => updateConfig('groupBy', field.id)}
                    />
                    <span>{field.label}</span>
                  </label>
                ))}
              </div>
              {config.groupBy && (
                <button 
                  className="btn btn-sm btn-secondary" 
                  onClick={() => updateConfig('groupBy', undefined)}
                >
                  Clear Group By
                </button>
              )}
            </div>

            <div className="pivot-section">
              <h4>Aggregations</h4>
              <p className="section-help">Add calculations like Sum, Count, Average, etc.</p>
              
              {/* Use configRef.current to always show latest aggregations */}
              {(configRef.current.aggregations || []).length === 0 ? (
                <p className="no-data">No aggregations configured</p>
              ) : (
                <div className="aggregation-list">
                  {(configRef.current.aggregations || []).map((agg, idx) => (
                    <div key={idx} className="aggregation-row">
                      <span className="agg-number">{idx + 1}</span>
                      <span className="agg-field">
                        {configRef.current.fields?.find(f => f.id === agg.fieldId)?.label || agg.fieldId}
                      </span>
                      <span className="agg-type">{agg.type.toUpperCase()}</span>
                      <button 
                        className="remove-agg-btn"
                        onClick={() => {
                          const currentAggs = configRef.current.aggregations || [];
                          const newAggs = currentAggs.filter((_, i) => i !== idx);
                          setConfig(prev => ({ ...prev, aggregations: newAggs }));
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="add-aggregation-form">
                <h5>Add Aggregation</h5>
                <div className="agg-form-row">
                  <select id="aggField" className="agg-select">
                    <option value="">Select field...</option>
                    {config.fields?.filter(f => f.type === 'number').map(field => (
                      <option key={field.id} value={field.id}>{field.label}</option>
                    ))}
                  </select>
                  
                  <select id="aggType" className="agg-select">
                    <option value="sum">Sum</option>
                    <option value="avg">Average</option>
                    <option value="count">Count</option>
                    <option value="min">Minimum</option>
                    <option value="max">Maximum</option>
                  </select>
                  
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      const fieldSelect = document.getElementById('aggField') as HTMLSelectElement;
                      const typeSelect = document.getElementById('aggType') as HTMLSelectElement;
                      
                      const fieldId = fieldSelect?.value;
                      const type = typeSelect?.value as 'sum' | 'avg' | 'count' | 'min' | 'max';

                      if (fieldId && type) {
                        // Use FUNCTIONAL state update to avoid stale closure issue
                        setConfig(prev => {
                          const newAggs = [...(prev.aggregations || []), { fieldId, type }];
                          console.log('✅ ADDED AGGREGATION:', { newAggs, length: newAggs.length });
                          return { ...prev, aggregations: newAggs };
                        });
                        
                        // Reset select
                        fieldSelect.value = '';
                      } else {
                        alert('Please select both a field and aggregation type');
                      }
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Arithmetic Operations Section */}
            <div className="pivot-section">
              <h4>🧮 Arithmetic Operations</h4>
              <p className="section-help">Perform calculations between two number fields (Add, Subtract, Multiply, Divide)</p>
              
              {config.arithmeticOperations?.length === 0 ? (
                <p className="no-data">No arithmetic operations configured</p>
              ) : (
                <div className="arithmetic-list">
                  {config.arithmeticOperations?.map((op, idx) => (
                    <div key={op.id} className="arithmetic-row">
                      <span className="op-number">{idx + 1}</span>
                      <span className="op-name">{op.name}</span>
                      <span className="op-formula">
                        {formatArithmeticOperation(op, config.fields || [])}
                      </span>
                      <button 
                        className="remove-op-btn"
                        onClick={() => {
                          const newOps = config.arithmeticOperations?.filter((_, i) => i !== idx);
                          updateConfig('arithmeticOperations', newOps);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="add-arithmetic-form">
                <h5>Add Arithmetic Operation</h5>
                <div className="arithmetic-form-row">
                  <input 
                    id="arithName"
                    type="text"
                    placeholder="Operation name (e.g., Total Score)"
                    className="arith-input"
                  />
                  
                  <select id="arithField1" className="arith-select">
                    <option value="">Field 1...</option>
                    {config.fields?.filter(f => f.type === 'number').map(field => (
                      <option key={field.id} value={field.id}>{field.label}</option>
                    ))}
                  </select>
                  
                  <select id="arithOperation" className="arith-select" onChange={(e) => {
                    const op = e.target.value;
                    const field1Select = document.getElementById('arithField1') as HTMLSelectElement;
                    const field2Select = document.getElementById('arithField2') as HTMLSelectElement;
                    const sumFieldsDiv = document.getElementById('sumFieldsDiv');
                    const customFormulaDiv = document.getElementById('customFormulaDiv');

                    // Show/hide field selectors based on operation type
                    if (field1Select) {
                      field1Select.style.display = op === 'custom' ? 'none' : 'block';
                    }

                    if (field2Select) {
                      field2Select.style.display = (op === 'sum' || op === 'custom') ? 'none' : 'block';
                    }

                    // Show/hide sum fields selector
                    if (sumFieldsDiv) {
                      sumFieldsDiv.style.display = op === 'sum' ? 'block' : 'none';
                    }

                    // Show/hide custom formula input
                    if (customFormulaDiv) {
                      customFormulaDiv.style.display = op === 'custom' ? 'block' : 'none';
                    }
                  }}>
                    <option value="add">+ Add</option>
                    <option value="subtract">- Subtract</option>
                    <option value="multiply">× Multiply</option>
                    <option value="divide">÷ Divide</option>
                    <option value="sum">∑ Sum Multiple Fields</option>
                    <option value="custom">ƒ Custom Formula</option>
                  </select>
                  
                  <select id="arithField2" className="arith-select">
                    <option value="">Field 2...</option>
                    {config.fields?.filter(f => f.type === 'number').map(field => (
                      <option key={field.id} value={field.id}>{field.label}</option>
                    ))}
                  </select>

                  {/* Sum Fields Selector - Hidden by default */}
                  <div id="sumFieldsDiv" style={{ display: 'none', width: '100%' }}>
                    <label style={{ fontSize: '0.875rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>
                      Select fields to sum (Ctrl+Click for multiple):
                    </label>
                    <select
                      id="sumFields"
                      multiple
                      className="arith-select"
                      style={{ height: '80px', width: '100%' }}
                    >
                      {config.fields?.filter(f => f.type === 'number').map(field => (
                        <option key={field.id} value={field.id}>{field.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Formula Input - Hidden by default */}
                  <div id="customFormulaDiv" style={{ display: 'none', width: '100%' }}>
                    <label style={{ fontSize: '0.875rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>
                      Custom Formula (use field labels like [Biometric Update] + [Mandatory Biometric]):
                    </label>
                    <input
                      id="customFormula"
                      type="text"
                      placeholder="e.g., [Biometric Update] + [Mandatory Biometric]"
                      className="arith-input"
                      style={{ width: '100%' }}
                    />
                    <small style={{ color: '#999', fontSize: '0.75rem' }}>
                      Supported: +, -, *, /, (, ), [Field Label]
                    </small>
                  </div>

                  <input
                    id="arithResultName"
                    type="text"
                    placeholder="Result field name"
                    className="arith-input"
                  />
                  
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      const name = (document.getElementById('arithName') as HTMLInputElement)?.value;
                      const operation = (document.getElementById('arithOperation') as HTMLSelectElement)?.value as 'add' | 'subtract' | 'multiply' | 'divide' | 'sum' | 'custom';
                      const resultFieldName = (document.getElementById('arithResultName') as HTMLInputElement)?.value;

                      if (!name || !operation || !resultFieldName) {
                        alert('Please fill in operation name, type, and result field name');
                        return;
                      }

                      let fieldId1 = '';
                      let fieldId2 = '';
                      let customFormula = '';

                      if (operation === 'sum') {
                        // Get multiple fields for sum
                        const sumFieldsSelect = document.getElementById('sumFields') as HTMLSelectElement;
                        const selectedOptions = Array.from(sumFieldsSelect.selectedOptions);
                        if (selectedOptions.length === 0) {
                          alert('Please select at least one field to sum');
                          return;
                        }
                        fieldId1 = selectedOptions.map(opt => opt.value).join(',');
                      } else if (operation === 'custom') {
                        // Get custom formula
                        customFormula = (document.getElementById('customFormula') as HTMLInputElement)?.value.trim();
                        if (!customFormula) {
                          alert('Please enter a custom formula');
                          return;
                        }
                        fieldId1 = '';
                        fieldId2 = '';
                      } else {
                        // Standard two-field operations
                        fieldId1 = (document.getElementById('arithField1') as HTMLSelectElement)?.value;
                        fieldId2 = (document.getElementById('arithField2') as HTMLSelectElement)?.value;

                        if (!fieldId1 || !fieldId2) {
                          alert('Please select both fields');
                          return;
                        }
                      }

                      const newOp = {
                        id: `arith_${Date.now()}`,
                        name,
                        operation,
                        fieldId1,
                        fieldId2,
                        resultFieldName,
                        customFormula
                      };

                      const newOps = [...(config.arithmeticOperations || []), newOp];
                      updateConfig('arithmeticOperations', newOps);

                      // Reset form
                      (document.getElementById('arithName') as HTMLInputElement).value = '';
                      (document.getElementById('arithField1') as HTMLSelectElement).value = '';
                      (document.getElementById('arithField2') as HTMLSelectElement).value = '';
                      (document.getElementById('arithResultName') as HTMLInputElement).value = '';
                      (document.getElementById('customFormula') as HTMLInputElement).value = '';
                      const sumFieldsSelect = document.getElementById('sumFields') as HTMLSelectElement;
                      if (sumFieldsSelect) {
                        Array.from(sumFieldsSelect.options).forEach(option => option.selected = false);
                      }
                    }}
                  >
                    Add Operation
                  </button>
                </div>
              </div>
            </div>

            <div className="step-actions">
              <button className="btn btn-secondary" onClick={() => setStep('filters')}>
                Back
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => setStep('preview')}
              >
                Preview Report
              </button>
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="report-builder-step">
            <h3>Preview Report</h3>
            <p className="step-description">Review your report configuration and generate results</p>
            
            <div className="report-summary">
              <div className="summary-section">
                <h4>Report Name</h4>
                <input
                  type="text"
                  value={config.name || ''}
                  onChange={(e) => updateConfig('name', e.target.value)}
                  placeholder="Enter report name..."
                  className="report-name-input"
                />
              </div>
              
              <div className="summary-section">
                <h4>Selected Forms ({config.formIdentifiers?.length || 0})</h4>
                <div className="summary-tags">
                  {config.formIdentifiers?.map(formId => (
                    <span key={formId} className="summary-tag">
                      {formId.replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="summary-section">
                <h4>Selected Fields ({config.fields?.length || 0})</h4>
                <div className="summary-tags">
                  {config.fields?.map(field => (
                    <span key={field.id} className="summary-tag field">
                      {field.label}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="summary-section">
                <h4>Active Filters ({config.filters?.length || 0})</h4>
                {config.filters?.length === 0 ? (
                  <p className="no-data">No filters applied</p>
                ) : (
                  <ul className="filter-list">
                    {config.filters.map(filter => (
                      <li key={filter.id}>
                        {config.fields?.find(f => f.id === filter.fieldId)?.label} {filter.operator} {String(filter.value)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="summary-section">
                <h4>Aggregations ({config.aggregations?.length || 0})</h4>
                {config.aggregations?.length === 0 ? (
                  <p className="no-data">No aggregations configured</p>
                ) : (
                  <ul className="aggregation-list">
                    {config.aggregations.map((agg, idx) => (
                      <li key={idx}>
                        <strong>{agg.type.toUpperCase()}</strong> of {' '}
                        {config.fields?.find(f => f.id === agg.fieldId)?.label || agg.fieldId}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="summary-section">
                <h4>Arithmetic Operations ({config.arithmeticOperations?.length || 0})</h4>
                {config.arithmeticOperations?.length === 0 ? (
                  <p className="no-data">No arithmetic operations configured</p>
                ) : (
                  <ul className="arithmetic-list">
                    {config.arithmeticOperations.map((op, idx) => (
                      <li key={idx}>
                        <strong>{op.name}</strong>: {' '}
                        {formatArithmeticOperation(op, config.fields || [])}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {loading ? (
              <div className="loading-state">Generating report...</div>
            ) : previewData.length > 0 ? (
              <div className="preview-table-container">
                <h4>Preview ({previewData.length} records)</h4>
                <table className="preview-table">
                  <thead>
                    <tr>
                      {config.fields?.map(field => (
                        <th key={field.id}>{field.label}</th>
                      ))}
                      {/* Add headers for arithmetic operation results */}
                      {config.arithmeticOperations?.map(op => (
                        <th key={op.id} className="arithmetic-result-header">
                          {op.resultFieldName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((row, idx) => (
                      <tr key={row.id || idx}>
                        {config.fields?.map(field => (
                          <td key={field.id}>
                            {field.source === 'submission_data' 
                              ? row.submission_data?.[field.id] || '-'
                              : (row as any)[field.id] || '-'
                            }
                          </td>
                        ))}
                        {/* Show arithmetic operation results */}
                        {config.arithmeticOperations?.map(op => (
                          <td key={op.id} className="arithmetic-result-cell">
                            {row[op.resultFieldName] ?? row.submission_data?.[op.resultFieldName] ?? '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <p className="preview-more">... and {previewData.length - 10} more records</p>
                )}
              </div>
            ) : null}

            <div className="step-actions">
              <button className="btn btn-secondary" onClick={() => setStep('filters')}>
                Back
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleGeneratePreview}
                disabled={!config.name || config.fields?.length === 0}
              >
                🔄 Refresh Preview
              </button>
              <button 
                className="btn btn-success" 
                onClick={handleSaveReport}
                disabled={!config.name || loading}
              >
                💾 Save Report
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="report-builder">
      <div className="report-builder-header">
        <h2>📊 Report Builder</h2>
        <p className="report-builder-subtitle">Create custom reports from your form submissions</p>
      </div>

      <div className="report-builder-steps">
        <div className={`step-indicator ${step === 'template' ? 'active' : ''} ${['forms', 'fields', 'filters', 'preview'].includes(step) ? 'completed' : ''}`}>
          <span className="step-number">1</span>
          <span className="step-label">Template</span>
        </div>
        <div className={`step-indicator ${step === 'forms' ? 'active' : ''} ${['fields', 'filters', 'preview'].includes(step) ? 'completed' : ''}`}>
          <span className="step-number">2</span>
          <span className="step-label">Forms</span>
        </div>
        <div className={`step-indicator ${step === 'fields' ? 'active' : ''} ${['filters', 'preview'].includes(step) ? 'completed' : ''}`}>
          <span className="step-number">3</span>
          <span className="step-label">Fields</span>
        </div>
        <div className={`step-indicator ${step === 'filters' ? 'active' : ''} ${['pivot', 'preview'].includes(step) ? 'completed' : ''}`}>
          <span className="step-number">4</span>
          <span className="step-label">Filters</span>
        </div>
        <div className={`step-indicator ${step === 'pivot' ? 'active' : ''} ${step === 'preview' ? 'completed' : ''}`}>
          <span className="step-number">5</span>
          <span className="step-label">Pivot</span>
        </div>
        <div className={`step-indicator ${step === 'preview' ? 'active' : ''}`}>
          <span className="step-number">6</span>
          <span className="step-label">Preview</span>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
          <button onClick={() => setError(null)} className="close-error">✕</button>
        </div>
      )}

      <div className="report-builder-content">
        {renderStepContent()}
      </div>
    </div>
  );
};

export default ReportBuilder;
