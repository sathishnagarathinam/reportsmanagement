import { useCallback } from 'react';
import { db } from '../../../../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { FormField, PageConfig, Category } from '../types/PageBuilderTypes';
import { FormField as DynamicFormField, FormConfig as DynamicFormConfig, FormFieldOption } from '../../../shared/DynamicForm';
import { supabasePageService } from '../services/supabasePageService';

interface UsePageConfigurationProps {
  categories: Category[];
  selectedCard: string;
  pageConfig: PageConfig | null;
  setPageConfig: (config: PageConfig | null) => void;
  fields: FormField[];
  setFields: (fields: FormField[]) => void;
  setAvailableDynamicFields: (fields: DynamicFormField[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSuccess: (success: string | null) => void;
  setPreviewContent: (content: string) => void;
  setIsPreviewOpen: (open: boolean) => void;
  // New dropdown values - updated to arrays for multiple selections
  selectedRegions: string[];
  selectedDivisions: string[];
  selectedOffices: string[];
  selectedFrequency: string;
  // Setters for dropdown values
  setSelectedRegions: (regions: string[]) => void;
  setSelectedDivisions: (divisions: string[]) => void;
  setSelectedOffices: (offices: string[]) => void;
  setSelectedFrequency: (frequency: string) => void;
}

export const usePageConfiguration = (props: UsePageConfigurationProps) => {
  const {
    categories,
    selectedCard,
    pageConfig,
    setPageConfig,
    fields,
    setFields,
    setAvailableDynamicFields,
    setLoading,
    setError,
    setSuccess,
    setPreviewContent,
    setIsPreviewOpen,
    selectedRegions,
    selectedDivisions,
    selectedOffices,
    selectedFrequency,
    setSelectedRegions,
    setSelectedDivisions,
    setSelectedOffices,
    setSelectedFrequency,
  } = props;

  const fetchDynamicFormFields = useCallback(async (formId: string) => {
    if (!formId) return;
    console.log(`Fetching dynamic form fields for formId: ${formId}`);
    try {
      const formConfigRef = doc(db, 'formConfigs', formId);
      const formConfigSnap = await getDoc(formConfigRef);
      if (formConfigSnap.exists()) {
        const formConfigData = formConfigSnap.data() as DynamicFormConfig;
        setAvailableDynamicFields(formConfigData.fields || []);
        console.log('Fetched dynamic fields:', formConfigData.fields);
      } else {
        console.log(`No dynamic form configuration found for formId: ${formId}`);
        setAvailableDynamicFields([]);
      }
    } catch (err) {
      console.error('Error fetching dynamic form fields:', err);
      setError('Failed to fetch dynamic form fields.');
      setAvailableDynamicFields([]);
    }
  }, [setAvailableDynamicFields, setError]);

  const loadPageConfig = useCallback(async (cardId: string) => {
    if (!cardId) {
      console.log('loadPageConfig called with no cardId');
      return;
    }
    console.log(`loadPageConfig called for cardId: ${cardId}`);
    setLoading(true);
    setError(null);
    try {
      // Try loading from Firebase first
      const docRef = doc(db, 'pages', cardId);
      const docSnap = await getDoc(docRef);

      let data: PageConfig | null = null;

      if (docSnap.exists()) {
        // Loading from Firebase
        data = docSnap.data() as PageConfig;
      } else {
        // If not found in Firebase, try Supabase
        try {
          data = await supabasePageService.loadPageConfig(cardId);
        } catch (supabaseError) {
          // Not found in either database, will create new config
        }
      }

      if (data) {
        setPageConfig(data);
        setFields(data.fields || []);
        // Load saved dropdown values - handle both old single values and new arrays
        setSelectedRegions(data.selectedRegions || (data.selectedRegion ? [data.selectedRegion] : []));
        setSelectedDivisions(data.selectedDivisions || (data.selectedDivision ? [data.selectedDivision] : []));
        setSelectedOffices(data.selectedOffices || (data.selectedOffice ? [data.selectedOffice] : []));
        setSelectedFrequency(data.selectedFrequency || '');
      } else {
        // Create new page config
        const card = categories.find(c => c.id === cardId);
        setPageConfig({
          id: cardId,
          title: card?.title || 'New Page',
          fields: [],
          lastUpdated: new Date().toISOString(),
        });
        setFields([]);
        // Reset dropdown values for new page
        setSelectedRegions([]);
        setSelectedDivisions([]);
        setSelectedOffices([]);
        setSelectedFrequency('');
      }
    } catch (err) {
      setError('Failed to load page configuration.');
      console.error(err);
      setPageConfig(null);
      setFields([]);
    } finally {
      setLoading(false);
    }
  }, [categories, setLoading, setError, setPageConfig, setFields, setSelectedRegions, setSelectedDivisions, setSelectedOffices, setSelectedFrequency]);

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: 'New Field',
      placeholder: '',
      options: [],
      required: false,
      region: '',
      division: '',
      office: '',
    };
    setFields([...fields, newField]);
  };

