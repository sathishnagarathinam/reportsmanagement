import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserFormBuilderService, { UserFormDefinition } from '../../services/userFormBuilderService';
import { useAuth } from '../../contexts/AuthContext';
import './FormBuilder.css';

interface UserFormsListProps {
  onCreateNew?: () => void;
  onEditForm?: (formId: string) => void;
}

const UserFormsList: React.FC<UserFormsListProps> = ({ onCreateNew, onEditForm }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [forms, setForms] = useState<UserFormDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadForms();
  }, [currentUser]);

  const loadForms = async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userForms = await UserFormBuilderService.getUserForms(currentUser.uid);
      setForms(userForms);
    } catch (err) {
      console.error('Error loading forms:', err);
      setError('Failed to load forms. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
    } else {
      navigate('/forms/builder');
    }
  };

  const handleEditForm = (formId: string) => {
    if (onEditForm) {
      onEditForm(formId);
    } else {
      navigate(`/forms/builder/${formId}`);
    }
  };

  const handleViewSubmissions = (formId: string) => {
    navigate(`/forms/${formId}/submissions`);
  };

  const handleDuplicateForm = async (form: UserFormDefinition) => {
    if (!currentUser) return;

    try {
      await UserFormBuilderService.duplicateForm(form.id, currentUser.uid, `${form.name} (Copy)`);
      await loadForms();
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate form');
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!currentUser) return;

    setIsDeleting(true);
    try {
      await UserFormBuilderService.deleteForm(formId, currentUser.uid);
      setForms(forms.filter(f => f.id !== formId));
      setDeleteConfirmId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete form');
    } finally {
      setIsDeleting(false);
    }
  };

  const getPermissionBadge = (form: UserFormDefinition) => {
    if (!currentUser) return null;
    
    if (form.createdBy === currentUser.uid) {
      return <span className="user-forms-list__badge user-forms-list__badge--owner">Owner</span>;
    }
    if (form.isPublic) {
      return <span className="user-forms-list__badge user-forms-list__badge--public">Public</span>;
    }
    const share = form.sharedWith?.find(s => s.userId === currentUser.uid);
    if (share) {
      return <span className="user-forms-list__badge user-forms-list__badge--shared">{share.role}</span>;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="user-forms-list__loading">
        <div className="form-builder__loading-spinner" />
        <p>Loading your forms...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="user-forms-list__empty">
        <p>Please log in to view your forms.</p>
        <button onClick={() => navigate('/login')} className="form-builder__btn form-builder__btn--primary">
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="user-forms-list">
      <div className="user-forms-list__header">
        <h1>My Forms</h1>
        <button onClick={handleCreateNew} className="form-builder__btn form-builder__btn--primary">
          <span>+</span>
          <span>Create New Form</span>
        </button>
      </div>

      {error && (
        <div className="user-forms-list__error">
          {error}
          <button onClick={() => setError(null)} className="user-forms-list__error-close">
            ✕
          </button>
        </div>
      )}

      {forms.length === 0 ? (
        <div className="user-forms-list__empty">
          <div className="user-forms-list__empty-icon">📝</div>
          <h3>No Forms Yet</h3>
          <p>Create your first form to start collecting data</p>
          <button onClick={handleCreateNew} className="form-builder__btn form-builder__btn--primary">
            Create Your First Form
          </button>
        </div>
      ) : (
        <div className="user-forms-list__grid">
          {forms.map((form) => (
            <div key={form.id} className="user-forms-list__card">
              <div className="user-forms-list__card-header">
                <h3 className="user-forms-list__card-title">{form.name}</h3>
                {getPermissionBadge(form)}
              </div>
              
              {form.description && (
                <p className="user-forms-list__card-description">{form.description}</p>
              )}
              
              <div className="user-forms-list__card-meta">
                <span>{form.fields.length} fields</span>
                <span>•</span>
                <span>Updated {new Date(form.updatedAt).toLocaleDateString()}</span>
              </div>

              <div className="user-forms-list__card-actions">
                <button
                  onClick={() => handleEditForm(form.id)}
                  className="form-builder__btn form-builder__btn--secondary"
                  disabled={form.createdBy !== currentUser?.uid && !form.sharedWith?.some(s => s.userId === currentUser?.uid && (s.role === 'editor' || s.role === 'admin'))}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleViewSubmissions(form.id)}
                  className="form-builder__btn form-builder__btn--secondary"
                >
                  Submissions
                </button>
                {form.createdBy === currentUser?.uid && (
                  <>
                    <button
                      onClick={() => handleDuplicateForm(form)}
                      className="form-builder__btn form-builder__btn--secondary"
                    >
                      Duplicate
                    </button>
                    {deleteConfirmId === form.id ? (
                      <div className="user-forms-list__delete-confirm">
                        <button
                          onClick={() => handleDeleteForm(form.id)}
                          className="form-builder__btn form-builder__btn--danger"
                          disabled={isDeleting}
                        >
                          {isDeleting ? 'Deleting...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="form-builder__btn form-builder__btn--secondary"
                          disabled={isDeleting}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(form.id)}
                        className="form-builder__btn form-builder__btn--danger"
                      >
                        Delete
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserFormsList;
