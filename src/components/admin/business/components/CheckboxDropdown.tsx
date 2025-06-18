import React, { useState, useRef, useEffect } from 'react';

interface Option {
  id: string;
  name: string;
}

interface CheckboxDropdownProps {
  id: string;
  label: string;
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

const CheckboxDropdown: React.FC<CheckboxDropdownProps> = ({
  id,
  label,
  options,
  selectedValues,
  onChange,
  disabled = false,
  placeholder = "-- Select Options --"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCheckboxChange = (optionId: string) => {
    if (selectedValues.includes(optionId)) {
      // Remove from selection
      onChange(selectedValues.filter(id => id !== optionId));
    } else {
      // Add to selection
      onChange([...selectedValues, optionId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedValues.length === options.length) {
      // Deselect all
      onChange([]);
    } else {
      // Select all
      onChange(options.map(option => option.id));
    }
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    } else if (selectedValues.length === 1) {
      const selectedOption = options.find(option => option.id === selectedValues[0]);
      return selectedOption?.name || placeholder;
    } else {
      return `${selectedValues.length} selected`;
    }
  };

  const isAllSelected = selectedValues.length === options.length && options.length > 0;
  const isIndeterminate = selectedValues.length > 0 && selectedValues.length < options.length;

  return (
    <div className="form-group">
      <label htmlFor={id} className="form-label">{label}:</label>
      <div className="dropdown" ref={dropdownRef}>
        <button
          id={id}
          className={`btn btn-outline-secondary dropdown-toggle w-100 text-start ${disabled ? 'disabled' : ''}`}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          style={{ 
            backgroundColor: disabled ? '#e9ecef' : 'white',
            borderColor: '#ced4da'
          }}
        >
          <span className={selectedValues.length === 0 ? 'text-muted' : ''}>
            {getDisplayText()}
          </span>
        </button>
        
        {isOpen && !disabled && (
          <div className="dropdown-menu show w-100" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {/* Select All Option */}
            {options.length > 1 && (
              <>
                <div className="dropdown-item">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`${id}-select-all`}
                      checked={isAllSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isIndeterminate;
                      }}
                      onChange={handleSelectAll}
                    />
                    <label className="form-check-label fw-bold" htmlFor={`${id}-select-all`}>
                      Select All ({options.length})
                    </label>
                  </div>
                </div>
                <hr className="dropdown-divider" />
              </>
            )}
            
            {/* Individual Options */}
            {options.map(option => (
              <div key={option.id} className="dropdown-item">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`${id}-${option.id}`}
                    checked={selectedValues.includes(option.id)}
                    onChange={() => handleCheckboxChange(option.id)}
                  />
                  <label className="form-check-label" htmlFor={`${id}-${option.id}`}>
                    {option.name}
                  </label>
                </div>
              </div>
            ))}
            
            {options.length === 0 && (
              <div className="dropdown-item text-muted">
                <em>No options available</em>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Selected count indicator */}
      {selectedValues.length > 0 && (
        <small className="text-muted mt-1 d-block">
          {selectedValues.length} of {options.length} selected
        </small>
      )}
    </div>
  );
};

export default CheckboxDropdown;
