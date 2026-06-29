import React, { useState } from 'react';
import { useOfficeData } from '../hooks/useOfficeData';

const HierarchyTest: React.FC = () => {
  const { regions, divisions, offices, loading, error } = useOfficeData();
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [selectedOffice, setSelectedOffice] = useState<string>('');

  // Filter divisions based on selected region
  const selectedRegionName = regions.find(r => r.id === selectedRegion)?.name || '';
  const availableDivisions = divisions.filter(division => division.region === selectedRegionName);
  
  // Filter offices based on selected division
  const selectedDivisionName = availableDivisions.find(d => d.id === selectedDivision)?.name || '';
  const availableOffices = offices.filter(office => 
    office.region === selectedRegionName && office.division === selectedDivisionName
  );

  const handleRegionChange = (regionId: string) => {
    setSelectedRegion(regionId);
    setSelectedDivision(''); // Reset division
    setSelectedOffice(''); // Reset office
  };

  const handleDivisionChange = (divisionId: string) => {
    setSelectedDivision(divisionId);
    setSelectedOffice(''); // Reset office
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="hierarchy-test p-4 border rounded">
      <h4>Hierarchy Test Component</h4>
      
      {/* Data Summary */}
      <div className="mb-4 p-3 bg-light rounded">
        <h5>Data Summary</h5>
        <p><strong>Total Regions:</strong> {regions.length}</p>
        <p><strong>Total Divisions:</strong> {divisions.length}</p>
        <p><strong>Total Offices:</strong> {offices.length}</p>
      </div>

      {/* Raw Data Display */}
      <div className="mb-4">
        <h5>Raw Data</h5>
        <div className="row">
          <div className="col-md-4">
            <h6>Regions</h6>
            <pre className="bg-light p-2 small">
              {JSON.stringify(regions, null, 2)}
            </pre>
          </div>
          <div className="col-md-4">
            <h6>Divisions</h6>
            <pre className="bg-light p-2 small">
              {JSON.stringify(divisions, null, 2)}
            </pre>
          </div>
          <div className="col-md-4">
            <h6>Offices (first 3)</h6>
            <pre className="bg-light p-2 small">
              {JSON.stringify(offices.slice(0, 3), null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Test Dropdowns */}
      <div className="mb-4">
        <h5>Test Hierarchy</h5>
        <div className="row">
          <div className="col-md-4">
            <label className="form-label">Region:</label>
            <select 
              className="form-select" 
              value={selectedRegion} 
              onChange={(e) => handleRegionChange(e.target.value)}
            >
              <option value="">-- Select Region --</option>
              {regions.map(region => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
            <small className="text-muted">Selected: {selectedRegionName || 'None'}</small>
          </div>
          
          <div className="col-md-4">
            <label className="form-label">Division:</label>
            <select 
              className="form-select" 
              value={selectedDivision} 
              onChange={(e) => handleDivisionChange(e.target.value)}
              disabled={!selectedRegion}
            >
              <option value="">-- Select Division --</option>
              {availableDivisions.map(division => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </select>
            <small className="text-muted">
              Available: {availableDivisions.length} | Selected: {selectedDivisionName || 'None'}
            </small>
          </div>
          
          <div className="col-md-4">
            <label className="form-label">Office:</label>
            <select 
              className="form-select" 
              value={selectedOffice} 
              onChange={(e) => setSelectedOffice(e.target.value)}
              disabled={!selectedDivision}
            >
              <option value="">-- Select Office --</option>
              {availableOffices.map(office => (
                <option key={office.id} value={office.id}>
                  {office.name}
                </option>
              ))}
            </select>
            <small className="text-muted">
              Available: {availableOffices.length} | Selected: {selectedOffice || 'None'}
            </small>
          </div>
        </div>
      </div>

      {/* Current Selection Debug */}
      <div className="mb-4 p-3 bg-warning bg-opacity-10 rounded">
        <h5>Current Selection Debug</h5>
        <p><strong>Selected Region ID:</strong> {selectedRegion}</p>
        <p><strong>Selected Region Name:</strong> {selectedRegionName}</p>
        <p><strong>Selected Division ID:</strong> {selectedDivision}</p>
        <p><strong>Selected Division Name:</strong> {selectedDivisionName}</p>
        <p><strong>Selected Office ID:</strong> {selectedOffice}</p>
        <p><strong>Available Divisions:</strong> {availableDivisions.length}</p>
        <p><strong>Available Offices:</strong> {availableOffices.length}</p>
      </div>

      {/* Filtering Debug */}
      {selectedRegion && (
        <div className="mb-4 p-3 bg-info bg-opacity-10 rounded">
          <h5>Filtering Debug</h5>
          <p><strong>Looking for divisions where region = "{selectedRegionName}"</strong></p>
          <div>
            <strong>All divisions with their regions:</strong>
            <ul>
              {divisions.map(div => (
                <li key={div.id}>
                  {div.name} → Region: "{div.region}" 
                  {div.region === selectedRegionName ? ' ✅ MATCH' : ' ❌ NO MATCH'}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {selectedDivision && (
        <div className="mb-4 p-3 bg-success bg-opacity-10 rounded">
          <h5>Office Filtering Debug</h5>
          <p><strong>Looking for offices where region = "{selectedRegionName}" AND division = "{selectedDivisionName}"</strong></p>
          <div>
            <strong>All offices with their regions and divisions:</strong>
            <ul>
              {offices.slice(0, 10).map(office => (
                <li key={office.id}>
                  {office.name} → Region: "{office.region}", Division: "{office.division}"
                  {office.region === selectedRegionName && office.division === selectedDivisionName ? ' ✅ MATCH' : ' ❌ NO MATCH'}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default HierarchyTest;
