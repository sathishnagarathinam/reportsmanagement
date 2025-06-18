import React, { useState } from 'react';
import { useOfficeDataSimple } from '../hooks/useOfficeDataSimple';

const OfficeDataSummary: React.FC = () => {
  const { regions, divisions, offices, loading, error } = useOfficeDataSimple();
  const [showDetails, setShowDetails] = useState(false);

  if (loading) return <div className="text-muted">Loading office data...</div>;
  if (error) return <div className="text-danger">Error: {error}</div>;

  return (
    <div className="office-data-summary">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">📊 Available Office Data</h6>
        <button 
          className="btn btn-sm btn-outline-info"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="row mb-3">
        <div className="col-md-4">
          <div className="card border-primary">
            <div className="card-body text-center">
              <h5 className="card-title text-primary">{regions.length}</h5>
              <p className="card-text">Regions</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-success">
            <div className="card-body text-center">
              <h5 className="card-title text-success">{divisions.length}</h5>
              <p className="card-text">Divisions</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-info">
            <div className="card-body text-center">
              <h5 className="card-title text-info">{offices.length}</h5>
              <p className="card-text">Offices</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed View */}
      {showDetails && (
        <div className="row">
          <div className="col-md-4">
            <div className="card">
              <div className="card-header bg-primary text-white">
                <h6 className="mb-0">🌍 Regions ({regions.length})</h6>
              </div>
              <div className="card-body">
                {regions.length > 0 ? (
                  <ul className="list-unstyled mb-0">
                    {regions.map(region => (
                      <li key={region.id} className="mb-1">
                        <span className="badge bg-primary me-2">{region.id}</span>
                        {region.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <em className="text-muted">No regions found</em>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card">
              <div className="card-header bg-success text-white">
                <h6 className="mb-0">🏢 Divisions ({divisions.length})</h6>
              </div>
              <div className="card-body">
                {divisions.length > 0 ? (
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {divisions.map(division => (
                      <div key={division.id} className="mb-2 p-2 border rounded">
                        <div className="fw-bold">{division.name}</div>
                        <small className="text-muted">Region: {division.region}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <em className="text-muted">No divisions found</em>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card">
              <div className="card-header bg-info text-white">
                <h6 className="mb-0">🏪 Offices ({offices.length})</h6>
              </div>
              <div className="card-body">
                {offices.length > 0 ? (
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {offices.slice(0, 20).map(office => (
                      <div key={office.id} className="mb-2 p-2 border rounded">
                        <div className="fw-bold">{office.name}</div>
                        <small className="text-muted">
                          ID: {office.id}<br/>
                          Region: {office.region}<br/>
                          Division: {office.division}
                        </small>
                      </div>
                    ))}
                    {offices.length > 20 && (
                      <div className="text-center mt-2">
                        <small className="text-muted">
                          ... and {offices.length - 20} more offices
                        </small>
                      </div>
                    )}
                  </div>
                ) : (
                  <em className="text-muted">No offices found</em>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="mt-3 p-2 bg-light rounded">
        <small className="text-muted">
          <strong>Data Source:</strong> Supabase 'offices' table | 
          <strong> Processing:</strong> SQL-based implementation | 
          <strong> Status:</strong> {regions.length === 4 ? '✅ Working correctly' : '⚠️ Check data'}
        </small>
      </div>
    </div>
  );
};

export default OfficeDataSummary;
