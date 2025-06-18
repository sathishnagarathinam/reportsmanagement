import React, { useEffect, useState, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import OfficeService from '../../services/officeService';
import { supabasePageService } from '../admin/business/services/supabasePageService';
import './DynamicForm.css'; // We'll create this CSS file next

// Interfaces for form configuration
export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormField {
  id: string; // Unique ID for the field, can be used as name
  label: string;
  type: 'text' | 'textarea' | 'dropdown' | 'radio' | 'button' | 'checkbox' | 'number' | 'date' | 'file' | 'section' | 'switch' | 'checkbox-group'; // Added 'switch' and 'checkbox-group'
  options?: FormFieldOption[]; // Updated to use FormFieldOption interface
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number | boolean | string[]; // Allow string array for checkbox-group
  min?: number; // For number type
  max?: number; // For number type
}

export interface FormConfig {
  id: string; // Corresponds to cardId
  title?: string; // Optional title for the form/page
  fields: FormField[]; // This array must exist and contain FormField objects
}

interface DynamicFormProps {
  cardId: string;
  onSubmitForm: (formData: Record<string, any>) => void; // Callback for form submission
  formConfig?: FormConfig; // Optional: For previewing or direct config passthrough
  isReadOnly?: boolean; // Optional: For read-only mode
  onFormCleared?: () => void; // Optional: Callback when form is cleared
}

export interface DynamicFormRef {
  clearFormAfterSubmission: () => void;
}

const DynamicForm = React.forwardRef<DynamicFormRef, DynamicFormProps>(({ cardId, onSubmitForm, formConfig: initialFormConfig, isReadOnly, onFormCleared }, ref) => {
  const [formConfig, setFormConfig] = useState<FormConfig | null>(initialFormConfig || null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Define all callbacks at the top level to ensure consistent hook order
  const getDefaultValues = React.useCallback(() => {
    if (!formConfig) return {};

    const defaultValues: Record<string, any> = {};
    formConfig.fields.forEach(field => {
      if (field.type !== 'button' && field.type !== 'section') {
        if (field.defaultValue !== undefined) {
          defaultValues[field.id] = field.defaultValue;
        } else {
          if (field.type === 'checkbox' || field.type === 'switch') {
            defaultValues[field.id] = false;
          } else if (field.type === 'checkbox-group') {
            defaultValues[field.id] = [];
          } else {
            defaultValues[field.id] = '';
          }
        }
      }
    });
    return defaultValues;
  }, [formConfig]);

  const getEmptyValues = React.useCallback(() => {
    if (!formConfig) return {};

    const emptyValues: Record<string, any> = {};
    formConfig.fields.forEach(field => {
      if (field.type !== 'button' && field.type !== 'section') {
        if (field.type === 'checkbox' || field.type === 'switch') {
          emptyValues[field.id] = false;
        } else if (field.type === 'checkbox-group') {
          emptyValues[field.id] = [];
        } else {
          emptyValues[field.id] = '';
        }
      }
    });
    return emptyValues;
  }, [formConfig]);

  // Office name dropdown specific state
  const [officeNameOptions, setOfficeNameOptions] = useState<Record<string, FormFieldOption[]>>({});
  const [officeNameLoading, setOfficeNameLoading] = useState<Record<string, boolean>>({});
  const [officeNameErrors, setOfficeNameErrors] = useState<Record<string, string>>({});

  const loadFormConfig = useCallback(async () => {
    if (initialFormConfig) { // If a config is passed directly, use it
      console.log('🔍 DynamicForm: Using initial form config:', initialFormConfig);
      console.log('🔍 DynamicForm: selectedFrequency in initial config:', (initialFormConfig as any).selectedFrequency);

      // Add report frequency field if it exists in the configuration and not already in fields
      const enhancedConfig = { ...initialFormConfig };
      const hasReportFrequencyField = initialFormConfig.fields.some(field => field.id === 'reportFrequency');
      console.log('🔍 DynamicForm: Has existing report frequency field in initial config:', hasReportFrequencyField);

      if ((initialFormConfig as any).selectedFrequency && !hasReportFrequencyField) {
        console.log('✅ DynamicForm: Adding report frequency field to initial config with value:', (initialFormConfig as any).selectedFrequency);
        // Add report frequency as a disabled field at the beginning
        const reportFrequencyField: FormField = {
          id: 'reportFrequency',
          label: 'Report Frequency',
          type: 'text',
          defaultValue: (initialFormConfig as any).selectedFrequency,
          required: false,
          placeholder: 'Report frequency for this form'
        };
        enhancedConfig.fields = [reportFrequencyField, ...initialFormConfig.fields];
        console.log('✅ DynamicForm: Enhanced initial config fields:', enhancedConfig.fields);
      } else {
        console.log('⚠️ DynamicForm: Not adding report frequency field to initial config. selectedFrequency:', (initialFormConfig as any).selectedFrequency, 'hasExisting:', hasReportFrequencyField);
      }

      setFormConfig(enhancedConfig);
      const initialData: Record<string, any> = {};
      enhancedConfig.fields.forEach(field => {
        if (field.type !== 'button' && field.type !== 'section') {
          initialData[field.id] = field.defaultValue === undefined ? '' : field.defaultValue;
          if (field.type === 'checkbox' && typeof field.defaultValue !== 'boolean') {
            initialData[field.id] = false;
          }
          if (field.type === 'switch' && typeof field.defaultValue !== 'boolean') { // Initialize switch
            initialData[field.id] = false;
          }
          if (field.type === 'checkbox-group' && !Array.isArray(field.defaultValue)) { // Initialize checkbox-group
            initialData[field.id] = [];
          }
        }
      });
      setFormData(initialData);
      setLoading(false);
      return;
    }
    setLoading(true);
    setFetchError(null);
    setFormData({}); // Reset form data on new config load
    setErrors({});
    try {
      const docRef = doc(db, 'pages', cardId); // Assuming 'pages' collection stores form configs
      console.log('Attempting to fetch form config for cardId:', cardId); // Add this line
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as FormConfig; // Adjust if your Firestore structure is different
        console.log('🔍 DynamicForm: Loaded form config from Firebase:', data);
        console.log('🔍 DynamicForm: selectedFrequency in data:', (data as any).selectedFrequency);

        // Ensure fields array exists
        if (data && data.fields) {
          // Add report frequency field if it exists in the configuration and not already in fields
          const enhancedData = { ...data };
          const hasReportFrequencyField = data.fields.some(field => field.id === 'reportFrequency');
          console.log('🔍 DynamicForm: Has existing report frequency field:', hasReportFrequencyField);

          if ((data as any).selectedFrequency && !hasReportFrequencyField) {
            console.log('✅ DynamicForm: Adding report frequency field with value:', (data as any).selectedFrequency);
            // Add report frequency as a disabled field at the beginning
            const reportFrequencyField: FormField = {
              id: 'reportFrequency',
              label: 'Report Frequency',
              type: 'text',
              defaultValue: (data as any).selectedFrequency,
              required: false,
              placeholder: 'Report frequency for this form'
            };
            enhancedData.fields = [reportFrequencyField, ...data.fields];
            console.log('✅ DynamicForm: Enhanced fields array:', enhancedData.fields);
          } else {
            console.log('⚠️ DynamicForm: Not adding report frequency field. selectedFrequency:', (data as any).selectedFrequency, 'hasExisting:', hasReportFrequencyField);
          }

          setFormConfig(enhancedData);
          // Initialize form data with default values
          const initialData: Record<string, any> = {};
          enhancedData.fields.forEach(field => {
            if (field.type !== 'button' && field.type !== 'section') {
              initialData[field.id] = field.defaultValue === undefined ? '' : field.defaultValue;
              if (field.type === 'checkbox' && typeof field.defaultValue !== 'boolean') {
                initialData[field.id] = false; // Default checkbox to false if not specified
              }
              if (field.type === 'switch' && typeof field.defaultValue !== 'boolean') { // Initialize switch
                initialData[field.id] = false;
              }
              if (field.type === 'checkbox-group' && !Array.isArray(field.defaultValue)) { // Initialize checkbox-group
                initialData[field.id] = [];
              }
            }
          });
          setFormData(initialData);
        } else {
          console.error('Form configuration is missing fields for cardId:', cardId); // Add this line
          setFetchError('Form configuration is missing fields.');
          setFormConfig(null);
        }
      } else {
        console.warn('Form configuration not found in Firebase for cardId:', cardId);
        console.log('🔍 DynamicForm: Trying to load from Supabase...');

        // Try loading from Supabase if not found in Firebase
        try {
          const supabaseData = await supabasePageService.loadPageConfig(cardId);
          console.log('🔍 DynamicForm: Loaded from Supabase:', supabaseData);

          if (supabaseData && supabaseData.fields) {
            // Add report frequency field if it exists in the configuration and not already in fields
            const enhancedData = { ...supabaseData };
            const hasReportFrequencyField = supabaseData.fields.some(field => field.id === 'reportFrequency');
            console.log('🔍 DynamicForm: Has existing report frequency field in Supabase data:', hasReportFrequencyField);

            if (supabaseData.selectedFrequency && !hasReportFrequencyField) {
              console.log('✅ DynamicForm: Adding report frequency field from Supabase with value:', supabaseData.selectedFrequency);
              // Add report frequency as a disabled field at the beginning
              const reportFrequencyField: FormField = {
                id: 'reportFrequency',
                label: 'Report Frequency',
                type: 'text',
                defaultValue: supabaseData.selectedFrequency,
                required: false,
                placeholder: 'Report frequency for this form'
              };
              enhancedData.fields = [reportFrequencyField, ...supabaseData.fields];
              console.log('✅ DynamicForm: Enhanced Supabase fields array:', enhancedData.fields);
            } else {
              console.log('⚠️ DynamicForm: Not adding report frequency field from Supabase. selectedFrequency:', supabaseData.selectedFrequency, 'hasExisting:', hasReportFrequencyField);
            }

            setFormConfig(enhancedData);
            // Initialize form data with default values
            const initialData: Record<string, any> = {};
            enhancedData.fields.forEach(field => {
              if (field.type !== 'button' && field.type !== 'section') {
                initialData[field.id] = field.defaultValue === undefined ? '' : field.defaultValue;
                if (field.type === 'checkbox' && typeof field.defaultValue !== 'boolean') {
                  initialData[field.id] = false;
                }
                if (field.type === 'switch' && typeof field.defaultValue !== 'boolean') {
                  initialData[field.id] = false;
                }
                if (field.type === 'checkbox-group' && !Array.isArray(field.defaultValue)) {
                  initialData[field.id] = [];
                }
              }
            });
            setFormData(initialData);
            console.log('✅ DynamicForm: Successfully loaded from Supabase');
          } else {
            console.warn('Form configuration not found in Supabase either for cardId:', cardId);
            setFetchError('Form configuration not found.');
            setFormConfig(null);
          }
        } catch (supabaseError) {
          console.error('Error loading from Supabase:', supabaseError);
          setFetchError('Form configuration not found.');
          setFormConfig(null);
        }
      }
    } catch (err) {
      console.error('Error loading form configuration for cardId:', cardId, err); // Add this line
      setFetchError('Failed to load form configuration.');
    } finally {
      setLoading(false);
    }
  }, [cardId, initialFormConfig]); // Added initialFormConfig to dependencies

  // Function to fetch office names for a specific field
  const fetchOfficeNamesForField = useCallback(async (fieldId: string) => {
    // Check if we already have data for this field
    if (officeNameOptions[fieldId] && officeNameOptions[fieldId].length > 0) {
      return;
    }

    setOfficeNameLoading(prev => ({ ...prev, [fieldId]: true }));
    setOfficeNameErrors(prev => ({ ...prev, [fieldId]: '' }));

    try {
      // Use user-specific filtering for Office Name dropdowns
      const officeNames = await OfficeService.fetchUserSpecificOfficeNames();
      const options = OfficeService.officeNamesToOptions(officeNames);

      setOfficeNameOptions(prev => ({ ...prev, [fieldId]: options }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load office names';
      setOfficeNameErrors(prev => ({ ...prev, [fieldId]: errorMessage }));
    } finally {
      setOfficeNameLoading(prev => ({ ...prev, [fieldId]: false }));
    }
  }, [officeNameOptions]);

  useEffect(() => {
    if (cardId) {
      loadFormConfig();
    }
  }, [cardId, loadFormConfig]);



  const handleChange = (fieldId: string, value: any, type: FormField['type']) => {
    setFormData(prevData => {
      if (type === 'checkbox-group') {
        const currentValues = prevData[fieldId] || [];
        const newValue = value as string; // Value of the checkbox that changed
        const newArray = currentValues.includes(newValue)
          ? currentValues.filter((item: string) => item !== newValue)
          : [...currentValues, newValue];
        return {
          ...prevData,
          [fieldId]: newArray,
        };
      }
      return {
        ...prevData,
        [fieldId]: type === 'checkbox' || type === 'switch' ? (value as HTMLInputElement).checked : value,
      };
    });
    // Clear error for this field on change
    if (errors[fieldId]) {
      setErrors(prevErrors => {
        const newErrors = { ...prevErrors };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    if (!formConfig) return false;
    const newErrors: Record<string, string> = {};
    formConfig.fields.forEach(field => {
      if (field.required) {
        const value = formData[field.id];
        let isEmpty = false;
        if (field.type === 'checkbox' || field.type === 'switch') {
          isEmpty = value === false || value === undefined;
        } else if (field.type === 'checkbox-group') {
          isEmpty = !Array.isArray(value) || value.length === 0;
        } else {
          isEmpty = value === undefined || value === '';
        }

        if (isEmpty && field.type !== 'button' && field.type !== 'section') {
            newErrors[field.id] = `${field.label} is required.`;
        }
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Function to render Office Name dropdown with automatic data fetching
  const renderOfficeNameDropdown = (field: FormField) => {
    // Trigger fetch if not already done
    if (!officeNameOptions[field.id] && !officeNameLoading[field.id]) {
      fetchOfficeNamesForField(field.id);
    }

    const isLoading = officeNameLoading[field.id];
    const hasError = officeNameErrors[field.id];
    const options = officeNameOptions[field.id] || [];

    return (
      <div className="office-name-dropdown">
        <select
          id={field.id}
          name={field.id}
          onChange={(e) => handleChange(field.id, e.target.value, field.type)}
          className={`form-control ${errors[field.id] ? 'is-invalid' : ''} ${isLoading ? 'loading' : ''}`}
          value={formData[field.id] || ''}
          disabled={isReadOnly || isLoading}
          required={field.required}
        >
          <option value="">
            {isLoading ? 'Loading office names...' : (field.placeholder || 'Select an office')}
          </option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Loading indicator */}
        {isLoading && (
          <div className="loading-indicator mt-1">
            <small className="text-muted">
              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              Loading office names...
            </small>
          </div>
        )}

        {/* Error message with retry button */}
        {hasError && (
          <div className="error-message mt-1">
            <small className="text-danger d-flex align-items-center">
              <i className="bi bi-exclamation-triangle me-1"></i>
              {hasError}
              <button
                type="button"
                className="btn btn-link btn-sm p-0 ms-2"
                onClick={() => fetchOfficeNamesForField(field.id)}
                disabled={isLoading}
              >
                Retry
              </button>
            </small>
          </div>
        )}

        {/* Success indicator */}
        {!isLoading && !hasError && options.length > 0 && (
          <div className="success-indicator mt-1">
            <small className="text-success">
              <i className="bi bi-check-circle me-1"></i>
              {options.length} offices loaded
            </small>
          </div>
        )}
      </div>
    );
  };

  // Clear form after successful submission
  const clearFormAfterSubmission = React.useCallback(() => {
    console.log('🧹 Clearing form after successful submission...');

    const defaultValues = getDefaultValues();
    setFormData(defaultValues);
    setErrors({});
    setIsSubmitting(false);

    console.log('✅ Form cleared and defaults restored:', defaultValues);
    console.log('🎉 Form clearing completed - ready for next submission');

    // Notify parent component if callback provided
    if (onFormCleared) {
      onFormCleared();
    }
  }, [getDefaultValues, onFormCleared]);

  // Manual form clearing (for clear button)
  const clearForm = React.useCallback(() => {
    console.log('🧹 Manual form clearing initiated...');

    const emptyValues = getEmptyValues();
    setFormData(emptyValues);
    setErrors({});
    setIsSubmitting(false);

    console.log('🎉 Manual form clearing completed');

    // Show feedback to user
    alert('Form cleared successfully');
  }, [getEmptyValues]);

  // Expose clearFormAfterSubmission to parent component
  React.useImperativeHandle(ref, () => ({
    clearFormAfterSubmission
  }), [clearFormAfterSubmission]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (validateForm() && !isSubmitting) {
      setIsSubmitting(true);
      console.log('Form Data:', formData);
      onSubmitForm(formData); // Pass data to parent component
    } else {
      console.log('Validation errors:', errors);
    }
  };

  const renderField = (field: FormField) => {
    const commonProps = {
      // Removed id, name, onChange from commonProps as they are applied individually below
      className: `form-control ${errors[field.id] ? 'is-invalid' : ''}`,
      required: field.required,
      disabled: isReadOnly, // Disable field if read-only
    };

    switch (field.type) {
      case 'text':
        // Make report frequency field disabled
        const isReportFrequency = field.id === 'reportFrequency';
        const textProps = {
          ...commonProps,
          disabled: isReadOnly || isReportFrequency // Disable if read-only OR if it's report frequency
        };
        return <input type="text" id={field.id} name={field.id} onChange={(e) => handleChange(field.id, e.target.value, field.type)} {...textProps} value={formData[field.id] || ''} placeholder={field.placeholder} />;
      case 'textarea':
        return <textarea id={field.id} name={field.id} onChange={(e) => handleChange(field.id, e.target.value, field.type)} {...commonProps} value={formData[field.id] || ''} placeholder={field.placeholder} rows={4} />;
      case 'number':
        return <input type="number" id={field.id} name={field.id} onChange={(e) => handleChange(field.id, e.target.value, field.type)} {...commonProps} value={formData[field.id] || ''} placeholder={field.placeholder} min={field.min} max={field.max} />;
      case 'date':
        return <input type="date" id={field.id} name={field.id} onChange={(e) => handleChange(field.id, e.target.value, field.type)} {...commonProps} value={formData[field.id] || ''} />;
      case 'dropdown':
        // Check if this is an "Office Name" dropdown field
        if (field.label === 'Office Name') {
          return renderOfficeNameDropdown(field);
        }

        // Regular dropdown handling for other fields
        return (
          <select id={field.id} name={field.id} onChange={(e) => handleChange(field.id, e.target.value, field.type)} {...commonProps} value={formData[field.id] || ''}>
            <option value="">{field.placeholder || 'Select an option'}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option> // Use option.value for key and option.label for text
            ))}
          </select>
        );
      case 'radio':
        return (
          <div className="radio-group">
            {field.options?.map(option => (
              <div key={option.value} className="radio-item"> {/* Use option.value for key */}
                <input
                  type="radio"
                  id={`${field.id}-${option.value}`}
                  name={field.id}
                  value={option.value} // Use option.value for input value
                  checked={formData[field.id] === option.value}
                  onChange={(e) => handleChange(field.id, e.target.value, field.type)} // Use handleChange
                  // Removed {...commonProps} from here to avoid duplicate attributes
                />
                <label htmlFor={`${field.id}-${option.value}`}>{option.label}</label> {/* Use option.label for label text */}
              </div>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <div className="checkbox-item form-check">
            <input 
              type="checkbox" 
              id={field.id}
              name={field.id}
              className={`form-check-input ${errors[field.id] ? 'is-invalid' : ''}`}
              checked={!!formData[field.id]}
              onChange={(e) => handleChange(field.id, e.target as any, field.type)}
              required={field.required}
              disabled={isReadOnly}
            />
            <label htmlFor={field.id} className="form-check-label">{field.label}</label>
            {errors[field.id] && <div className="invalid-feedback">{errors[field.id]}</div>}
          </div>
        );
      case 'switch': // New case for Switch
        return (
          <div className="form-check form-switch">
            <input 
              type="checkbox" 
              role="switch"
              id={field.id}
              name={field.id}
              className={`form-check-input ${errors[field.id] ? 'is-invalid' : ''}`}
              checked={!!formData[field.id]}
              onChange={(e) => handleChange(field.id, e.target as any, field.type)}
              required={field.required}
              disabled={isReadOnly}
            />
            <label htmlFor={field.id} className="form-check-label">{field.label}</label>
            {errors[field.id] && <div className="invalid-feedback">{errors[field.id]}</div>}
          </div>
        );
      case 'checkbox-group': // New case for Checkbox Group
        return (
          <div className="checkbox-group">
            <label className="form-label">{field.label}{field.required && <span className="required-asterisk">*</span>}</label>
            {field.options?.map(option => (
              <div key={option.value} className="form-check"> {/* Use option.value for key */}
                <input 
                  type="checkbox"
                  id={`${field.id}-${option.value}`}
                  name={field.id}
                  value={option.value} // Use option.value for value
                  className={`form-check-input ${errors[field.id] ? 'is-invalid' : ''}`}
                  checked={formData[field.id]?.includes(option.value) || false} // Check against option.value
                  onChange={(e) => handleChange(field.id, e.target.value, field.type)}
                  // Individual checkboxes in a group might not be 'required' in the HTML sense, the group itself is.
                  disabled={isReadOnly}
                />
                <label htmlFor={`${field.id}-${option.value}`} className="form-check-label">{option.label}</label> {/* Use option.label for label */}
              </div>
            ))}
            {errors[field.id] && <div className="invalid-feedback d-block">{errors[field.id]}</div>}
          </div>
        );
      case 'file':
        return (
          <div className="file-upload">
            <input 
              type="file" 
              id={field.id} 
              name={field.id} 
              className={`file-input ${errors[field.id] ? 'is-invalid' : ''}`}
              onChange={(e) => handleChange(field.id, e.target.files ? e.target.files[0] : null, field.type)}
              required={field.required}
            />
            {/* <label htmlFor={field.id} className="file-label">{field.placeholder || 'Choose a file'}</label> */}
          </div>
        );
      case 'button':
        // Button is part of the form submit, not a field that collects data in the same way
        // It's handled by the main form's submit button
        return null; 
      case 'section':
        return <h4 className="section-title">{field.label}</h4>;
      default:
        return null;
    }
  };

  // Handle loading, error, and empty states
  if (loading) {
    return <div className="form-loading">Loading form...</div>;
  }

  if (fetchError) {
    return <div className="form-error">Error: {fetchError}</div>;
  }

  if (!formConfig || !formConfig.fields || formConfig.fields.length === 0) {
    return <div className="form-no-fields">No form fields configured for this page.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="dynamic-form">
      {fetchError && <div className="form-error error-message">{fetchError}</div>}
      {loading && !initialFormConfig && <div className="loading">Loading form...</div>} {/* Show loading only if not using initialFormConfig */}
      {formConfig?.fields.map(field => {
        if (field.type === 'section') {
          return (
            <div key={field.id} className="form-section">
              <h4>{field.label}</h4>
              {/* Optionally render a line or other separator */}
            </div>
          );
        }
        return (
          <div key={field.id} className="form-group">
            {field.type !== 'checkbox' && <label htmlFor={field.id}>{field.label}{field.required && <span className="required-asterisk">*</span>}</label>}
            {renderField(field)}
            {field.type === 'checkbox' && <label htmlFor={field.id} className="checkbox-label">{field.label}{field.required && <span className="required-asterisk">*</span>}</label>}
            {errors[field.id] && <div className="invalid-feedback">{errors[field.id]}</div>}
          </div>
        );
      })}
      {!isReadOnly && formConfig && formConfig.fields.length > 0 && (
        <div className="form-buttons">
          <button
            type="submit"
            className="submit-button"
            disabled={loading || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
          <button
            type="button"
            className="clear-button"
            onClick={clearForm}
            disabled={isSubmitting}
          >
            Clear
          </button>
        </div>
      )}
    </form>
  );
});

DynamicForm.displayName = 'DynamicForm';

export default DynamicForm;