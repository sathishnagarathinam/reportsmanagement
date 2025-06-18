import React from 'react';
import { FaPlus, FaSave } from 'react-icons/fa';
import { FormField, PageConfig } from '../types/PageBuilderTypes';
import FieldConfigItem from './FieldConfigItem';

interface PageBuilderContentProps {
  pageConfig: PageConfig;
  fields: FormField[];
  onAddField: () => void;
  onUpdateField: (index: number, field: FormField) => void;
  onRemoveField: (index: number) => void;
  onSave: () => void;
  onPreview: () => void;
  loading: boolean;
}

const PageBuilderContent: React.FC<PageBuilderContentProps> = ({
  pageConfig,
  fields,
  onAddField,
  onUpdateField,
  onRemoveField,
  onSave,
  onPreview,
  loading,
}) => {
  return (
    <div className="builder-content">
      <h4>Page Configuration for: {pageConfig.title}</h4>
      
      <h5>Current Page Fields:</h5>
      {fields.map((field, index) => (
        <FieldConfigItem
          key={field.id || index}
          field={field}
          index={index}
          onUpdate={onUpdateField}
          onRemove={onRemoveField}
        />
      ))}
      
      <button onClick={onAddField} className="btn btn-info mt-3">
        <FaPlus /> Add Field
      </button>
      
      <button 
        onClick={onSave} 
        className="btn btn-success mt-3 ms-2" 
        disabled={loading || !pageConfig || fields.length === 0}
      >
        <FaSave /> {loading ? 'Saving...' : 'Save Page Configuration'}
      </button>
      
      <button 
        onClick={onPreview} 
        className="btn btn-secondary mt-3 ms-2" 
        disabled={!pageConfig || fields.length === 0}
      >
        Preview Page
      </button>
    </div>
  );
};

export default PageBuilderContent;
