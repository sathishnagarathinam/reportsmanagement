import React, { useEffect, useState } from 'react';
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

  // Flag to prevent clearing selections during restoration
  const [isRestoringSelections, setIsRestoringSelections] = useState(false);

  // Debug logging to track selection changes
  useEffect(() => {
    console.log('🔍 ReportConfiguration - Current selections:', {
      selectedRegions,
      selectedDivisions,
      selectedOffices,
      selectedFrequency,
      regionsCount: regions.length,
      divisionsCount: divisions.length,
      officesCount: offices.length,
      loading
    });
  }, [selectedRegions, selectedDivisions, selectedOffices, selectedFrequency, regions.length, divisions.length, offices.length, loading]);

  // Re-apply saved selections when office data is loaded
  useEffect(() => {
    if (!loading && regions.length > 0 && divisions.length > 0 && offices.length > 0) {
      const pendingSelections = (window as any).pendingSavedSelections;

      if (pendingSelections && Date.now() - pendingSelections.timestamp < 10000) { // Within 10 seconds
        console.log('🔄 Office data loaded, re-applying saved selections:', pendingSelections);

        // Set flag to prevent clearing during restoration
        setIsRestoringSelections(true);

        // Use setTimeout to apply selections in sequence and prevent interference
        setTimeout(() => {
          // Validate and re-apply saved regions
          if (pendingSelections.savedRegions.length > 0) {
            const validRegions = pendingSelections.savedRegions.filter((regionId: string) =>
              regions.some(r => r.id === regionId)
            );
            if (validRegions.length > 0 && JSON.stringify(validRegions) !== JSON.stringify(selectedRegions)) {
              console.log('🔄 Re-applying saved regions:', validRegions);
              onRegionsChange(validRegions);
            }
          }

          // Apply divisions after a short delay
          setTimeout(() => {
            if (pendingSelections.savedDivisions.length > 0) {
              const validDivisions = pendingSelections.savedDivisions.filter((divisionId: string) =>
                divisions.some(d => d.id === divisionId)
              );
              if (validDivisions.length > 0 && JSON.stringify(validDivisions) !== JSON.stringify(selectedDivisions)) {
                console.log('🔄 Re-applying saved divisions:', validDivisions);
                onDivisionsChange(validDivisions);
              }
            }

            // Apply offices after another short delay
            setTimeout(() => {
              if (pendingSelections.savedOffices.length > 0) {
                const validOffices = pendingSelections.savedOffices.filter((officeId: string) =>
                  offices.some(o => o.id === officeId)
                );
                if (validOffices.length > 0 && JSON.stringify(validOffices) !== JSON.stringify(selectedOffices)) {
                  console.log('🔄 Re-applying saved offices:', validOffices);
                  onOfficesChange(validOffices);
                }
              }

              // Clear restoration flag and pending selections
              setTimeout(() => {
                setIsRestoringSelections(false);
                delete (window as any).pendingSavedSelections;
                console.log('✅ Selection restoration completed');
              }, 100);
            }, 100);
          }, 100);
        }, 50);
      }
    }
  }, [loading, regions, divisions, offices, onRegionsChange, onDivisionsChange, onOfficesChange]);

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

  // Reset dependent selections when parent selections change (but not during restoration)
  useEffect(() => {
    if (!isRestoringSelections && selectedRegions.length > 0) {
      // Remove divisions that don't belong to selected regions
      const validDivisions = selectedDivisions.filter(divisionId => {
        const division = divisions.find(d => d.id === divisionId);
        return division && selectedRegionNames.includes(division.region);
      });

      if (validDivisions.length !== selectedDivisions.length) {
        console.log('🔄 Clearing invalid divisions due to region change');
        onDivisionsChange(validDivisions);
      }
    }
  }, [isRestoringSelections, selectedRegions, selectedDivisions, divisions, selectedRegionNames, onDivisionsChange]);

  useEffect(() => {
    if (!isRestoringSelections && selectedDivisions.length > 0) {
      // Remove offices that don't belong to selected regions/divisions
      const validOffices = selectedOffices.filter(officeId => {
        const office = offices.find(o => o.id === officeId);
        return office &&
               selectedRegionNames.includes(office.region) &&
               selectedDivisionNames.includes(office.division);
      });

      if (validOffices.length !== selectedOffices.length) {
        console.log('🔄 Clearing invalid offices due to division change');
        onOfficesChange(validOffices);
      }
    }
  }, [isRestoringSelections, selectedDivisions, selectedOffices, offices, selectedRegionNames, selectedDivisionNames, onOfficesChange]);

  return (
    <div className="report-configuration mt-3 mb-3">
      <h5>Report Configuration</h5>

      {loading && (
        <div className="alert alert-info">
          <div className="d-flex align-items-center">
            <div className="spinner-border spinner-border-sm me-2" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            Loading office data and restoring saved selections...
          </div>
        </div>
      )}

      {/* Debug info for saved selections */}
      {!loading && (window as any).pendingSavedSelections && (
        <div className="alert alert-warning">
          <small>
            🔄 Restoring saved selections:
            Regions({(window as any).pendingSavedSelections.savedRegions.length}),
            Divisions({(window as any).pendingSavedSelections.savedDivisions.length}),
            Offices({(window as any).pendingSavedSelections.savedOffices.length})
          </small>
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
