import React, { useEffect } from 'react';
import { REPORT_FREQUENCIES } from '../types/PageBuilderTypes';
import { useOfficeDataSimple as useOfficeData } from '../hooks/useOfficeDataSimple';
import CheckboxDropdown from './CheckboxDropdown';

interface ReportConfigurationProps {
  selectedRegions: string[];
  selectedDivisions: string[];
  selectedOffices: string[];
  selectedFrequency: string;
  onRegionsChange: (regions: string[]) => void;
  onDivisionsChange: (divisions: string[]) => void;
  onOfficesChange: (offices: string[]) => void;
  onFrequencyChange: (frequency: string) => void;
}

const ReportConfiguration: React.FC<ReportConfigurationProps> = ({
  selectedRegions,
  selectedDivisions,
  selectedOffices,
  selectedFrequency,
  onRegionsChange,
  onDivisionsChange,
  onOfficesChange,
  onFrequencyChange,
}) => {
  // Use custom hook to fetch office data from Supabase
  const { regions, divisions, offices, loading, error, refetch } = useOfficeData();

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

  const availableOffices = selectedDivisions.length > 0
    ? offices.filter(office =>
        selectedRegionNames.includes(office.region) &&
        selectedDivisionNames.includes(office.division)
      )
    : selectedRegions.length > 0
      ? offices.filter(office => selectedRegionNames.includes(office.region))
      : offices; // Show all offices if no filters applied

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
      const validOffices = selectedOffices.filter(officeId => {
        const office = offices.find(o => o.id === officeId);
        return office &&
               selectedRegionNames.includes(office.region) &&
               selectedDivisionNames.includes(office.division);
      });

      if (validOffices.length !== selectedOffices.length) {
        onOfficesChange(validOffices);
      }
    }
  }, [selectedDivisions, selectedOffices, offices, selectedRegionNames, selectedDivisionNames, onOfficesChange]);

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
        <div className="row">
          <div className="col-md-3">
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

          <div className="col-md-3">
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

          <div className="col-md-3">
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

          <div className="col-md-3">
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
      )}
    </div>
  );
};

export default ReportConfiguration;
