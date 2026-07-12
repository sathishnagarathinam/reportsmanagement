import React, { useState } from 'react';
import { FormSharingPermission } from '../../services/userFormBuilderService';

interface FormShareModalProps {
  formId: string;
  isPublic: boolean;
  sharedWith: FormSharingPermission[];
  onClose: () => void;
  onShare: (shareData: { userId: string; email?: string; role: 'viewer' | 'editor' | 'admin' }) => Promise<void>;
  onUnshare: (userId: string) => Promise<void>;
  onSetPublic: (isPublic: boolean) => Promise<void>;
}

const FormShareModal: React.FC<FormShareModalProps> = ({
  isPublic,
  sharedWith,
  onClose,
  onShare,
  onUnshare,
  onSetPublic
}) => {
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    if (!newUserEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // In a real implementation, you'd look up the user ID by email
      // For now, we'll use the email as the user ID
      await onShare({
        userId: newUserEmail.toLowerCase().trim(),
        email: newUserEmail.trim(),
        role: newUserRole
      });
      setNewUserEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to share form');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnshare = async (userId: string) => {
    setIsLoading(true);
    try {
      await onUnshare(userId);
    } catch (err: any) {
      setError(err.message || 'Failed to remove sharing');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePublic = async () => {
    setIsLoading(true);
    try {
      await onSetPublic(!isPublic);
    } catch (err: any) {
      setError(err.message || 'Failed to update visibility');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-builder__modal-overlay" onClick={onClose}>
      <div className="form-builder__modal" onClick={(e) => e.stopPropagation()}>
        <div className="form-builder__modal-header">
          <h3 className="form-builder__modal-title">Share Form</h3>
          <button onClick={onClose} className="form-builder__modal-close">
            ✕
          </button>
        </div>

        <div className="form-builder__modal-body">
          {error && (
            <div style={{ 
              background: '#fed7d7', 
              color: '#c53030', 
              padding: '12px', 
              borderRadius: '6px', 
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {/* Public Visibility Toggle */}
          <div className="form-builder__visibility-toggle">
            <input
              type="checkbox"
              id="public-visibility"
              checked={isPublic}
              onChange={handleTogglePublic}
              disabled={isLoading}
            />
            <label htmlFor="public-visibility" style={{ fontSize: '14px', fontWeight: 500 }}>
              Make this form public
            </label>
            <span style={{ fontSize: '12px', color: '#718096', marginLeft: 'auto' }}>
              {isPublic ? 'Anyone can view' : 'Private'}
            </span>
          </div>

          {/* Add User Section */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#2d3748' }}>
              Share with specific people
            </h4>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="Enter email address"
                className="form-builder__property-input"
                style={{ flex: 1 }}
                disabled={isLoading}
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as 'viewer' | 'editor' | 'admin')}
                className="form-builder__property-select"
                style={{ width: '100px' }}
                disabled={isLoading}
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={handleShare}
                className="form-builder__btn form-builder__btn--primary"
                disabled={isLoading}
              >
                Add
              </button>
            </div>
          </div>

          {/* Shared Users List */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#2d3748' }}>
              People with access
            </h4>
            {sharedWith.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#718096', fontStyle: 'italic' }}>
                No one else has access to this form
              </p>
            ) : (
              <div className="form-builder__share-list">
                {sharedWith.map((permission) => (
                  <div key={permission.userId} className="form-builder__share-item">
                    <div className="form-builder__share-info">
                      <span className="form-builder__share-email">
                        {permission.email || permission.userId}
                      </span>
                      <span className="form-builder__share-role">{permission.role}</span>
                    </div>
                    <div className="form-builder__share-actions">
                      <button
                        onClick={() => handleUnshare(permission.userId)}
                        className="form-builder__field-btn form-builder__field-btn--danger"
                        disabled={isLoading}
                        title="Remove access"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="form-builder__modal-footer">
          <button onClick={onClose} className="form-builder__btn form-builder__btn--secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormShareModal;
