import React, { useState } from 'react';
import { useFirebaseOfficeData } from '../hooks/useFirebaseOfficeData';

const FirebaseOfficeTest: React.FC = () => {
  const { regions, divisions, offices, loading, error, refetch } = useFirebaseOfficeData();
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<string>('');

  // Filter divisions based on selected region
  const selectedRegionName = regions.find(r => r.id === selectedRegion)?.name || '';
  const availableDivisions = divisions.filter(d => d.region === selectedRegionName);

  // Filter offices based on selected region and division
  const selectedDivisionName = availableDivisions.find(d => d.id === selectedDivision)?.name || '';
  const availableOffices = offices.filter(
    o => o.region === selectedRegionName && o.division === selectedDivisionName
  );

  if (loading) {
    return (
      <div className="alert alert-info">
        <p>🔄 Loading Firebase office data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <p>❌ Error loading Firebase data: {error}</p>
        <button className="btn btn-sm btn-primary" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h3>🔥 Firebase Office Data Test</h3>

      <div className="alert alert-success">
        <p>✅ Firebase Successfully Connected!</p>
        <p>📊 Data loaded from Firestore:</p>
        <ul>
          <li><strong>Total Offices:</strong> {offices.length}</li>
          <li><strong>Total Regions:</strong> {regions.length}</li>
          <li><strong>Total Divisions:</strong> {divisions.length}</li>
        </ul>
      </div>

      {offices.length === 12971 && (
        <div className="alert alert-success">
          <h5>🎉 SUCCESS!</h5>
          <p>✅ All 12,971 offices loaded from Firebase!</p>
          <p>Your Firebase migration is working perfectly!</p>
        </div>
      )}

      <div className="row">
        <div className="col-md-4">
          <div className="form-group">
            <label>Select Region:</label>
            <select
              className="form-control"
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setSelectedDivision('');
              }}
            >
              <option value="">-- Choose Region --</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="col-md-4">
          <div className="form-group">
            <label>Select Division:</label>
            <select
              className="form-control"
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              disabled={!selectedRegion}
            >
              <option value="">-- Choose Division --</option>
              {availableDivisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="col-md-4">
          <div className="form-group">
            <label>Available Offices: ({availableOffices.length})</label>
            <select className="form-control" disabled>
              <option>-- {availableOffices.length} offices --</option>
            </select>
          </div>
        </div>
      </div>

      {selectedRegion && selectedDivision && availableOffices.length > 0 && (
        <div className="mt-3">
          <h5>Offices in {selectedRegionName} → {selectedDivisionName}</h5>
          <div className="list-group" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {availableOffices.map((office) => (
              <div key={office.id} className="list-group-item">
                <small className="text-muted">{office.id}</small>
                <br />
                <strong>{office.name}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3">
        <button className="btn btn-primary" onClick={refetch}>
          🔄 Refresh Data
        </button>
      </div>
    </div>
  );
};

export default FirebaseOfficeTest;
