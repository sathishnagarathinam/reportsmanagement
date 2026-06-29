import React, { useEffect, useState } from 'react';
import { firebasePageService } from '../services/firebasePageService';
import { PageConfig } from '../types/PageBuilderTypes';

const FirebasePageManager: React.FC = () => {
  const [pageConfigs, setPageConfigs] = useState<PageConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAllConfigs();
  }, []);

  const loadAllConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📋 Loading all page configurations from Firebase');
      const configs = await firebasePageService.getAllPageConfigs();
      setPageConfigs(configs);
      console.log(`✅ Loaded ${configs.length} configurations`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load configurations';
      setError(errorMsg);
      console.error('❌ Error:', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (configId: string) => {
    if (!window.confirm('Are you sure you want to delete this configuration?')) {
      return;
    }
    try {
      console.log('🗑️ Deleting configuration:', configId);
      await firebasePageService.deletePageConfig(configId);
      setPageConfigs(configs => configs.filter(c => c.id !== configId));
      console.log('✅ Configuration deleted');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete';
      setError(errorMsg);
      console.error('❌ Error:', errorMsg);
    }
  };

  const filteredConfigs = pageConfigs.filter(config =>
    config.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    config.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="firebase-page-manager p-4">
      <h2>📄 Page Configurations (Firebase)</h2>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Error:</strong> {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      <div className="mb-3 d-flex gap-2">
        <input
          type="text"
          className="form-control"
          placeholder="Search by title or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="btn btn-primary" onClick={loadAllConfigs} disabled={loading}>
          {loading ? 'Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {loading && <div className="text-center py-4"><p>Loading configurations...</p></div>}

      {!loading && pageConfigs.length > 0 && (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Fields</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredConfigs.map(config => (
                <tr key={config.id}>
                  <td><code>{config.id}</code></td>
                  <td>{config.title}</td>
                  <td>
                    <span className="badge bg-info">
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

export default FirebasePageManager;