  const addFieldFromDynamic = (dynamicField: DynamicFormField) => {
    console.log('Attempting to add dynamic field:', dynamicField);
    const newField: FormField = {
      id: dynamicField.id,
      type: dynamicField.type,
      label: dynamicField.label,
      placeholder: dynamicField.placeholder,
      options: dynamicField.options ? dynamicField.options.map((opt: string | FormFieldOption) => {
        if (typeof opt === 'string') {
          return { label: opt, value: opt };
        } else {
          return { label: opt.label, value: opt.value };
        }
      }) : undefined,
      required: dynamicField.required,
      defaultValue: dynamicField.defaultValue,
      min: dynamicField.min,
      max: dynamicField.max,
      sectionTitle: undefined,
      columns: undefined,
      buttonText: undefined,
      buttonType: undefined,
      onClickAction: undefined,
      value: undefined,
    };

    if (fields.some(field => field.id === newField.id)) {
        console.warn(`Duplicate field ID detected: "${newField.id}". Field not added.`);
        setError(`Field with ID "${newField.id}" already exists in the page configuration.`);
        setTimeout(() => setError(null), 3000);
        return;
    }

    console.log('Adding new field to state:', newField);
    setFields([...fields, newField]);
    setSuccess(`Added field "${newField.label}" to page configuration.`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const updateField = (index: number, updatedField: FormField) => {
    const updatedFields = [...fields];
    updatedFields[index] = updatedField;
    setFields(updatedFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedCard || !pageConfig) {
      setError('No report selected or page configuration loaded.');
      return;
    }

    // Validate that report frequency is selected
    if (!selectedFrequency) {
      setError('Report frequency is required. Please select a frequency before saving.');
      return;
    }

    setLoading(true);
    console.log('Attempting to save page configuration for cardId:', selectedCard);
    console.log('Fields being saved:', fields);
    console.log('Report frequency:', selectedFrequency);

    try {
      const cleanedFields = fields.map(field => {
        const cleanedField: any = {};
        for (const key in field) {
          if (field[key] !== undefined) {
            cleanedField[key] = field[key];
          } else {
            cleanedField[key] = null;
          }
        }
        return cleanedField;
      });

      const updatedPageConfig: PageConfig = {
        ...pageConfig,
        id: selectedCard,
        title: categories.find(c => c.id === selectedCard)?.title || pageConfig.title,
        fields: cleanedFields,
        lastUpdated: new Date().toISOString(),
        selectedRegions,
        selectedDivisions,
        selectedOffices,
        selectedFrequency,
      };

      // Save to both Firebase and Supabase
      const savePromises = [];

      // Save to Firebase
      savePromises.push(
        setDoc(doc(db, 'pages', selectedCard), updatedPageConfig)
          .catch(err => {
            console.error('Firebase save failed:', err);
            throw new Error(`Firebase save failed: ${err.message}`);
          })
      );

      // Save to Supabase
      savePromises.push(
        supabasePageService.savePageConfig(updatedPageConfig)
          .catch(err => {
            console.error('Supabase save failed:', err);
            throw new Error(`Supabase save failed: ${err.message}`);
          })
      );

      // Wait for both saves to complete
      await Promise.all(savePromises);

      setPageConfig(updatedPageConfig);
      setSuccess('Page configuration saved successfully!');
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('Failed to save page configuration:', err);
      setError(`Failed to save page configuration: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (!pageConfig || fields.length === 0) {
      alert('No page configuration or fields to preview.');
      return;
    }

    const generatedPreview = `
      <h1>${pageConfig.title}</h1>
      <form>
        ${fields.map(field => {
          let fieldHtml = '';
          switch (field.type) {
            case 'text':
            case 'number':
            case 'date':
            case 'textarea':
              fieldHtml = `
                <div class="form-group mb-3">
                  <label class="form-label">${field.label}${field.required ? ' *' : ''}</label>
                  <input type="${field.type}" class="form-control" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''} />
                </div>
              `;
              break;
            case 'dropdown':
              fieldHtml = `
                <div class="form-group mb-3">
                  <label class="form-label">${field.label}${field.required ? ' *' : ''}</label>
                  <select class="form-control" ${field.required ? 'required' : ''}>
                    <option value="">Select ${field.label}</option>
                    ${field.options?.map(option => `<option value="${option.value}">${option.label}</option>`).join('') || ''}
                  </select>
                </div>
              `;
              break;
            case 'checkbox':
              fieldHtml = `
                <div class="form-check mb-3">
                  <input type="checkbox" class="form-check-input" id="${field.id}" ${field.required ? 'required' : ''} />
                  <label class="form-check-label" for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>
                </div>
              `;
              break;
            case 'radio':
              fieldHtml = `
                <div class="form-group mb-3">
                  <label class="form-label">${field.label}${field.required ? ' *' : ''}</label>
                  ${field.options?.map((option, i) => `
                    <div class="form-check">
                      <input class="form-check-input" type="radio" name="${field.id}" id="${field.id}-${i}" value="${option.value}" ${field.required ? 'required' : ''}>
                      <label class="form-check-label" for="${field.id}-${i}">${option.label}</label>
                    </div>
                  `).join('') || ''}
                </div>
              `;
              break;
            case 'section':
              fieldHtml = `
                <div class="card mt-3 mb-3">
                  <div class="card-header">${field.sectionTitle || 'Section'}</div>
                  <div class="card-body">
                    <p>Fields for this section would appear here in the actual form.</p>
                  </div>
                </div>
              `;
              break;
            case 'button':
              fieldHtml = `
                <button type="button" class="btn btn-primary mt-3">${field.buttonText || 'Button'}</button>
              `;
              break;
            default:
              fieldHtml = `<p>Unsupported field type: ${field.type}</p>`;
          }
          return fieldHtml;
        }).join('')}
      </form>
    `;

    setPreviewContent(generatedPreview);
    setIsPreviewOpen(true);
  };

  return {
    fetchDynamicFormFields,
    loadPageConfig,
    addField,
    addFieldFromDynamic,
    updateField,
    removeField,
    handleSave,
    handlePreview,
  };
};
