import React, { useRef, useState } from 'react';
import { FaTrash, FaArrowUp, FaArrowDown, FaFileExcel, FaUpload } from 'react-icons/fa';
import { FormField } from '../types/PageBuilderTypes';

interface FieldConfigItemProps {
  field: FormField;
  index: number;
  onUpdate: (index: number, field: FormField) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  allFields: FormField[];
  isFirst: boolean;
  isLast: boolean;
}

const FieldConfigItem: React.FC<FieldConfigItemProps> = ({
  field,
  index,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  allFields,
  isFirst,
  isLast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleOptionChange = (optIndex: number, value: string, key: 'label' | 'value') => {
    const newOptions = [...(field.options || [])];
    newOptions[optIndex] = { ...newOptions[optIndex], [key]: value };
    onUpdate(index, { ...field, options: newOptions });
  };

  const addOption = () => {
    const newOptions = [...(field.options || []), { label: '', value: '' }];
    onUpdate(index, { ...field, options: newOptions });
  };

  const removeOption = (optIndex: number) => {
    const newOptions = field.options?.filter((_, i) => i !== optIndex);
    onUpdate(index, { ...field, options: newOptions });
  };

  // Handle Excel file upload for bulk options import
  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setUploadError(null);
    
    if (!file) return;
    
    // Validate file type
    const validTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(file.type) && !['xlsx', 'xls', 'csv'].includes(fileExtension || '')) {
      setUploadError('Please upload a valid Excel file (.xlsx, .xls) or CSV file (.csv)');
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        let parsedOptions: { label: string; value: string }[] = [];
        
        if (fileExtension === 'csv' || file.type === 'text/csv') {
          // Parse CSV
          const csvText = data as string;
          const lines = csvText.split('\n').filter(line => line.trim());
          
          // Check if first row is header
          const firstRow = lines[0].toLowerCase();
          const hasHeader = firstRow.includes('label') || firstRow.includes('value');
          const startIndex = hasHeader ? 1 : 0;
          
          for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Handle CSV parsing with quotes
            const parts: string[] = [];
            let current = '';
            let inQuotes = false;
            
            for (const char of line) {
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                parts.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            parts.push(current.trim());
            
            if (parts.length >= 2) {
              parsedOptions.push({
                label: parts[0] || '',
                value: parts[1] || parts[0] || ''
              });
            } else if (parts.length === 1 && parts[0]) {
              parsedOptions.push({
                label: parts[0],
                value: parts[0]
              });
            }
          }
        } else {
          // Parse Excel - using dynamic import for xlsx
          const XLSX = require('xlsx');
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
          
          if (jsonData.length === 0) {
            setUploadError('Excel file is empty');
            return;
          }
          
          // Check if first row is header
          const firstRow = jsonData[0].map((cell: any) => String(cell || '').toLowerCase().trim());
          const hasHeader = firstRow.includes('label') || firstRow.includes('value');
          const startIndex = hasHeader ? 1 : 0;
          
          for (let i = startIndex; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            
            const label = String(row[0] || '').trim();
            const value = row.length > 1 ? String(row[1] || '').trim() : label;
            
            if (label) {
              parsedOptions.push({ label, value: value || label });
            }
          }
        }
        
        if (parsedOptions.length === 0) {
          setUploadError('No valid options found in the file. Please ensure the file has at least 2 columns: Label and Value');
          return;
        }
        
        // Merge with existing options or replace them
        const existingOptions = field.options || [];
        const mergedOptions = [...existingOptions, ...parsedOptions];
        
        onUpdate(index, { ...field, options: mergedOptions });
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        alert(`Successfully imported ${parsedOptions.length} options!`);
      } catch (error) {
        console.error('Error parsing file:', error);
        setUploadError('Error parsing file: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    };
    
    reader.onerror = () => {
      setUploadError('Error reading file');
    };
    
    if (fileExtension === 'csv' || file.type === 'text/csv') {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };
  
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDefaultValueChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { value, type } = e.target;
    let newDefaultValue: any = value;
    if (type === 'checkbox') {
      newDefaultValue = (e.target as HTMLInputElement).checked;
    }
    onUpdate(index, { ...field, defaultValue: newDefaultValue });
  };

  return (
    <div className="field-config-item card mb-3">
      <div className="card-header d-flex justify-content-between align-items-center">
        <strong>{field.label || 'Unnamed Field'}</strong> ({field.type})
        <div className="btn-group">
          <button
            onClick={() => onMoveUp(index)}
            className="btn btn-outline-primary btn-sm"
            disabled={isFirst}
            title="Move Up"
          >
            {React.createElement(FaArrowUp as React.ComponentType<any>)}
          </button>
          <button
            onClick={() => onMoveDown(index)}
            className="btn btn-outline-primary btn-sm"
            disabled={isLast}
            title="Move Down"
          >
            {React.createElement(FaArrowDown as React.ComponentType<any>)}
          </button>
          <button onClick={() => onRemove(index)} className="btn btn-danger btn-sm">
            {React.createElement(FaTrash as React.ComponentType<any>)} Remove
          </button>
        </div>
      </div>
      <div className="card-body">
        {/* Field Type Selector */}
        <div className="form-group">
          <label htmlFor={`field-type-${index}`} className="form-label">Type: </label>
          <select
            id={`field-type-${index}`}
            className="form-control"
            value={field.type}
            onChange={(e) => onUpdate(index, {
              ...field, 
              type: e.target.value as FormField['type'], 
              options: field.type !== 'dropdown' && field.type !== 'radio' && field.type !== 'checkbox-group' ? undefined : field.options, 
              placeholder: field.type === 'section' || field.type === 'button' ? undefined : field.placeholder 
            })}
          >
            <option value="text">Text</option>
            <option value="textarea">Textarea</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="dropdown">Dropdown</option>
            <option value="radio">Radio Group</option>
            <option value="checkbox">Checkbox (Single)</option>
            <option value="checkbox-group">Checkbox Group</option>
            <option value="switch">Switch</option>
            <option value="file">File Upload</option>
            <option value="calculated">🧮 Calculated Field</option>
            <option value="section">Section Header</option>
            <option value="button">Button</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor={`field-label-${index}`} className="form-label">Label: </label>
          <input
            id={`field-label-${index}`}
            type="text"
            className="form-control"
            value={field.label}
            onChange={(e) => onUpdate(index, {...field, label: e.target.value})}
            required
          />
        </div>

        {['text', 'textarea', 'number', 'date'].includes(field.type) && (
          <div className="form-group">
            <label htmlFor={`field-placeholder-${index}`} className="form-label">Placeholder: </label>
            <input
              id={`field-placeholder-${index}`}
              type="text"
              className="form-control"
              value={field.placeholder || ''}
              onChange={(e) => onUpdate(index, {...field, placeholder: e.target.value})}
            />
          </div>
        )}

        {field.type === 'number' && (
          <>
            <div className="form-group">
              <label htmlFor={`field-min-${index}`} className="form-label">Min Value: </label>
              <input
                id={`field-min-${index}`}
                type="number"
                className="form-control"
                value={field.min === undefined ? '' : field.min}
                onChange={(e) => onUpdate(index, {...field, min: e.target.value === '' ? undefined : parseFloat(e.target.value)})}
              />
            </div>
            <div className="form-group">
              <label htmlFor={`field-max-${index}`} className="form-label">Max Value: </label>
              <input
                id={`field-max-${index}`}
                type="number"
                className="form-control"
                value={field.max === undefined ? '' : field.max}
                onChange={(e) => onUpdate(index, {...field, max: e.target.value === '' ? undefined : parseFloat(e.target.value)})}
              />
            </div>
          </>
        )}

        {['dropdown', 'radio', 'checkbox-group'].includes(field.type) && (
          <div className="form-group field-options-config">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="form-label mb-0">Options: </label>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleExcelUpload}
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={triggerFileUpload}
                  className="btn btn-outline-success btn-sm"
                  title="Upload Excel/CSV with options"
                >
                  {React.createElement(FaFileExcel as React.ComponentType<any>)} Import from Excel
                </button>
              </div>
            </div>
            
            {uploadError && (
              <div className="alert alert-danger alert-sm py-2 px-3 mb-2">
                <small>{uploadError}</small>
              </div>
            )}
            
            <div className="alert alert-info alert-sm py-2 px-3 mb-2">
              <small>
                <strong>Excel Format:</strong> Column A = Label, Column B = Value. First row can be headers.
              </small>
            </div>
            
            {field.options?.map((opt, optIndex) => (
              <div key={optIndex} className="input-group mb-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Option Label"
                  value={opt.label}
                  onChange={(e) => handleOptionChange(optIndex, e.target.value, 'label')}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Option Value"
                  value={opt.value}
                  onChange={(e) => handleOptionChange(optIndex, e.target.value, 'value')}
                />
                <button type="button" onClick={() => removeOption(optIndex)} className="btn btn-outline-danger">
                  Remove
                </button>
              </div>
            ))}
            <div className="d-flex gap-2">
              <button type="button" onClick={addOption} className="btn btn-secondary btn-sm">
                Add Option
              </button>
              {field.options && field.options.length > 0 && (
                <button
                  type="button"
                  onClick={() => onUpdate(index, { ...field, options: [] })}
                  className="btn btn-outline-danger btn-sm"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        )}

        {/* Default Value - Type specific handling */}
        {['text', 'textarea', 'number', 'date'].includes(field.type) && (
            <div className="form-group">
                <label htmlFor={`field-default-value-${index}`} className="form-label">Default Value: </label>
                <input
                    id={`field-default-value-${index}`}
                    type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                    className="form-control"
                    value={field.defaultValue === undefined ? '' : String(field.defaultValue)}
                    onChange={handleDefaultValueChange}
                />
            </div>
        )}

        {(field.type === 'checkbox' || field.type === 'switch') && (
            <div className="form-group form-check">
                <input
                    id={`field-default-value-${index}`}
                    type="checkbox"
                    className="form-check-input"
                    checked={Boolean(field.defaultValue)}
                    onChange={handleDefaultValueChange}
                />
                <label htmlFor={`field-default-value-${index}`} className="form-check-label">Default Checked: </label>
            </div>
        )}

        {['dropdown', 'radio'].includes(field.type) && field.options && field.options.length > 0 && (
             <div className="form-group">
                <label htmlFor={`field-default-value-${index}`} className="form-label">Default Value: </label>
                <select
                    id={`field-default-value-${index}`}
                    className="form-control"
                    value={field.defaultValue === undefined ? '' : String(field.defaultValue)}
                    onChange={handleDefaultValueChange}
                >
                    <option value="">-- Select Default --</option>
                    {field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </div>
        )}

        {field.type === 'checkbox-group' && (
            <div className="form-group">
                <label className="form-label">Default Values (comma-separated): </label>
                <input
                    type="text"
                    className="form-control"
                    value={Array.isArray(field.defaultValue) ? field.defaultValue.join(',') : ''}
                    onChange={(e) => onUpdate(index, {...field, defaultValue: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                    placeholder="value1,value2"
                />
            </div>
        )}

        {field.type === 'button' && (
          <div className="form-group">
            <label htmlFor={`field-button-text-${index}`} className="form-label">Button Text: </label>
            <input
              id={`field-button-text-${index}`}
              type="text"
              className="form-control"
              value={field.buttonText || ''}
              onChange={(e) => onUpdate(index, {...field, buttonText: e.target.value})}
            />
          </div>
        )}

        {field.type === 'section' && (
          <div className="form-group">
            <label htmlFor={`field-section-title-${index}`} className="form-label">Section Title: </label>
            <input
              id={`field-section-title-${index}`}
              type="text"
              className="form-control"
              value={field.sectionTitle || ''}
              onChange={(e) => onUpdate(index, {...field, sectionTitle: e.target.value})}
            />
          </div>
        )}

        {/* Calculated Field Configuration */}
        {field.type === 'calculated' && (
          <div className="calculated-field-config">
            <div className="alert alert-info">
              <strong>🧮 Calculated Field Configuration</strong><br />
              This field will automatically calculate values based on other form fields.
            </div>

            {/* Calculation Type */}
            <div className="form-group">
              <label htmlFor={`field-calc-type-${index}`} className="form-label">Calculation Type: </label>
              <select
                id={`field-calc-type-${index}`}
                className="form-control"
                value={field.calculationType || 'sum'}
                onChange={(e) => onUpdate(index, {...field, calculationType: e.target.value as any})}
              >
                <option value="sum">➕ Sum (Add all values)</option>
                <option value="subtract">➖ Subtract (First - Others)</option>
                <option value="multiply">✖️ Multiply (All values)</option>
                <option value="divide">➗ Divide (First ÷ Others)</option>
                <option value="average">📊 Average</option>
                <option value="percentage">📈 Percentage (First/Second * 100)</option>
                <option value="custom">⚙️ Custom Formula</option>
              </select>
            </div>

            {/* Source Fields */}
            <div className="form-group">
              <label htmlFor={`field-source-fields-${index}`} className="form-label">Source Fields (comma-separated labels): </label>
              <input
                id={`field-source-fields-${index}`}
                type="text"
                className="form-control"
                value={field.sourceFields?.join(',') || ''}
                onChange={(e) => onUpdate(index, {...field, sourceFields: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                placeholder="Price,Quantity,Tax Rate"
              />
              <small className="form-text text-muted">
                Enter the labels of fields to use in calculation (e.g., Price,Quantity,Tax Rate)
              </small>
              {allFields.length > 0 && (
                <div className="mt-2">
                  <small className="text-info">
                    <strong>Available fields:</strong> {allFields.filter(f => f.type !== 'calculated' && f.type !== 'section' && f.type !== 'button' && f.label).map(f => f.label).join(', ')}
                  </small>
                </div>
              )}
            </div>

            {/* Custom Formula (only for custom type) */}
            {field.calculationType === 'custom' && (
              <div className="form-group">
                <label htmlFor={`field-custom-formula-${index}`} className="form-label">Custom Formula: </label>
                <textarea
                  id={`field-custom-formula-${index}`}
                  className="form-control"
                  rows={3}
                  value={field.customFormula || ''}
                  onChange={(e) => onUpdate(index, {...field, customFormula: e.target.value})}
                  placeholder="e.g., ([Price] + [Tax Amount]) * 1.18"
                />
                <small className="form-text text-muted">
                  Use field labels in square brackets. Example: ([Price] + [Tax Amount]) * 1.18 for GST calculation
                </small>
                <div className="mt-2">
                  <small className="text-info">
                    <strong>Example formulas:</strong><br />
                    • Simple addition: [Price] + [Tax]<br />
                    • Percentage: [Amount] * ([Tax Rate] / 100)<br />
                    • Complex: ([Base Price] + [Shipping]) * (1 + [Tax Rate]/100)
                  </small>
                </div>
              </div>
            )}

            {/* Display Options */}
            <div className="row">
              <div className="col-md-4">
                <div className="form-group">
                  <label htmlFor={`field-decimal-places-${index}`} className="form-label">Decimal Places: </label>
                  <input
                    id={`field-decimal-places-${index}`}
                    type="number"
                    className="form-control"
                    min="0"
                    max="10"
                    value={field.decimalPlaces || 2}
                    onChange={(e) => onUpdate(index, {...field, decimalPlaces: parseInt(e.target.value) || 2})}
                  />
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group">
                  <label htmlFor={`field-prefix-${index}`} className="form-label">Prefix: </label>
                  <input
                    id={`field-prefix-${index}`}
                    type="text"
                    className="form-control"
                    value={field.prefix || ''}
                    onChange={(e) => onUpdate(index, {...field, prefix: e.target.value})}
                    placeholder="₹, $, etc."
                  />
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group">
                  <label htmlFor={`field-suffix-${index}`} className="form-label">Suffix: </label>
                  <input
                    id={`field-suffix-${index}`}
                    type="text"
                    className="form-control"
                    value={field.suffix || ''}
                    onChange={(e) => onUpdate(index, {...field, suffix: e.target.value})}
                    placeholder="%, kg, etc."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Required Checkbox (excluding button and section) */}
        {!['button', 'section'].includes(field.type) && (
          <div className="form-group form-check">
            <input
              id={`field-required-${index}`}
              type="checkbox"
              className="form-check-input"
              checked={!!field.required}
              onChange={(e) => onUpdate(index, {...field, required: e.target.checked})}
            />
            <label htmlFor={`field-required-${index}`} className="form-check-label"> Required</label>
          </div>
        )}
      </div>
    </div>
  );
};

export default FieldConfigItem;
