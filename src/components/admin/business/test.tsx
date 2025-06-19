import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../../config/firebase'; // Adjust path as needed
import { doc, setDoc, getDoc, collection, getDocs, writeBatch, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { FaEdit, FaTrash, FaPlus, FaSave, FaChevronDown, FaChevronRight, FaFileAlt, FaFolder, FaFolderOpen, FaCog } from 'react-icons/fa'; // Example icons
import Modal from '../../shared/Modal'; // Adjust path as needed
import { FormField as DynamicFormField, FormConfig as DynamicFormConfig } from '../../shared/DynamicForm';
import './PageBuilder.css'; // This line links the CSS file

// Interfaces (ensure these are defined or imported)
interface FormFieldOption {
  label: string;
  value: string;
}

// NOTE: This FormField interface is for the PageBuilder's internal state
// and represents the configuration being built for a specific 'page'.
// It's slightly different from the DynamicFormField used by the DynamicForm component.
interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'dropdown' | 'radio' | 'checkbox' | 'checkbox-group' | 'section' | 'button' | 'file' | 'switch'; // Added file and switch to match DynamicForm
  label: string;
  placeholder?: string;
  region?: string;
  division?: string;
  office?: string;
  options?: FormFieldOption[]; // For dropdown, radio, checkbox
  required?: boolean;
  value?: any; // Current value of the field (might not be used in builder, but kept for consistency)
  // For section type
  sectionTitle?: string;
  columns?: number; // Number of columns for fields within the section
  // For button type
  buttonText?: string;
  [key: string]: any; // Add this index signature
}
  

interface PageConfig {
  id: string;
  title: string;
  fields: FormField[];
  lastUpdated: string;
  isPage?: boolean; // New field
  pageId?: string; 
}

interface Category {
  id: string;
  title: string;
  path: string; // e.g., /categories/parent-id/child-id
  parentId: string | null;
  children?: Category[];
  icon?: string; // Icon name (e.g., 'FaFolder')
  color?: string; // Color for the icon/card
  fields?: FormField[]; // If storing form fields directly on category for some reason
  lastUpdated?: string;
  isPage: boolean; // New field
  pageId: string; 
}

// Helper function to generate card style (icon and color)
const generateCardStyle = (title: string) => {
  const hash = title
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const icons = [FaFolder, FaFileAlt, FaCog, FaFolderOpen]; // Add more icons if needed
  const colors = ['#FFC107', '#2196F3', '#4CAF50', '#E91E63', '#9C27B0'];

  const icon = icons[hash % icons.length];
  const color = colors[hash % colors.length];
  
  return { icon, color };
};

