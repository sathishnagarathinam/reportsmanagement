import React, { useState } from 'react';
import { useOfficeData } from '../hooks/useOfficeData';
import { useOfficeDataFixed } from '../hooks/useOfficeDataFixed';

const FixedHierarchyTest: React.FC = () => {
  const originalData = useOfficeData();
  const fixedData = useOfficeDataFixed();
  
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<string>('');

  // Use fixed data for testing
  const { regions, divisions, offices, loading, error } = fixedData;

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
  };

  if (loading) return <div>Loading fixed data...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="fixed-hierarchy-test p-4 border rounded">
      <h4>🔧 Fixed Hierarchy Test</h4>
      
      {/* Comparison Summary */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-danger text-white">
              <h6 className="mb-0">❌ Original Implementation</h6>
            </div>
            <div className="card-body">
              <p><strong>Regions:</strong> {originalData.regions.length}</p>
              <p><strong>Divisions:</strong> {originalData.divisions.length}</p>
              <p><strong>Offices:</strong> {originalData.offices.length}</p>
              <p><strong>Loading:</strong> {originalData.loading ? 'Yes' : 'No'}</p>
              <p><strong>Error:</strong> {originalData.error || 'None'}</p>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-success text-white">
              <h6 className="mb-0">✅ Fixed Implementation</h6>
            </div>
            <div className="card-body">
              <p><strong>Regions:</strong> {fixedData.regions.length}</p>
              <p><strong>Divisions:</strong> {fixedData.divisions.length}</p>
              <p><strong>Offices:</strong> {fixedData.offices.length}</p>
              <p><strong>Loading:</strong> {fixedData.loading ? 'Yes' : 'No'}</p>
              <p><strong>Error:</strong> {fixedData.error || 'None'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Raw Data Comparison */}
      <div className="mb-4">
        <h5>Raw Data Comparison</h5>
        <div className="row">
          <div className="col-md-6">
            <h6>Original Regions</h6>
            <pre className="bg-light p-2 small">
              {JSON.stringify(originalData.regions, null, 2)}
            </pre>
          </div>
          <div className="col-md-6">
            <h6>Fixed Regions</h6>
            <pre className="bg-light p-2 small">
              {JSON.stringify(fixedData.regions, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Test Fixed Hierarchy */}
      <div className="mb-4">
        <h5>Test Fixed Hierarchy</h5>
        <div className="row">
          <div className="col-md-4">
            <label className="form-label">Region (Fixed):</label>
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
            <small className="text-muted">
              Available: {regions.length} | Selected: {selectedRegionName || 'None'}
            </small>
          </div>
          
          <div className="col-md-4">
            <label className="form-label">Division (Fixed):</label>
            <select 
              className="form-select" 
              value={selectedDivision} 
              onChange={(e) => setSelectedDivision(e.target.value)}
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
            <label className="form-label">Office (Fixed):</label>
            <select 
              className="form-select" 
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
              Available: {availableOffices.length}
            </small>
          </div>
        </div>
      </div>

      {/* Detailed Analysis */}
      {fixedData.rawData && fixedData.rawData.length > 0 && (
        <div className="mb-4">
          <h5>Raw Database Records (First 5)</h5>
          <div className="table-responsive">
            <table className="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>Facility ID</th>
                  <th>Region</th>
                  <th>Division</th>
                  <th>Office Name</th>
                </tr>
              </thead>
              <tbody>
                {fixedData.rawData.slice(0, 5).map((record, index) => (
                  <tr key={index}>
                    <td>{record['Facility ID']}</td>
                    <td>"{record.Region}" ({typeof record.Region})</td>
                    <td>"{record.Division}" ({typeof record.Division})</td>
                    <td>"{record['Office name']}" ({typeof record['Office name']})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Success/Failure Analysis */}
      <div className="alert alert-info">
        <h6>Analysis:</h6>
        <ul className="mb-0">
          <li><strong>Expected Regions:</strong> 4</li>
          <li><strong>Original Found:</strong> {originalData.regions.length} {originalData.regions.length === 4 ? '✅' : '❌'}</li>
          <li><strong>Fixed Found:</strong> {fixedData.regions.length} {fixedData.regions.length === 4 ? '✅' : '❌'}</li>
          <li><strong>Hierarchy Working:</strong> {fixedData.regions.length === 4 && availableDivisions.length > 0 ? '✅ Yes' : '❌ No'}</li>
        </ul>
      </div>
    </div>
  );
};

export default FixedHierarchyTest;
