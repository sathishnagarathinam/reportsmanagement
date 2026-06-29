import React, { useState, useEffect } from 'react';
import { supabasePageService } from '../services/supabasePageService';
import { PageConfig } from '../types/PageBuilderTypes';

const SupabasePageManager: React.FC = () => {
  const [pageConfigs, setPageConfigs] = useState<PageConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchCriteria, setSearchCriteria] = useState({
    region: '',
    frequency: '',
    title: ''
  });

  const loadAllConfigs = async () => {
    setLoading(true);
    setError(null);
    try {
      const configs = await supabasePageService.getAllPageConfigs();
      setPageConfigs(configs);
    } catch (err) {
      setError(`Failed to load configurations: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const configs = await supabasePageService.searchPageConfigs(searchCriteria);
      setPageConfigs(configs);
    } catch (err) {
      setError(`Search failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pageId: string) => {
    if (!confirm(`Are you sure you want to delete page configuration "${pageId}"?`)) {
      return;
    }

    try {
      await supabasePageService.deletePageConfig(pageId);
      setPageConfigs(pageConfigs.filter(config => config.id !== pageId));
    } catch (err) {
      setError(`Failed to delete configuration: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    loadAllConfigs();
  }, []);

  return (
    <div className="supabase-page-manager p-4 border rounded">
      <h4>📊 Supabase Page Configurations Manager</h4>
      
      {/* Search Section */}
      <div className="search-section mb-4 p-3 bg-light rounded">
        <h6>🔍 Search Configurations</h6>
        <div className="row">
          <div className="col-md-3">
            <input
              type="text"
              className="form-control"
              placeholder="Search by title..."
              value={searchCriteria.title}
              onChange={(e) => setSearchCriteria({...searchCriteria, title: e.target.value})}
            />
          </div>
          <div className="col-md-3">
            <input
              type="text"
              className="form-control"
              placeholder="Filter by region..."
              value={searchCriteria.region}
              onChange={(e) => setSearchCriteria({...searchCriteria, region: e.target.value})}
            />
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              value={searchCriteria.frequency}
              onChange={(e) => setSearchCriteria({...searchCriteria, frequency: e.target.value})}
            >
              <option value="">All Frequencies</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="col-md-3">
            <button className="btn btn-primary me-2" onClick={handleSearch} disabled={loading}>
              🔍 Search
            </button>
            <button className="btn btn-secondary" onClick={loadAllConfigs} disabled={loading}>
              🔄 Reset
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-3">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading configurations...</p>
        </div>
      )}

      {/* Results Summary */}
      {!loading && (
        <div className="mb-3">
          <h6>📋 Results: {pageConfigs.length} configurations found</h6>
        </div>
      )}

      {/* Configurations Table */}
      {!loading && pageConfigs.length > 0 && (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Regions</th>
                <th>Divisions</th>
                <th>Offices</th>
                <th>Frequency</th>
                <th>Fields</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageConfigs.map(config => (
                <tr key={config.id}>
                  <td>
                    <code className="small">{config.id}</code>
                  </td>
                  <td>
                    <strong>{config.title}</strong>
                  </td>
                  <td>
                    {config.selectedRegions && config.selectedRegions.length > 0 ? (
                      <div>
                        {config.selectedRegions.map(region => (
                          <span key={region} className="badge bg-primary me-1 mb-1">
                            {region}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted">
                        {config.selectedRegion || 'None'}
                      </span>
                    )}
                  </td>
                  <td>
                    {config.selectedDivisions && config.selectedDivisions.length > 0 ? (
                      <div>
                        {config.selectedDivisions.slice(0, 2).map(division => (
                          <span key={division} className="badge bg-success me-1 mb-1">
                            {division}
                          </span>
                        ))}
                        {config.selectedDivisions.length > 2 && (
                          <span className="badge bg-secondary">
                            +{config.selectedDivisions.length - 2} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted">
                        {config.selectedDivision || 'None'}
                      </span>
                    )}
                  </td>
                  <td>
                    {config.selectedOffices && config.selectedOffices.length > 0 ? (
                      <div>
                        {config.selectedOffices.slice(0, 2).map(office => (
                          <span key={office} className="badge bg-info me-1 mb-1">
                            {office}
                          </span>
                        ))}
                        {config.selectedOffices.length > 2 && (
                          <span className="badge bg-secondary">
                            +{config.selectedOffices.length - 2} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted">
                        {config.selectedOffice || 'None'}
                      </span>
                    )}
                  </td>
                  <td>
                    {config.selectedFrequency ? (
                      <span className="badge bg-warning text-dark">
                        {config.selectedFrequency}
                      </span>
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </td>
                  <td>
                    <span className="badge bg-secondary">
                      {config.fields?.length || 0} fields
                    </span>
                  </td>
                  <td>
                    <small className="text-muted">
                      {new Date(config.lastUpdated).toLocaleDateString()}
                      <br />
                      {new Date(config.lastUpdated).toLocaleTimeString()}
                    </small>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(config.id)}
                      title="Delete configuration"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No Results */}
      {!loading && pageConfigs.length === 0 && (
        <div className="text-center py-4">
          <p className="text-muted">No page configurations found.</p>
          <button className="btn btn-primary" onClick={loadAllConfigs}>
            🔄 Refresh
          </button>
        </div>
      )}
    </div>
  );
};

export default SupabasePageManager;