const PageBuilder: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [pageConfig, setPageConfig] = useState<PageConfig | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [availableDynamicFields, setAvailableDynamicFields] = useState<DynamicFormField[]>([]); // New state for fields from DynamicForm
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isAddingNewCard, setIsAddingNewCard] = useState<boolean>(false);
  const [newCardId, setNewCardId] = useState<string>('');
  const [newCardTitle, setNewCardTitle] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false); // For create confirmation

  const [editingCard, setEditingCard] = useState<Category | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);

  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);

  // New state variables for action dropdown
  const [actionType, setActionType] = useState<string>(''); // e.g., 'createNestedCard', 'createWebPage', 'addNewCardGlobal'
  // const [showActionModal, setShowActionModal] = useState<boolean>(false); // Not currently used, but kept if needed later

  // State for Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  // --- Helper Functions --- 
  const isMainCard = (cardId: string, allCategories: Category[]): boolean => {
    const card = allCategories.find(c => c.id === cardId);
    return card ? !card.parentId : false;
  };

  const isLeafCard = (cardId: string, allCategories: Category[]): boolean => {
    return !allCategories.some(c => c.parentId === cardId);
  };

  const checkDuplicateId = async (id: string): Promise<boolean> => {
    const docRef = doc(db, 'categories', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  };

  // --- Firestore Interaction Functions --- 
  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'categories'));
      const fetchedCategories = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(fetchedCategories);
    } catch (err) {
      setError('Failed to fetch categories.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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
  }, []);

  const loadPageConfig = useCallback(async (cardId: string) => {
    if (!cardId) {
      console.log('loadPageConfig called with no cardId'); // Added log
      return;
    }
    console.log(`loadPageConfig called for cardId: ${cardId}`); // Added log
    setLoading(true);
    setError(null);
    try {
      const docRef = doc(db, 'pages', cardId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as PageConfig;
        setPageConfig(data);
        setFields(data.fields || []);
      } else {
        const card = categories.find(c => c.id === cardId);
        setPageConfig({
          id: cardId,
          title: card?.title || 'New Page',
          fields: [],
          lastUpdated: new Date().toISOString(),
        });
        setFields([]);
      }
    } catch (err) {
      setError('Failed to load page configuration.');
      console.error(err);
      setPageConfig(null);
      setFields([]);
    } finally {
      setLoading(false);
    }
  }, [categories]); // Dependency on categories

  // --- useEffect for selectedCard and actionType changes ---
  useEffect(() => {
    if (selectedCard && isLeafCard(selectedCard, categories) && !isMainCard(selectedCard, categories) && actionType === 'createWebPage') {
      loadPageConfig(selectedCard);
      fetchDynamicFormFields(selectedCard); // Fetch dynamic fields as well
    } else if (selectedCard && (!isLeafCard(selectedCard, categories) || isMainCard(selectedCard, categories)) && actionType === 'createWebPage') {
      setPageConfig(null);
      setFields([]);
      setAvailableDynamicFields([]); // Clear dynamic fields
      // setError('Page configuration is only available for final nested cards that are not main cards.');
    } else if (!selectedCard) {
      setPageConfig(null);
      setFields([]);
      setAvailableDynamicFields([]); // Clear dynamic fields
      setActionType(''); // Reset action type if no card is selected
    }
    // If a card is selected but action is not createWebPage, or it's a parent, ensure builder is not shown
    // This logic is partly handled by conditional rendering below too
    if (selectedCard && actionType !== 'createWebPage') {
        // if (pageConfig?.id !== selectedCard) { // Avoid clearing if it's already for this card but action changed
        //     setPageConfig(null);
        //     setFields([]);
        // }
        // Also clear dynamic fields if not creating a web page
        setAvailableDynamicFields([]);
    }

  }, [selectedCard, categories, actionType, loadPageConfig, fetchDynamicFormFields]); // Removed pageConfig from dependencies

  // --- Card Management Functions ---
  const handleAddNewCard = async () => { // This function now just validates and opens the confirm modal
    if (!newCardId || !newCardTitle) {
      setError('Report ID and Title are required.');
      return;
    }
    setIsLoading(true); // For duplicate check
    const isDuplicate = await checkDuplicateId(newCardId);
    if (isDuplicate) {
      setError('This Report ID already exists. Please use a unique ID.');
      setIsLoading(false);
      return;
    }
    setIsLoading(false); // Done with validation
    setShowConfirmModal(true); // Show confirmation modal for creation
  };

  const handleConfirmCreate = async () => {
    if (!newCardId || !newCardTitle) {
        setError('Report ID and Title cannot be empty.');
        setShowConfirmModal(false);
        return;
    }
    let parentIdToSet: string | null = null;
    if (actionType === 'createNestedCard' && selectedCard) {
      parentIdToSet = selectedCard;
    } else if (actionType === 'addNewCardGlobal') {
      parentIdToSet = null; 
    } else if (selectedCard && actionType !== 'addNewCardGlobal') { // Default to nesting if a card is selected
        parentIdToSet = selectedCard;
    } 
    // If no actionType implies specific global creation and no card is selected, it's a main card
    else if (!selectedCard && actionType !== 'createNestedCard') { 
        parentIdToSet = null;
    }

    const parentPath = parentIdToSet ? categories.find(c => c.id === parentIdToSet)?.path : '/categories';
    // Corrected regular expression to ensure single slashes
    const newPath = `${parentPath}/${newCardId}`.replace(/\/+/g, '/');

    try {
      setIsLoading(true);
      setShowConfirmModal(false); // Close the confirmation modal first
      const cardRef = doc(db, 'categories', newCardId);
      const { icon: generatedIcon, color: generatedColor } = generateCardStyle(newCardTitle);
      
      await setDoc(cardRef, {
        id: newCardId,
        title: newCardTitle,
        path: newPath,
        parentId: parentIdToSet,
        lastUpdated: new Date().toISOString(),
        // Corrected icon property access
        icon: generatedIcon.name, // Storing the name of the react-icons component
        color: generatedColor,
        fields: [], // Initialize with empty fields for potential page config later if it becomes a leaf
        isPage: true, // Default to true for new categories
        pageId: newCardId, // Default pageId to newCategoryId
      });
  
      await fetchCategories(); 
      
      setNewCardId('');
      setNewCardTitle('');
      setIsAddingNewCard(false); // Close the form modal
      setActionType(''); 
      setSelectedCard(newCardId); // Optionally select the newly created card
      setSuccess(`Report "${newCardTitle}" has been created successfully!`);
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      setError('Error creating new report. Check console for details.');
      console.error('Error creating card:', err);
    } finally {
      setIsLoading(false); 
    }
  };

  const handleEditCard = (card: Category) => {
    setEditingCard(card);
    setNewCardTitle(card.title); // Pre-fill for editing title
    setShowEditModal(true);
  };

  const handleUpdateCard = async () => {
    if (!editingCard || !newCardTitle) return;
    try {
      setIsLoading(true);
      const cardRef = doc(db, 'categories', editingCard.id);
      await updateDoc(cardRef, { title: newCardTitle, lastUpdated: new Date().toISOString() });
      await fetchCategories();
      setShowEditModal(false);
      setEditingCard(null);
      setNewCardTitle('');
      setSuccess('Report updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update report.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (cardId: string) => {
    setCardToDelete(cardId);
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!cardToDelete) return;
    setIsLoading(true);
    try {
      const batch = writeBatch(db);
      const allDescendants = getAllDescendantIds(cardToDelete, categories);
      const idsToDelete = [cardToDelete, ...allDescendants];

      for (const id of idsToDelete) {
        batch.delete(doc(db, 'categories', id));
        batch.delete(doc(db, 'pages', id)); // Also delete associated page configurations
      }
      await batch.commit();
      await fetchCategories();
      
      setShowDeleteConfirmModal(false);
      setCardToDelete(null);
      setSelectedCard(''); // Reset selection
      setPageConfig(null);
      setFields([]);
      setSuccess('Report and all its nested items deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to delete report.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getAllDescendantIds = (parentId: string, allCategories: Category[]): string[] => {
    let descendants: string[] = [];
    const children = allCategories.filter(c => c.parentId === parentId);
    for (const child of children) {
      descendants.push(child.id);
      descendants = descendants.concat(getAllDescendantIds(child.id, allCategories));
    }
    return descendants;
  };

  // --- Page Builder Functions ---
  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: 'New Field',
      placeholder: '',
      options: [],
      required: false,
      // Add new fields for hierarchical dropdowns
      region: '',
      division: '',
      office: '',
    };
    setFields([...fields, newField]);
  };

  // Function to add a field based on a fetched dynamic field
  const addFieldFromDynamic = (dynamicField: DynamicFormField) => {
    console.log('Attempting to add dynamic field:', dynamicField); // Added log
    // Convert DynamicFormField to PageBuilder's FormField format
    const newField: FormField = {
      id: dynamicField.id, // Use the same ID
      type: dynamicField.type,
      label: dynamicField.label,
      placeholder: dynamicField.placeholder,
      // Convert options format if necessary (DynamicForm uses string[] or {label, value}[], PageBuilder uses {label, value}[])
      // Assuming DynamicForm options might be strings or {label, value} objects, handle both
      options: dynamicField.options ? dynamicField.options.map((opt: string | FormFieldOption) => {
        if (typeof opt === 'string') {
          return { label: opt, value: opt }; // Handle simple string options
        } else {
          return { label: opt.label, value: opt.value }; // Handle {label, value} options
        }
      }) : undefined,
      required: dynamicField.required,
      defaultValue: dynamicField.defaultValue,
      min: dynamicField.min,
      max: dynamicField.max,
      // Initialize PageBuilder specific properties
      sectionTitle: undefined,
      columns: undefined,
      buttonText: undefined,
      buttonType: undefined,
      onClickAction: undefined,
      value: undefined, // Value is for runtime, not builder config
    };

    // Check if a field with the same ID already exists to prevent duplicates
    if (fields.some(field => field.id === newField.id)) {
        console.warn(`Duplicate field ID detected: "${newField.id}". Field not added.`); // Added log
        setError(`Field with ID "${newField.id}" already exists in the page configuration.`);
        setTimeout(() => setError(null), 3000);
        return;
    }

    console.log('Adding new field to state:', newField); // Added log
    console.log('Fields before adding:', fields); // Added log
    setFields([...fields, newField]);
    console.log('Fields state update triggered.'); // Added log - Note: State update is async, this doesn't mean it's finished yet.
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
    setLoading(true);
    console.log('Attempting to save page configuration for cardId:', selectedCard); // Added log
    console.log('Fields being saved:', fields); // Added log
    try {
      // Clean fields to replace undefined with null for Firestore compatibility
      const cleanedFields = fields.map(field => {
        const cleanedField: any = {};
        for (const key in field) {
          if (field[key] !== undefined) {
            cleanedField[key] = field[key];
          } else {
            cleanedField[key] = null; // Replace undefined with null
          }
        }
        return cleanedField;
      });

      const updatedPageConfig: PageConfig = {
        ...pageConfig,
        id: selectedCard, // Ensure ID is correct
        title: categories.find(c => c.id === selectedCard)?.title || pageConfig.title, // Sync title
        fields: cleanedFields, // Save the cleaned fields
        lastUpdated: new Date().toISOString(),
       
      };
      
      await setDoc(doc(db, 'pages', selectedCard), updatedPageConfig);
      console.log('Page configuration saved successfully to Firestore.'); // Added log
      setPageConfig(updatedPageConfig); // Update local state
      setSuccess('Page configuration saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to save page configuration to Firestore:', err); // Added log
      setError('Failed to save page configuration.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (!pageConfig || fields.length === 0) {
      alert('No page configuration or fields to preview.');
      return;
    }

    // Generate a simple preview based on the current fields
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
              // Assuming radio options are handled similarly to dropdown options but as individual inputs
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
            // Add cases for other field types as needed
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

  // --- Rendering Functions ---
  const organizeCards = (list: Category[]): Category[] => {
    const map: { [key: string]: Category } = {};
    const roots: Category[] = [];
    list.forEach(item => {
      map[item.id] = { ...item, children: [] }; 
    });
    list.forEach(item => {
      if (item.parentId && map[item.parentId]) {
        map[item.parentId].children?.push(map[item.id]);
      } else {
        roots.push(map[item.id]);
      }
    });
    return roots;
  };

  // Added explicit return type JSX.Element[]
  const renderCardOptions = (cards: Category[], level = 0): React.ReactElement[] => {
    return cards.flatMap(card => [
      <option key={card.id} value={card.id} style={{ paddingLeft: `${level * 20}px` }}>
        {`${'--'.repeat(level)} ${card.title}`}
      </option>,
      ...(card.children && card.children.length > 0 ? renderCardOptions(card.children, level + 1) : []),
    ]);
  };
  
  const renderSectionContent = (field: FormField, index: number) => {
    const handleOptionChange = (optIndex: number, value: string, key: 'label' | 'value') => {
      const newOptions = [...(field.options || [])];
      newOptions[optIndex] = { ...newOptions[optIndex], [key]: value };
      updateField(index, { ...field, options: newOptions });
    };

    const addOption = () => {
      const newOptions = [...(field.options || []), { label: '', value: '' }];
      updateField(index, { ...field, options: newOptions });
    };

    const removeOption = (optIndex: number) => {
      const newOptions = field.options?.filter((_, i) => i !== optIndex);
      updateField(index, { ...field, options: newOptions });
    };

    // Helper to handle default value changes for different input types
    const handleDefaultValueChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { value, type } = e.target;
      let newDefaultValue: any = value;
      if (type === 'checkbox') {
        newDefaultValue = (e.target as HTMLInputElement).checked;
      }
      // For checkbox-group, we'd need a more complex handler if defaultValue is an array
      // For now, assuming single string/boolean for simplicity in this part
      updateField(index, { ...field, defaultValue: newDefaultValue });
    };

    return (
      <div key={field.id || index} className="field-config-item card mb-3"> {/* Added card and mb-3 classes */}
        <div className="card-header d-flex justify-content-between align-items-center"> {/* Added card-header and flex classes */}
            <strong>{field.label || 'Unnamed Field'}</strong> ({field.type}) {/* Added default label */}
            <button onClick={() => removeField(index)} className="btn btn-danger btn-sm"> {/* Added btn, btn-danger, btn-sm classes */}
              {React.createElement(FaTrash as React.ComponentType<any>)} Remove
            </button>
        </div>
        <div className="card-body"> {/* Added card-body class */}
          {/* Field Type Selector */}
          <div className="form-group"> {/* Added form-group class */}
            <label htmlFor={`field-type-${index}`} className="form-label">Type: </label> {/* Added form-label class */}
            <select
              id={`field-type-${index}`}
              className="form-control"
              value={field.type}
              onChange={(e) => updateField(index, {...field, type: e.target.value as FormField['type'], options: field.type !== 'dropdown' && field.type !== 'radio' && field.type !== 'checkbox-group' ? undefined : field.options, placeholder: field.type === 'section' || field.type === 'button' ? undefined : field.placeholder })}
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
              <option value="section">Section Header</option>
              <option value="button">Button</option>
            </select>
          </div>

          <div className="form-group"> {/* Added form-group class */}
            <label htmlFor={`field-label-${index}`} className="form-label">Label: </label> {/* Added form-label class */}
            <input
              id={`field-label-${index}`}
              type="text"
              className="form-control"
              value={field.label}
              onChange={(e) => updateField(index, {...field, label: e.target.value})}
              required // Basic browser validation for required
            />
          </div>

          {['text', 'textarea', 'number', 'date'].includes(field.type) && (
            <div className="form-group"> {/* Added form-group class */}
              <label htmlFor={`field-placeholder-${index}`} className="form-label">Placeholder: </label> {/* Added form-label class */}
              <input
                id={`field-placeholder-${index}`}
                type="text"
                className="form-control"
                value={field.placeholder || ''}
                onChange={(e) => updateField(index, {...field, placeholder: e.target.value})}
              />
            </div>
          )}

          {field.type === 'number' && (
            <>
              <div className="form-group"> {/* Added form-group class */}
                <label htmlFor={`field-min-${index}`} className="form-label">Min Value: </label> {/* Added form-label class */}
                <input
                  id={`field-min-${index}`}
                  type="number"
                  className="form-control"
                  value={field.min === undefined ? '' : field.min}
                  onChange={(e) => updateField(index, {...field, min: e.target.value === '' ? undefined : parseFloat(e.target.value)})}
                />
              </div>
              <div className="form-group"> {/* Added form-group class */}
                <label htmlFor={`field-max-${index}`} className="form-label">Max Value: </label> {/* Added form-label class */}
                <input
                  id={`field-max-${index}`}
                  type="number"
                  className="form-control"
                  value={field.max === undefined ? '' : field.max}
                  onChange={(e) => updateField(index, {...field, max: e.target.value === '' ? undefined : parseFloat(e.target.value)})}
                />
              </div>
            </>
          )}

          {['dropdown', 'radio', 'checkbox-group'].includes(field.type) && (
            <div className="form-group field-options-config"> {/* Added form-group class */}
              <label className="form-label">Options: </label> {/* Added form-label class */}
              {field.options?.map((opt, optIndex) => { // Added explicit curly brace and return
        return (
          <div key={optIndex} className="input-group mb-2"> {/* Added input-group and mb-2 classes */}
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
            <button type="button" onClick={() => removeOption(optIndex)} className="btn btn-outline-danger"> {/* Added btn and btn-outline-danger classes */}
              Remove
            </button>
          </div>
        );
      })}
              <button type="button" onClick={addOption} className="btn btn-secondary btn-sm"> {/* Added btn, btn-secondary, btn-sm classes */}
                Add Option
              </button>
            </div>
          )}

          {/* Default Value - Type specific handling */}
          {['text', 'textarea', 'number', 'date'].includes(field.type) && (
              <div className="form-group"> {/* Added form-group class */}
                  <label htmlFor={`field-default-value-${index}`} className="form-label">Default Value: </label> {/* Added form-label class */}
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
              <div className="form-group form-check"> {/* Added form-group and form-check classes */}
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
               <div className="form-group"> {/* Added form-group class */}
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
              <div className="form-group"> {/* Added form-group class */}
                  <label className="form-label">Default Values (comma-separated): </label>
                  <input
                      type="text"
                      className="form-control"
                      value={Array.isArray(field.defaultValue) ? field.defaultValue.join(',') : ''}
                      onChange={(e) => updateField(index, {...field, defaultValue: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                      placeholder="value1,value2"
                  />
              </div>
          )}

          {field.type === 'button' && (
            <div className="form-group"> {/* Added form-group class */}
              <label htmlFor={`field-button-text-${index}`} className="form-label">Button Text: </label>
              <input
                id={`field-button-text-${index}`}
                type="text"
                className="form-control"
                value={field.buttonText || ''}
                onChange={(e) => updateField(index, {...field, buttonText: e.target.value})}
              />
            </div>
          )}

          {field.type === 'section' && (
            <div className="form-group"> {/* Added form-group class */}
              <label htmlFor={`field-section-title-${index}`} className="form-label">Section Title: </label>
              <input
                id={`field-section-title-${index}`}
                type="text"
                className="form-control"
                value={field.sectionTitle || ''}
                onChange={(e) => updateField(index, {...field, sectionTitle: e.target.value})}
              />
            </div>
          )}

          {/* Required Checkbox (excluding button and section) */}
          {!['button', 'section'].includes(field.type) && (
            <div className="form-group form-check"> {/* Added form-group and form-check classes */}
              <input
                id={`field-required-${index}`}
                type="checkbox"
                className="form-check-input"
                checked={!!field.required}
                onChange={(e) => updateField(index, {...field, required: e.target.checked})}
              />
              <label htmlFor={`field-required-${index}`} className="form-check-label"> Required</label>
            </div>
          )}
        </div> {/* End card-body */}
      </div> // End field-config-item
    );
  };

  // --- Main Return JSX ---
  return (
    <> {/* Add fragment wrapper */}
    <div className="page-builder">
      {error && <div className="error-message">{error}</div>}
      {success && (
        <div className="success-message">
          {success}
        </div>
      )}
      <h2>Report & Page Builder</h2>
      <div className="card-selector">
        <select
          value={selectedCard}
          onChange={(e) => {
            const newSelectedCard = e.target.value;
            setSelectedCard(newSelectedCard);
            setActionType(''); // Reset action type on card change
            if (!newSelectedCard) {
                setPageConfig(null);
                setFields([]);
            } else {
                // If the new card is not a leaf, or is a main card, clear page config
                // unless the action is specifically to create/edit a page for a valid leaf card.
                const cardIsLeaf = isLeafCard(newSelectedCard, categories);
                const cardIsMain = isMainCard(newSelectedCard, categories);
                if(!cardIsLeaf || cardIsMain) {
                    setPageConfig(null);
                    setFields([]);
                }
            }
          }}
          className="form-select"
          disabled={isLoading}
        >
          <option value="">{isLoading ? 'Loading Reports...' : 'Select or Create New Report'}</option>
          {renderCardOptions(organizeCards(categories))}
        </select>

        <div className="action-dropdown-container">
          <select
            value={actionType}
            onChange={(e) => {
              const newAction = e.target.value;
              setActionType(newAction);
              if (newAction === 'createNestedCard' || newAction === 'addNewCardGlobal') {
                setNewCardId('');
                setNewCardTitle('');
                // setShowConfirmModal(true); // Open confirm modal directly for creation flow
                setIsAddingNewCard(true); // This opens the form modal
              } else if (newAction === 'createWebPage') {
                if (selectedCard && isLeafCard(selectedCard, categories) && !isMainCard(selectedCard, categories)) {
                  loadPageConfig(selectedCard);
                } else if (selectedCard) {
                  setError('Web page can only be created/edited for a final nested report (not a main report).');
                  setPageConfig(null);
                  setFields([]);
                }
              } else if (newAction === '') { 
                // If 'Select Action...' is chosen, and current card is not a valid target for builder, clear it.
                if (selectedCard && (!isLeafCard(selectedCard, categories) || isMainCard(selectedCard, categories))) {
                    setPageConfig(null); 
                    setFields([]);
                }
              }
            }}
            className="form-select action-dropdown"
          >
            <option value="">Select Action...</option>
            <option value="addNewCardGlobal" disabled={!!selectedCard}>
              Create New Main Report
            </option>
            {selectedCard && (
              <>
                <option value="createNestedCard">
                  Create Nested Report
                </option>
                <option
                  value="createWebPage"
                  disabled={!isLeafCard(selectedCard, categories) || isMainCard(selectedCard, categories)}
                >
                  Create/Edit Web Page for this Report
                </option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Modal for adding/creating new card (triggered by isAddingNewCard) */}
      {isAddingNewCard && (
        <Modal
          isOpen={isAddingNewCard}
          onClose={() => {
            setIsAddingNewCard(false);
            setActionType(''); // Reset action type when modal closes
            setNewCardId('');
            setNewCardTitle('');
          }}
          title={
            actionType === 'addNewCardGlobal' ? "Create New Main Report" :
            selectedCard && actionType === 'createNestedCard' ? `Add Nested Report under "${categories.find(c => c.id === selectedCard)?.title}"` :
            "Create New Report" // Fallback title
          }
        >
          <div className="new-card-form">
            <input
              type="text"
              placeholder="Report ID (e.g., 'new-report-id')"
              value={newCardId}
              onChange={(e) => setNewCardId(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              className="form-control mb-2"
            />
            <input
              type="text"
              placeholder="Report Title"
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              className="form-control mb-2"
            />
            <div className="form-buttons modal-buttons">
              <button
                onClick={handleConfirmCreate} // Directly call confirm create
                disabled={isLoading || !newCardId || !newCardTitle}
                className="btn btn-primary"
              >
                {isLoading ? 'Creating...' : 'Confirm & Create Report'}
              </button>
              <button onClick={() => {
                setIsAddingNewCard(false);
                setActionType('');
                setNewCardId('');
                setNewCardTitle('');
              }} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Conditional Rendering for Card Management OR Page Builder OR Warnings */}
      {selectedCard && (
        <>
          {/* Card Management Section (Edit/Delete selected card) */} 
          {/* Show if a card is selected, regardless of action, but not if builder is active for it */} 
          {!(actionType === 'createWebPage' && isLeafCard(selectedCard, categories) && !isMainCard(selectedCard, categories) && pageConfig) && (
             <div className="card-management">
                <h3>Report Details: "{categories.find(c => c.id === selectedCard)?.title || ''}"</h3>
                <div className="card-actions">
                    <button
                    onClick={() => handleEditCard(categories.find(c => c.id === selectedCard)!)}
                    className="edit-button btn btn-outline-primary btn-sm me-2"
                    disabled={!selectedCard}
                    >
                    {React.createElement(FaEdit as React.ComponentType<any>)} Edit Name
                    </button>
                    <button
                    onClick={() => handleDeleteClick(selectedCard)}
                    className="delete-button btn btn-outline-danger btn-sm"
                    disabled={!selectedCard}
                    >
                    {React.createElement(FaTrash as React.ComponentType<any>)} Delete Report
                    </button>
                </div>
            </div>
          )}

          {/* Page Builder Content */} 
          {actionType === 'createWebPage' && isLeafCard(selectedCard, categories) && !isMainCard(selectedCard, categories) && pageConfig && (
            <div className="builder-content">
              <h4>Page Configuration for: {pageConfig.title}</h4>
              {/* Display current fields for PageBuilder */}
              <h5>Current Page Fields:</h5>
              {fields.map((field, index) => (
                <div key={field.id || index} className="field-config-item p-2 border mb-2 rounded">
                  {renderSectionContent(field, index)} 
                  <button onClick={() => removeField(index)} className="btn btn-danger btn-sm mt-2">Remove This Field</button>
                </div>
              ))}
              <button onClick={addField} className="btn btn-info mt-3">{React.createElement(FaPlus as React.ComponentType<any>)} Add Field</button>
              <button onClick={handleSave} className="btn btn-success mt-3 ms-2" disabled={loading || !pageConfig || fields.length === 0}>
                {React.createElement(FaSave as React.ComponentType<any>)} {loading ? 'Saving...' : 'Save Page Configuration'}
              </button>
              <button onClick={handlePreview} className="btn btn-secondary mt-3 ms-2" disabled={!pageConfig || fields.length === 0}>
                Preview Page
              </button>
            </div>
          )}

          {/* Warning Messages */} 
          {actionType === 'createWebPage' && (!isLeafCard(selectedCard, categories) || isMainCard(selectedCard, categories)) && (
            <div className="warning-message mt-3 p-2 bg-warning text-dark rounded">
              Page configuration is only available for final nested reports (which are not main reports). Please select an appropriate nested report to configure its page, or create one.
            </div>
          )}
          {actionType !== 'createWebPage' && !isLeafCard(selectedCard, categories) && (
             <div className="info-message mt-3 p-2 bg-info text-dark rounded">
              This is a parent report. You can create nested reports under it or select an existing nested report to manage or configure its page.
            </div>
          )}
        </>
      )}

      {!selectedCard && actionType === '' && (
        <div className="info-message mt-3 p-3 bg-light border rounded">
          <p>Select a report from the dropdown to manage it or configure its web page (if applicable).</p>
          <p>If no reports exist, or to create a new top-level report, choose "Create New Main Report" from the action dropdown after clearing any selection.</p>
        </div>
      )}

      {/* Modals for Edit and Delete Confirmation (already defined above, ensure they are outside conditional blocks if they need to be always available) */} 
      {showEditModal && editingCard && (
        <Modal isOpen={showEditModal} onClose={() => {setShowEditModal(false); setNewCardTitle(''); setEditingCard(null);}} title={`Edit Report: ${editingCard.title}`}>
          <input 
            type="text" 
            value={newCardTitle} 
            onChange={(e) => setNewCardTitle(e.target.value)} 
            placeholder="New Report Title"
            className="form-control mb-2"
          />
          <div className="form-buttons modal-buttons">
            <button onClick={handleUpdateCard} className="btn btn-primary" disabled={isLoading || !newCardTitle.trim()}> {isLoading ? 'Updating...' : 'Update Title'}</button>
            <button onClick={() => {setShowEditModal(false); setNewCardTitle(''); setEditingCard(null);}} className="btn btn-secondary">Cancel</button>
          </div>
        </Modal>
      )}

      {showDeleteConfirmModal && cardToDelete && (
        <Modal isOpen={showDeleteConfirmModal} onClose={() => setShowDeleteConfirmModal(false)} title="Confirm Deletion">
          <p>Are you sure you want to delete the report "{categories.find(c => c.id === cardToDelete)?.title}" and ALL its nested reports and associated page configurations? This action cannot be undone.</p>
          <div className="form-buttons modal-buttons">
            <button onClick={handleConfirmDelete} className="btn btn-danger" disabled={isLoading}>{isLoading ? 'Deleting...' : 'Confirm Delete'}</button>
            <button onClick={() => setShowDeleteConfirmModal(false)} className="btn btn-secondary">Cancel</button>
          </div>
        </Modal>
      )}

    </div> {/* End of page-builder div */}

      {/* Preview Modal */}
      <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title="Page Preview">
        <div dangerouslySetInnerHTML={{ __html: previewContent }} />
      </Modal>
    </> // Add closing fragment
  );
};

export default PageBuilder;


