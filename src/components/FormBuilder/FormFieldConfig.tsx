import React from 'react';
import { FormField, FormFieldType } from '../../services/userFormBuilderService';

interface FormFieldConfigProps {
  field: FormField;
  onChange: (updates: Partial<FormField>) => void;
  onClose: () => void;
}

const fieldTypeLabels: Record<FormFieldType, string> = {
  text: 'Text',
  textarea: 'Text Area',
  number: 'Number',
  date: 'Date',
  datetime: 'Date & Time',
  dropdown: 'Dropdown',
  multiselect: 'Multi Select',
  radio: 'Radio',
  checkbox: 'Checkbox',
  'checkbox-group': 'Checkbox Group',
  switch: 'Switch',
  file: 'File',
  image: 'Image',
  email: 'Email',
  phone: 'Phone',
  url: 'URL',
  calculated: 'Calculated',
  reference: 'Reference',
  section: 'Section'
};

const FormFieldConfig: React.FC<FormFieldConfigProps> = ({ field, onChange, onClose }) => {
  const hasOptions = ['dropdown', 'radio', 'checkbox-group', 'multiselect'].includes(field.type);
  const isCalculated = field.type === 'calculated';

  const handleAddOption = () => {
    const newOption = {
      label: `Option ${(field.options?.length || 0) + 1}`,
      value: `option_${(field.options?.length || 0) + 1}`
    };
    onChange({
      options: [...(field.options || []), newOption]
    });
  };

  const handleUpdateOption = (index: number, updates: Partial<{ label: string; value: string }>) => {
    const newOptions = [...(field.options || [])];
    newOptions[index] = { ...newOptions[index], ...updates };
    onChange({ options: newOptions });
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = [...(field.options || [])];
    newOptions.splice(index, 1);
    onChange({ options: newOptions });
  }

  return (
    <>
      <div className="form-builder__properties-title">
        <span>Field Properties</span>
        <button onClick={onClose} className="form-builder__modal-close">
          ✕
        </button>
      </div>

      <div className="form-builder__properties-content">
        {/* Field Type */}
        <div className="form-builder__property-group">
          <label className="form-builder__property-label">Field Type</label>
          <select
            value={field.type}
            onChange={(e) => onChange({ type: e.target.value as FormFieldType })}
            className="form-builder__property-select"
          >
            {Object.entries(fieldTypeLabels).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Label */}
        <div className="form-builder__property-group">
          <label className="form-builder__property-label">Label *</label>
          <input
            type="text"
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
            className="form-builder__property-input"
            placeholder="Enter field label"
          />
        </div>

        {/* Description */}
        <div className="form-builder__property-group">
          <label className="form-builder__property-label">Description</label>
          <textarea
            value={field.description || ''}
            onChange={(e) => onChange({ description: e.target.value })}
            className="form-builder__property-textarea"
            placeholder="Add a description for this field"
            rows={2}
          />
        </div>

        {/* Placeholder */}
        <div className="form-builder__property-group">
          <label className="form-builder__property-label">Placeholder</label>
          <input
            type="text"
            value={field.placeholder || ''}
            onChange={(e) => onChange({ placeholder: e.target.value })}
            className="form-builder__property-input"
            placeholder="Enter placeholder text"
          />
        </div>

        {/* Validation */}
        <div className="form-builder__property-group">
          <label className="form-builder__property-label">Validation</label>
          <label className="form-builder__property-checkbox">
            <input
              type="checkbox"
              checked={field.validation?.required || false}
              onChange={(e) =>
                onChange({
                  validation: { ...field.validation, required: e.target.checked }
                })
              }
            />
            <span>Required field</span>
          </label>

          {field.type === 'text' && (
            <>
              <div style={{ marginTop: 8 }}>
                <label className="form-builder__property-label">Min Length</label>
                <input
                  type="number"
                  value={field.validation?.minLength || ''}
                  onChange={(e) =>
                    onChange({
                      validation: {
                        ...field.validation,
                        minLength: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    })
                  }
                  className="form-builder__property-input"
                  placeholder="Min"
                />
              </div>
              <div style={{ marginTop: 8 }}>
                <label className="form-builder__property-label">Max Length</label>
                <input
                  type="number"
                  value={field.validation?.maxLength || ''}
                  onChange={(e) =>
                    onChange({
                      validation: {
                        ...field.validation,
                        maxLength: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    })
                  }
                  className="form-builder__property-input"
                  placeholder="Max"
                />
              </div>
            </>
          )}

          {field.type === 'number' && (
            <>
              <div style={{ marginTop: 8 }}>
                <label className="form-builder__property-label">Min Value</label>
                <input
                  type="number"
                  value={field.validation?.min || ''}
                  onChange={(e) =>
                    onChange({
                      validation: {
                        ...field.validation,
                        min: e.target.value ? parseFloat(e.target.value) : undefined
                      }
                    })
                  }
                  className="form-builder__property-input"
                  placeholder="Min"
                />
              </div>
              <div style={{ marginTop: 8 }}>
                <label className="form-builder__property-label">Max Value</label>
                <input
                  type="number"
                  value={field.validation?.max || ''}
                  onChange={(e) =>
                    onChange({
                      validation: {
                        ...field.validation,
                        max: e.target.value ? parseFloat(e.target.value) : undefined
                      }
                    })
                  }
                  className="form-builder__property-input"
                  placeholder="Max"
                />
              </div>
            </>
          )}
        </div>

        {/* Options for select fields */}
        {hasOptions && (
          <div className="form-builder__property-group">
            <label className="form-builder__property-label">Options</label>
            <div className="form-builder__property-options">
              {field.options?.map((option, index) => (
                <div key={index} className="form-builder__property-option">
                  <input
                    type="text"
                    value={option.label}
                    onChange={(e) =>
                      handleUpdateOption(index, {
                        label: e.target.value,
                        value: e.target.value.toLowerCase().replace(/\s+/g, '_')
                      })
                    }
                    className="form-builder__property-input"
                    placeholder="Option label"
                  />
                  <button
                    onClick={() => handleRemoveOption(index)}
                    className="form-builder__property-option-btn"
                    title="Remove option"
                  >
                    🗑️
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddOption}
                className="form-builder__property-add-option"
              >
                <span>+</span>
                <span>Add Option</span>
              </button>
            </div>
          </div>
        )}

        {/* Calculated field settings */}
        {isCalculated && (
          <div className="form-builder__property-group">
            <label className="form-builder__property-label">Calculation Formula</label>
            <p style={{ fontSize: '12px', color: '#718096', marginBottom: '8px' }}>
              Use [fieldId] to reference other fields. Example: [price] * [quantity]
            </p>
            <textarea
              value={field.calculation?.formula || ''}
              onChange={(e) =>
                onChange({
                  calculation: {
                    ...field.calculation,
                    formula: e.target.value,
                    decimalPlaces: field.calculation?.decimalPlaces || 2
                  }
                })
              }
              className="form-builder__property-textarea"
              placeholder="Enter formula"
              rows={3}
            />
            <div style={{ marginTop: 8 }}>
              <label className="form-builder__property-label">Decimal Places</label>
              <input
                type="number"
                value={field.calculation?.decimalPlaces || 2}
                onChange={(e) =>
                  onChange({
                    calculation: {
                      ...field.calculation,
                      formula: field.calculation?.formula || '',
                      decimalPlaces: parseInt(e.target.value) || 0
                    }
                  })
                }
                className="form-builder__property-input"
                min={0}
                max={10}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default FormFieldConfig;
