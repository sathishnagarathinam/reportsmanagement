import React, { useEffect } from 'react';
import { REPORT_FREQUENCIES } from '../types/PageBuilderTypes';
import { useFirebaseOfficeData } from '../hooks/useFirebaseOfficeData';
import CheckboxDropdown from './CheckboxDropdown';
import { getUniqueOfficeTypes, filterOfficesByType, extractOfficeType } from '../utils/officeTypeUtils';

interface ReportConfigurationProps {
  selectedRegions: string[];
  selectedDivisions: string[];
  selectedOffices: string[];
  selectedOfficeTypes?: string[];
  selectedFrequency: string;
  fromEffectDate?: string;
  onRegionsChange: (regions: string[]) => void;
  onDivisionsChange: (divisions: string[]) => void;
  onOfficesChange: (offices: string[]) => void;
  onOfficeTypesChange?: (officeTypes: string[]) => void;
  onFrequencyChange: (frequency: string) => void;
  onFromEffectDateChange?: (date: string) => void;
}

const ReportConfiguration: React.FC<ReportConfigurationProps> = ({
  selectedRegions,
  selectedDivisions,
  selectedOffices,
  selectedOfficeTypes = [],
  selectedFrequency,
  fromEffectDate,
  onRegionsChange,
  onDivisionsChange,
  onOfficesChange,
  onOfficeTypesChange = () => {},
  onFrequencyChange,
  onFromEffectDateChange = () => {},
}) => {
  // Use custom hook to fetch office data from Firebase
  const { regions, divisions, offices, loading, error, refetch } = useFirebaseOfficeData();

  // Filter divisions based on selected regions
  const selectedRegionNames = selectedRegions.map(regionId =>
    regions.find(r => r.id === regionId)?.name
  ).filter(Boolean);

  const availableDivisions = selectedRegions.length > 0
    ? divisions.filter(division => selectedRegionNames.includes(division.region))
    : divisions; // Show all divisions if no regions selected

  // Filter offices based on selected divisions
  const selectedDivisionNames = selectedDivisions.map(divisionId =>
    divisions.find(d => d.id === divisionId)?.name
  ).filter(Boolean);

  let filteredOffices = selectedDivisions.length > 0
    ? offices.filter(office =>
        selectedRegionNames.includes(office.region) &&
        selectedDivisionNames.includes(office.division)
      )
    : selectedRegions.length > 0
      ? offices.filter(office => selectedRegionNames.includes(office.region))
      : offices; // Show all offices if no filters applied

  // Add division offices to the list if divisions are selected
  // This ensures division offices like "Coimbatore division" appear in the office dropdown
  if (selectedDivisions.length > 0) {
    const divisionOffices = offices.filter(office =>
      selectedDivisionNames.some(divisionName =>
        office.name.toLowerCase().includes(divisionName.toLowerCase()) &&
        office.name.toLowerCase().includes('division')
      )
    );

    // Add division offices that aren't already in the filtered list
    divisionOffices.forEach(divisionOffice => {
      if (!filteredOffices.some(office => office.id === divisionOffice.id)) {
        filteredOffices.push(divisionOffice);
      }
    });
  }

  // Apply office type filtering if office types are selected
  if (selectedOfficeTypes.length > 0) {
    filteredOffices = filterOfficesByType(filteredOffices, selectedOfficeTypes);
  }

  const availableOffices = filteredOffices;

  // Get unique office types from all available offices (before office type filtering)
  const preFilteredOffices = selectedDivisions.length > 0
    ? offices.filter(office =>
        selectedRegionNames.includes(office.region) &&
        selectedDivisionNames.includes(office.division)
      )
    : selectedRegions.length > 0
      ? offices.filter(office => selectedRegionNames.includes(office.region))
      : offices;

  const availableOfficeTypes = getUniqueOfficeTypes(preFilteredOffices.map(office => office.name));

  // Reset dependent selections when parent selections change
  useEffect(() => {
    if (selectedRegions.length > 0) {
      // Remove divisions that don't belong to selected regions
      const validDivisions = selectedDivisions.filter(divisionId => {
        const division = divisions.find(d => d.id === divisionId);
        return division && selectedRegionNames.includes(division.region);
      });

      if (validDivisions.length !== selectedDivisions.length) {
        onDivisionsChange(validDivisions);
      }
    }
  }, [selectedRegions, selectedDivisions, divisions, selectedRegionNames, onDivisionsChange]);

  useEffect(() => {
    if (selectedDivisions.length > 0) {
      // Remove offices that don't belong to selected regions/divisions
      // BUT allow division offices to remain selected
      const validOffices = selectedOffices.filter(officeId => {
        const office = offices.find(o => o.id === officeId);
        if (!office) return false;

        // Check if this is a division office
        const isDivisionOffice = selectedDivisionNames.some(divisionName =>
          office.name.toLowerCase().includes(divisionName.toLowerCase()) &&
          office.name.toLowerCase().includes('division')
        );

        // Allow division offices OR offices that belong to selected regions/divisions
        const belongsToSelection = selectedRegionNames.includes(office.region) &&
                                 selectedDivisionNames.includes(office.division);

        return isDivisionOffice || belongsToSelection;
      });

      if (validOffices.length !== selectedOffices.length) {
        onOfficesChange(validOffices);
      }
    }
  }, [selectedDivisions, selectedOffices, offices, selectedRegionNames, selectedDivisionNames, onOfficesChange]);

  // Reset office types when divisions change
  useEffect(() => {
    if (selectedDivisions.length === 0) {
      onOfficeTypesChange([]);
    }
  }, [selectedDivisions, onOfficeTypesChange]);

  // Reset offices when office types change
  useEffect(() => {
    if (selectedOfficeTypes.length > 0) {
      // Remove offices that don't match the selected office types
      const validOffices = selectedOffices.filter(officeId => {
        const office = offices.find(o => o.id === officeId);
        if (!office) return false;

        // Check if office matches any of the selected office types
        const officeTypeFromName = extractOfficeType(office.name);
        return selectedOfficeTypes.includes(officeTypeFromName);
      });

      if (validOffices.length !== selectedOffices.length) {
        onOfficesChange(validOffices);
      }
    }
  }, [selectedOfficeTypes, selectedOffices, offices, onOfficesChange]);

  return (
    <div className="report-configuration mt-3 mb-3">
      <h5>Report Configuration</h5>

      {loading && (
        <div className="alert alert-info">
          <div className="d-flex align-items-center">
            <div className="spinner-border spinner-border-sm me-2" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            Loading office data...
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          <strong>Error:</strong> {error}
          <button
            className="btn btn-sm btn-outline-danger ms-2"
            onClick={refetch}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="row">
            <div className="col-md-4">
              <CheckboxDropdown
                id="region-select"
                label="Select Regions"
                options={regions}
                selectedValues={selectedRegions}
                onChange={onRegionsChange}
                disabled={loading}
                placeholder="-- Select Regions --"
              />
            </div>

            <div className="col-md-4">
              <CheckboxDropdown
                id="division-select"
                label="Select Divisions"
                options={availableDivisions}
                selectedValues={selectedDivisions}
                onChange={onDivisionsChange}
                disabled={selectedRegions.length === 0 || loading}
                placeholder="-- Select Divisions --"
              />
            </div>

            <div className="col-md-4">
              <div className="form-group">
                <label htmlFor="frequency-select" className="form-label">
                  Report Frequency: <span className="text-danger">*</span>
                </label>
                <select
                  id="frequency-select"
                  className={`form-select ${!selectedFrequency ? 'is-invalid' : ''}`}
                  value={selectedFrequency}
                  onChange={(e) => onFrequencyChange(e.target.value)}
                  disabled={loading}
                  required
                >
                  <option value="">-- Select Frequency --</option>
                  {REPORT_FREQUENCIES.map(frequency => (
                    <option key={frequency.value} value={frequency.value}>
                      {frequency.label}
                    </option>
                  ))}
                </select>
                {!selectedFrequency && (
                  <div className="invalid-feedback">
                    Report frequency is required.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="row mt-3">
            <div className="col-md-6">
              <div className="form-group">
                <label htmlFor="from-effect-date" className="form-label">
                  From Effect Date
                </label>
                <input
                  id="from-effect-date"
                  type="date"
                  className="form-control"
                  value={fromEffectDate ?? ''}
                  onChange={(e) => onFromEffectDateChange(e.target.value)}
                  disabled={loading}
                />
                <small className="form-text text-muted">
                  Reports become pending from this date. If left blank, the form creation date is used.
                </small>
              </div>
            </div>
          </div>

          <div className="row mt-3">
            <div className="col-md-6">
              <CheckboxDropdown
                id="office-type-select"
                label="Filter by Office Type"
                options={availableOfficeTypes}
                selectedValues={selectedOfficeTypes}
                onChange={onOfficeTypesChange}
                disabled={selectedDivisions.length === 0 || loading}
                placeholder="-- Select Office Types --"
              />
            </div>
            <div className="col-md-6">
              <CheckboxDropdown
                id="office-select"
                label="Select Offices"
                options={availableOffices}
                selectedValues={selectedOffices}
                onChange={onOfficesChange}
                disabled={selectedDivisions.length === 0 || loading}
                placeholder="-- Select Offices --"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportConfiguration;
