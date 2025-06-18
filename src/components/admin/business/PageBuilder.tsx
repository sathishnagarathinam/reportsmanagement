import React, { useEffect } from 'react';
import Modal from '../../shared/Modal';
import './PageBuilder.css';

// Import refactored components and hooks
import { usePageBuilderState } from './hooks/usePageBuilderState';
import { useCardManagement } from './hooks/useCardManagement';
import { usePageConfiguration } from './hooks/usePageConfiguration';
import CardSelector from './components/CardSelector';
import CardManagement from './components/CardManagement';
import PageBuilderContent from './components/PageBuilderContent';
import ReportConfiguration from './components/ReportConfiguration';
// Debug components removed - Supabase integration working
import { isLeafCard, isMainCard } from './utils/cardUtils';

// All interfaces and utilities are now imported from separate files

const PageBuilder: React.FC = () => {
  // Use custom hooks for state management
  const state = usePageBuilderState();

  // Debug mode removed - using working SQL-based implementation

  // Initialize custom hooks
  const cardManagement = useCardManagement({
    categories: state.categories,
    setCategories: state.setCategories,
    selectedCard: state.selectedCard,
    setSelectedCard: state.setSelectedCard,
    newCardId: state.newCardId,
    setNewCardId: state.setNewCardId,
    newCardTitle: state.newCardTitle,
    setNewCardTitle: state.setNewCardTitle,
    actionType: state.actionType,
    setActionType: state.setActionType,
    setIsLoading: state.setIsLoading,
    setError: state.setError,
    setSuccess: state.setSuccess,
    setShowConfirmModal: state.setShowConfirmModal,
    setIsAddingNewCard: state.setIsAddingNewCard,
    setPageConfig: state.setPageConfig,
    setFields: state.setFields,
    setEditingCard: state.setEditingCard,
    setShowEditModal: state.setShowEditModal,
    setCardToDelete: state.setCardToDelete,
    setShowDeleteConfirmModal: state.setShowDeleteConfirmModal,
  });

  const pageConfiguration = usePageConfiguration({
    categories: state.categories,
    selectedCard: state.selectedCard,
    pageConfig: state.pageConfig,
    setPageConfig: state.setPageConfig,
    fields: state.fields,
    setFields: state.setFields,
    setAvailableDynamicFields: state.setAvailableDynamicFields,
    setLoading: state.setLoading,
    setError: state.setError,
    setSuccess: state.setSuccess,
    setPreviewContent: state.setPreviewContent,
    setIsPreviewOpen: state.setIsPreviewOpen,
    selectedRegions: state.selectedRegions,
    selectedDivisions: state.selectedDivisions,
    selectedOffices: state.selectedOffices,
    selectedFrequency: state.selectedFrequency,
    setSelectedRegions: state.setSelectedRegions,
    setSelectedDivisions: state.setSelectedDivisions,
    setSelectedOffices: state.setSelectedOffices,
    setSelectedFrequency: state.setSelectedFrequency,
  });

  // Initialize data on component mount
  useEffect(() => {
    cardManagement.fetchCategories();
  }, []);

  // Handle card and action changes
  useEffect(() => {
    if (state.selectedCard && isLeafCard(state.selectedCard, state.categories) && !isMainCard(state.selectedCard, state.categories) && state.actionType === 'createWebPage') {
      pageConfiguration.loadPageConfig(state.selectedCard);
      pageConfiguration.fetchDynamicFormFields(state.selectedCard);
    } else if (state.selectedCard && (!isLeafCard(state.selectedCard, state.categories) || isMainCard(state.selectedCard, state.categories)) && state.actionType === 'createWebPage') {
      state.setPageConfig(null);
      state.setFields([]);
      state.setAvailableDynamicFields([]);
    } else if (!state.selectedCard) {
      state.setPageConfig(null);
      state.setFields([]);
      state.setAvailableDynamicFields([]);
      state.setActionType('');
    }

    if (state.selectedCard && state.actionType !== 'createWebPage') {
        state.setAvailableDynamicFields([]);
    }
  }, [state.selectedCard, state.categories, state.actionType]);

  // Event handlers for UI interactions
  const handleCardChange = (cardId: string) => {
    state.setSelectedCard(cardId);
    state.setActionType('');
    if (!cardId) {
        state.setPageConfig(null);
        state.setFields([]);
    } else {
        const cardIsLeaf = isLeafCard(cardId, state.categories);
        const cardIsMain = isMainCard(cardId, state.categories);
        if(!cardIsLeaf || cardIsMain) {
            state.setPageConfig(null);
            state.setFields([]);
        }
    }
  };

  const handleActionChange = (action: string) => {
    state.setActionType(action);
  };

  const handleCreateAction = () => {
    state.setNewCardId('');
    state.setNewCardTitle('');
    state.setIsAddingNewCard(true);
  };

  const handleWebPageAction = () => {
    if (state.selectedCard && isLeafCard(state.selectedCard, state.categories) && !isMainCard(state.selectedCard, state.categories)) {
      pageConfiguration.loadPageConfig(state.selectedCard);
    } else if (state.selectedCard) {
      state.setError('Web page can only be created/edited for a final nested report (not a main report).');
      state.setPageConfig(null);
      state.setFields([]);
    }
  };

  // Event handlers for report configuration dropdowns - updated for arrays
  const handleRegionsChange = (regions: string[]) => {
    state.setSelectedRegions(regions);
    // Reset dependent dropdowns when regions change
    state.setSelectedDivisions([]);
    state.setSelectedOffices([]);
  };

  const handleDivisionsChange = (divisions: string[]) => {
    state.setSelectedDivisions(divisions);
    // Reset dependent dropdown when divisions change
    state.setSelectedOffices([]);
  };

  const handleOfficesChange = (offices: string[]) => {
    state.setSelectedOffices(offices);
  };

  const handleFrequencyChange = (frequency: string) => {
    state.setSelectedFrequency(frequency);
  };

  // All card management functions are now handled by the useCardManagement hook

  // All page builder functions are now handled by the usePageConfiguration hook

  // All rendering functions are now handled by separate components
  
  // All field rendering is now handled by the FieldConfigItem component

  return (
    <>
      <div className="page-builder">
        {state.error && <div className="error-message">{state.error}</div>}
        {state.success && (
          <div className="success-message">
            {state.success}
          </div>
        )}
        <h2>Report & Page Builder</h2>

        <CardSelector
          categories={state.categories}
          selectedCard={state.selectedCard}
          onCardChange={handleCardChange}
          actionType={state.actionType}
          onActionChange={handleActionChange}
          isLoading={state.isLoading}
          onCreateAction={handleCreateAction}
          onWebPageAction={handleWebPageAction}
        />

        {/* Modal for adding/creating new card */}
        {state.isAddingNewCard && (
          <Modal
            isOpen={state.isAddingNewCard}
            onClose={() => {
              state.setIsAddingNewCard(false);
              state.setActionType('');
              state.setNewCardId('');
              state.setNewCardTitle('');
            }}
            title={
              state.actionType === 'addNewCardGlobal' ? "Create New Main Report" :
              state.selectedCard && state.actionType === 'createNestedCard' ? `Add Nested Report under "${state.categories.find(c => c.id === state.selectedCard)?.title}"` :
              "Create New Report"
            }
          >
            <div className="new-card-form">
              <input
                type="text"
                placeholder="Report ID (e.g., 'new-report-id')"
                value={state.newCardId}
                onChange={(e) => state.setNewCardId(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                className="form-control mb-2"
              />
              <input
                type="text"
                placeholder="Report Title"
                value={state.newCardTitle}
                onChange={(e) => state.setNewCardTitle(e.target.value)}
                className="form-control mb-2"
              />
              <div className="form-buttons modal-buttons">
                <button
                  onClick={cardManagement.handleConfirmCreate}
                  disabled={state.isLoading || !state.newCardId || !state.newCardTitle}
                  className="btn btn-primary"
                >
                  {state.isLoading ? 'Creating...' : 'Confirm & Create Report'}
                </button>
                <button onClick={() => {
                  state.setIsAddingNewCard(false);
                  state.setActionType('');
                  state.setNewCardId('');
                  state.setNewCardTitle('');
                }} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Conditional Rendering for Card Management OR Page Builder OR Warnings */}
        {state.selectedCard && (
          <>
            {/* Card Management Section */}
            {!(state.actionType === 'createWebPage' && isLeafCard(state.selectedCard, state.categories) && !isMainCard(state.selectedCard, state.categories) && state.pageConfig) && (
              <CardManagement
                selectedCard={state.selectedCard}
                categories={state.categories}
                onEditCard={cardManagement.handleEditCard}
                onDeleteCard={cardManagement.handleDeleteClick}
              />
            )}

            {/* Report Configuration Dropdowns */}
            {state.actionType === 'createWebPage' && isLeafCard(state.selectedCard, state.categories) && !isMainCard(state.selectedCard, state.categories) && (
              <ReportConfiguration
                selectedRegions={state.selectedRegions}
                selectedDivisions={state.selectedDivisions}
                selectedOffices={state.selectedOffices}
                selectedFrequency={state.selectedFrequency}
                onRegionsChange={handleRegionsChange}
                onDivisionsChange={handleDivisionsChange}
                onOfficesChange={handleOfficesChange}
                onFrequencyChange={handleFrequencyChange}
              />
            )}

            {/* Page Builder Content */}
            {state.actionType === 'createWebPage' && isLeafCard(state.selectedCard, state.categories) && !isMainCard(state.selectedCard, state.categories) && state.pageConfig && (
              <PageBuilderContent
                pageConfig={state.pageConfig}
                fields={state.fields}
                onAddField={pageConfiguration.addField}
                onUpdateField={pageConfiguration.updateField}
                onRemoveField={pageConfiguration.removeField}
                onSave={pageConfiguration.handleSave}
                onPreview={pageConfiguration.handlePreview}
                loading={state.loading}
              />
            )}

            {/* Warning Messages */}
            {state.actionType === 'createWebPage' && (!isLeafCard(state.selectedCard, state.categories) || isMainCard(state.selectedCard, state.categories)) && (
              <div className="warning-message mt-3 p-2 bg-warning text-dark rounded">
                Page configuration is only available for final nested reports (which are not main reports). Please select an appropriate nested report to configure its page, or create one.
              </div>
            )}
            {state.actionType !== 'createWebPage' && !isLeafCard(state.selectedCard, state.categories) && (
              <div className="info-message mt-3 p-2 bg-info text-dark rounded">
                This is a parent report. You can create nested reports under it or select an existing nested report to manage or configure its page.
              </div>
            )}
          </>
        )}

        {!state.selectedCard && state.actionType === '' && (
          <div className="info-message mt-3 p-3 bg-light border rounded">
            <p>Select a report from the dropdown to manage it or configure its web page (if applicable).</p>
            <p>If no reports exist, or to create a new top-level report, choose "Create New Main Report" from the action dropdown after clearing any selection.</p>
          </div>
        )}

        {/* Modals for Edit and Delete Confirmation */}
        {state.showEditModal && state.editingCard && (
          <Modal
            isOpen={state.showEditModal}
            onClose={() => {
              state.setShowEditModal(false);
              state.setNewCardTitle('');
              state.setEditingCard(null);
            }}
            title={`Edit Report: ${state.editingCard.title}`}
          >
            <input
              type="text"
              value={state.newCardTitle}
              onChange={(e) => state.setNewCardTitle(e.target.value)}
              placeholder="New Report Title"
              className="form-control mb-2"
            />
            <div className="form-buttons modal-buttons">
              <button
                onClick={cardManagement.handleUpdateCard}
                className="btn btn-primary"
                disabled={state.isLoading || !state.newCardTitle.trim()}
              >
                {state.isLoading ? 'Updating...' : 'Update Title'}
              </button>
              <button
                onClick={() => {
                  state.setShowEditModal(false);
                  state.setNewCardTitle('');
                  state.setEditingCard(null);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </Modal>
        )}

        {state.showDeleteConfirmModal && state.cardToDelete && (
          <Modal
            isOpen={state.showDeleteConfirmModal}
            onClose={() => state.setShowDeleteConfirmModal(false)}
            title="Confirm Deletion"
          >
            <p>Are you sure you want to delete the report "{state.categories.find(c => c.id === state.cardToDelete)?.title}" and ALL its nested reports and associated page configurations? This action cannot be undone.</p>
            <div className="form-buttons modal-buttons">
              <button
                onClick={cardManagement.handleConfirmDelete}
                className="btn btn-danger"
                disabled={state.isLoading}
              >
                {state.isLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button
                onClick={() => state.setShowDeleteConfirmModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </Modal>
        )}

        {/* Preview Modal */}
        <Modal
          isOpen={state.isPreviewOpen}
          onClose={() => state.setIsPreviewOpen(false)}
          title="Page Preview"
        >
          <div dangerouslySetInnerHTML={{ __html: state.previewContent }} />
        </Modal>
      </div>
    </>
  );
};

export default PageBuilder;


