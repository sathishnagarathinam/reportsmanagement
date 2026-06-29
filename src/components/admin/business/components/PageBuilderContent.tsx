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
  onMoveFieldUp: (index: number) => void;
  onMoveFieldDown: (index: number) => void;
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
  onMoveFieldUp,
  onMoveFieldDown,
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
          onMoveUp={onMoveFieldUp}
          onMoveDown={onMoveFieldDown}
          allFields={fields}
          isFirst={index === 0}
          isLast={index === fields.length - 1}
        />
      ))}
      
      <button onClick={onAddField} className="btn btn-info mt-3">
        {React.createElement(FaPlus as React.ComponentType<any>)} Add Field
      </button>
      
      <button 
        onClick={onSave} 
        className="btn btn-success mt-3 ms-2" 
        disabled={loading || !pageConfig || fields.length === 0}
      >
        {React.createElement(FaSave as React.ComponentType<any>)} {loading ? 'Saving...' : 'Save Page Configuration'}
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
