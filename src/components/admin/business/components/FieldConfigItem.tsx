import React from 'react';
import { FaTrash } from 'react-icons/fa';
import { FormField } from '../types/PageBuilderTypes';

interface FieldConfigItemProps {
  field: FormField;
  index: number;
  onUpdate: (index: number, field: FormField) => void;
  onRemove: (index: number) => void;
}

const FieldConfigItem: React.FC<FieldConfigItemProps> = ({
  field,
  index,
  onUpdate,
  onRemove,
}) => {
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
        <button onClick={() => onRemove(index)} className="btn btn-danger btn-sm">
          {React.createElement(FaTrash as React.ComponentType<any>)} Remove
        </button>
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
            <label className="form-label">Options: </label>
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
            <button type="button" onClick={addOption} className="btn btn-secondary btn-sm">
              Add Option
            </button>
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
              <label htmlFor={`field-source-fields-${index}`} className="form-label">Source Fields (comma-separated IDs): </label>
              <input
                id={`field-source-fields-${index}`}
                type="text"
                className="form-control"
                value={field.sourceFields?.join(',') || ''}
                onChange={(e) => onUpdate(index, {...field, sourceFields: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                placeholder="field_1,field_2,field_3"
              />
              <small className="form-text text-muted">
                Enter the IDs of fields to use in calculation (e.g., field_1,field_2)
              </small>
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
                  placeholder="e.g., (field_1 + field_2) * 0.1"
                />
                <small className="form-text text-muted">
                  Use field IDs as variables. Example: (field_1 + field_2) * 1.18 for tax calculation
                </small>
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
