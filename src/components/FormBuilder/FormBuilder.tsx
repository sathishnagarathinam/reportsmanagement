import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import UserFormBuilderService, {
  UserFormDefinition,
  FormField,
  FormFieldType,
  FormSharingPermission
} from '../../services/userFormBuilderService';
import { useAuth } from '../../contexts/AuthContext';
import FormFieldConfig from './FormFieldConfig';
import FormShareModal from './FormShareModal';
import './FormBuilder.css';

// Field type icons
const fieldTypeIcons: Record<FormFieldType, string> = {
  text: '📝',
  textarea: '📄',
  number: '🔢',
  date: '📅',
  datetime: '⏰',
  dropdown: '📋',
  multiselect: '☑️',
  radio: '⭕',
  checkbox: '☑️',
  'checkbox-group': '☑️',
  switch: '🔘',
  file: '📎',
  image: '🖼️',
  email: '📧',
  phone: '📱',
  url: '🔗',
  calculated: '🧮',
  reference: '🔗',
  section: '📑'
};

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

interface FormBuilderProps {
  formId?: string;
  onSave?: (form: UserFormDefinition) => void;
  onCancel?: () => void;
}

const FormBuilder: React.FC<FormBuilderProps> = ({ formId: propFormId, onSave, onCancel }) => {
  const navigate = useNavigate();
  const params = useParams();
  const { currentUser } = useAuth();
  
  const formId = propFormId || params.formId;
  
  const [form, setForm] = useState<UserFormDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [draggedFieldIndex, setDraggedFieldIndex] = useState<number | null>(null);

  // Initialize form
  useEffect(() => {
    const initForm = async () => {
      if (!currentUser) {
        setError('You must be logged in to create or edit forms');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        if (formId) {
          // Load existing form
          const existingForm = await UserFormBuilderService.getForm(formId, currentUser.uid);
          if (existingForm) {
            setForm(existingForm);
          } else {
            setError('Form not found or you do not have access to edit it');
          }
        } else {
          // Create new form
          const newForm: UserFormDefinition = {
            id: '', // Will be set when saved
            name: 'Untitled Form',
            description: '',
            fields: [],
            createdBy: currentUser.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isPublic: false,
            sharedWith: [],
            version: 1
          };
          setForm(newForm);
        }
      } catch (err) {
        console.error('Error initializing form:', err);
        setError('Failed to load form. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    initForm();
  }, [formId, currentUser]);

  // Add new field
  const handleAddField = useCallback((type: FormFieldType) => {
    if (!form) return;

    const newField: FormField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: fieldTypeLabels[type],
      type,
      placeholder: '',
      validation: {}
    };

    if (['dropdown', 'radio', 'checkbox-group', 'multiselect'].includes(type)) {
      newField.options = [
        { label: 'Option 1', value: 'option_1' },
        { label: 'Option 2', value: 'option_2' }
      ];
    }

    const updatedFields = [...form.fields, newField];
    setForm({ ...form, fields: updatedFields });
    setSelectedFieldId(newField.id);
  }, [form]);

  // Update field
  const handleUpdateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    if (!form) return;

    const updatedFields = form.fields.map(field =>
      field.id === fieldId ? { ...field, ...updates } : field
    );

    setForm({ ...form, fields: updatedFields });
  }, [form]);

  // Delete field
  const handleDeleteField = useCallback((fieldId: string) => {
    if (!form) return;

    const updatedFields = form.fields.filter(field => field.id !== fieldId);
    setForm({ ...form, fields: updatedFields });

    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  }, [form, selectedFieldId]);

  // Reorder fields (drag and drop)
  const handleDragStart = useCallback((index: number) => {
    setDraggedFieldIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedFieldIndex === null || draggedFieldIndex === index) return;

    if (!form) return;

    const newFields = [...form.fields];
    const [draggedField] = newFields.splice(draggedFieldIndex, 1);
    newFields.splice(index, 0, draggedField);

    setForm({ ...form, fields: newFields });
    setDraggedFieldIndex(index);
  }, [draggedFieldIndex, form]);

  const handleDragEnd = useCallback(() => {
    setDraggedFieldIndex(null);
  }, []);

  // Save form
  const handleSave = useCallback(async () => {
    if (!form || !currentUser) return;

    setIsSaving(true);
    setError(null);

    try {
      let savedForm: UserFormDefinition;

      if (form.id) {
        // Update existing form
        const updated = await UserFormBuilderService.updateForm(
          form.id,
          currentUser.uid,
          {
            name: form.name,
            description: form.description,
            fields: form.fields,
            settings: form.settings,
            category: form.category,
            tags: form.tags
          }
        );
        if (!updated) {
          throw new Error('Failed to update form');
        }
        savedForm = updated;
      } else {
        // Create new form
        savedForm = await UserFormBuilderService.createForm(currentUser.uid, {
          name: form.name,
          description: form.description,
          fields: form.fields,
          settings: form.settings,
          category: form.category,
          tags: form.tags
        });
      }

      setForm(savedForm);
      
      if (onSave) {
        onSave(savedForm);
      }
    } catch (err: any) {
      console.error('Error saving form:', err);
      setError(err.message || 'Failed to save form. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [form, currentUser, onSave]);

  // Cancel/close
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/forms');
    }
  }, [navigate, onCancel]);

  // Handle share modal
  const handleShare = useCallback(() => {
    if (form?.id) {
      setShowShareModal(true);
    } else {
      setError('Please save the form before sharing');
    }
  }, [form]);

  if (isLoading) {
    return (
      <div className="form-builder__loading">
        <div className="form-builder__loading-spinner" />
        <p>Loading form builder...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="form-builder__error">
        <p>Please log in to create or edit forms.</p>
        <button onClick={() => navigate('/login')} className="form-builder__btn form-builder__btn--primary">
          Go to Login
        </button>
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="form-builder__error">
        <p>{error}</p>
        <button onClick={handleCancel} className="form-builder__btn form-builder__btn--secondary">
          Go Back
        </button>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="form-builder__error">
        <p>Failed to load form. Please try again.</p>
        <button onClick={handleCancel} className="form-builder__btn form-builder__btn--secondary">
          Go Back
        </button>
      </div>
    );
  }

  const selectedField = form.fields.find(f => f.id === selectedFieldId);

  return (
    <div className="form-builder">
      <header className="form-builder__header">
        <div className="form-builder__title">
          <span>📝</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="form-builder__form-title-input"
            placeholder="Form Title"
          />
        </div>
        <div className="form-builder__actions">
          {error && (
            <span className="form-builder__error-text" style={{ color: '#e53e3e', fontSize: '14px' }}>
              {error}
            </span>
          )}
          <button
            onClick={handleShare}
            className="form-builder__btn form-builder__btn--secondary"
            disabled={!form.id}
          >
            🔗 Share
          </button>
          <button
            onClick={handleCancel}
            className="form-builder__btn form-builder__btn--secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="form-builder__btn form-builder__btn--primary"
            disabled={isSaving || !form.name.trim()}
          >
            {isSaving ? 'Saving...' : (form.id ? 'Update Form' : 'Save Form')}
          </button>
        </div>
      </header>

      <div className="form-builder__content">
        <aside className="form-builder__sidebar">
          <h3 className="form-builder__sidebar-title">Field Types</h3>
          <div className="form-builder__field-types">
            {(Object.keys(fieldTypeIcons) as FormFieldType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleAddField(type)}
                className="form-builder__field-type"
                title={fieldTypeLabels[type]}
              >
                <span className="form-builder__field-type-icon">{fieldTypeIcons[type]}</span>
                <span className="form-builder__field-type-label">{fieldTypeLabels[type]}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="form-builder__canvas">
          <div className="form-builder__form-preview">
            <div className="form-builder__form-header">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="form-builder__form-title-input"
                placeholder="Form Title"
              />
              <textarea
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="form-builder__form-description-input"
                placeholder="Form Description (optional)"
                rows={2}
              />
            </div>

            <div className="form-builder__fields">
              {form.fields.length === 0 ? (
                <div className="form-builder__empty-state">
                  <div className="form-builder__empty-state-icon">📋</div>
                  <h3>Start Building Your Form</h3>
                  <p>Click on a field type from the sidebar to add it to your form</p>
                </div>
              ) : (
                form.fields.map((field, index) => (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedFieldId(field.id)}
                    className={`form-builder__field ${
                      selectedFieldId === field.id ? 'form-builder__field--selected' : ''
                    } ${draggedFieldIndex === index ? 'form-builder__field--dragging' : ''}`}
                  >
                    <div className="form-builder__field-header">
                      <label className="form-builder__field-label">
                        {field.label}
                        {field.validation?.required && (
                          <span className="form-builder__field-required">*</span>
                        )}
                      </label>
                      <div className="form-builder__field-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteField(field.id);
                          }}
                          className="form-builder__field-btn form-builder__field-btn--danger"
                          title="Delete field"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="form-builder__field-input-preview">
                      {fieldTypeLabels[field.type]} field
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>

        {selectedField && (
          <aside className="form-builder__properties">
            <FormFieldConfig
              field={selectedField}
              onChange={(updates) => handleUpdateField(selectedField.id, updates)}
              onClose={() => setSelectedFieldId(null)}
            />
          </aside>
        )}
      </div>

      {showShareModal && form.id && (
        <FormShareModal
          formId={form.id}
          isPublic={form.isPublic}
          sharedWith={form.sharedWith}
          onClose={() => setShowShareModal(false)}
          onShare={async (shareData) => {
            if (!currentUser) return;
            await UserFormBuilderService.shareForm(form.id!, currentUser.uid, shareData);
          }}
          onUnshare={async (userId) => {
            if (!currentUser) return;
            await UserFormBuilderService.unshareForm(form.id!, currentUser.uid, userId);
          }}
          onSetPublic={async (isPublic) => {
            if (!currentUser) return;
            await UserFormBuilderService.setFormPublicStatus(form.id!, currentUser.uid, isPublic);
          }}
        />
      )}
    </div>
  );
};

export default FormBuilder;
