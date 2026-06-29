import React, { useState } from 'react';
import { useOfficeData } from '../hooks/useOfficeData';
import { useOfficeDataSimple } from '../hooks/useOfficeDataSimple';

const SQLBasedTest: React.FC = () => {
  const originalData = useOfficeData();
  const sqlBasedData = useOfficeDataSimple();
  
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<string>('');

  // Use SQL-based data for testing
  const { regions, divisions, offices, loading, error } = sqlBasedData;

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

  if (loading) return <div>Loading SQL-based data...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="sql-based-test p-4 border rounded bg-success bg-opacity-10">
      <h4>🎯 SQL-Based Implementation Test</h4>
      <p className="text-muted">This uses the exact same logic as your working SQL query.</p>
      
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
              <div>
                <strong>Region Names:</strong>
                <ul className="mb-0">
                  {originalData.regions.map(r => (
                    <li key={r.id}>"{r.name}"</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-success text-white">
              <h6 className="mb-0">✅ SQL-Based Implementation</h6>
            </div>
            <div className="card-body">
              <p><strong>Regions:</strong> {sqlBasedData.regions.length}</p>
              <p><strong>Divisions:</strong> {sqlBasedData.divisions.length}</p>
              <p><strong>Offices:</strong> {sqlBasedData.offices.length}</p>
              <div>
                <strong>Region Names:</strong>
                <ul className="mb-0">
                  {sqlBasedData.regions.map(r => (
                    <li key={r.id}>"{r.name}"</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success/Failure Analysis */}
      <div className={`alert ${sqlBasedData.regions.length === 4 ? 'alert-success' : 'alert-warning'}`}>
        <h6>📊 Analysis:</h6>
        <ul className="mb-0">
          <li><strong>Expected Regions:</strong> 4</li>
          <li><strong>Original Found:</strong> {originalData.regions.length} {originalData.regions.length === 4 ? '✅' : '❌'}</li>
          <li><strong>SQL-Based Found:</strong> {sqlBasedData.regions.length} {sqlBasedData.regions.length === 4 ? '✅' : '❌'}</li>
          <li><strong>SQL-Based Working:</strong> {sqlBasedData.regions.length === 4 ? '✅ YES - Use this implementation!' : '❌ Still investigating...'}</li>
        </ul>
      </div>

      {/* Test SQL-Based Hierarchy */}
      {sqlBasedData.regions.length === 4 && (
        <div className="mb-4">
          <h5>🎉 Test Working SQL-Based Hierarchy</h5>
          <div className="row">
            <div className="col-md-4">
              <label className="form-label">Region (SQL-Based):</label>
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
              <small className="text-success">
                ✅ Available: {regions.length} | Selected: {selectedRegionName || 'None'}
              </small>
            </div>
            
            <div className="col-md-4">
              <label className="form-label">Division (SQL-Based):</label>
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
              <small className="text-success">
                ✅ Available: {availableDivisions.length} | Selected: {selectedDivisionName || 'None'}
              </small>
            </div>
            
            <div className="col-md-4">
              <label className="form-label">Office (SQL-Based):</label>
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
              <small className="text-success">
                ✅ Available: {availableOffices.length}
              </small>
            </div>
          </div>
        </div>
      )}

      {/* Implementation Instructions */}
      {sqlBasedData.regions.length === 4 && (
        <div className="alert alert-info">
          <h6>🚀 Ready to Implement!</h6>
          <p className="mb-2">The SQL-based approach is working! To use this in your ReportConfiguration:</p>
          <ol className="mb-0">
            <li>Replace <code>useOfficeData</code> with <code>useOfficeDataSimple</code> in ReportConfiguration.tsx</li>
            <li>The hierarchy should now work correctly with all 4 regions</li>
            <li>Remove the debug components once confirmed working</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default SQLBasedTest;
