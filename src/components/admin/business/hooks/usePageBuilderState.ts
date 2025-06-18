import { useState } from 'react';
import { Category, FormField, PageConfig } from '../types/PageBuilderTypes';
import { FormField as DynamicFormField } from '../../../shared/DynamicForm';

export const usePageBuilderState = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [pageConfig, setPageConfig] = useState<PageConfig | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [availableDynamicFields, setAvailableDynamicFields] = useState<DynamicFormField[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isAddingNewCard, setIsAddingNewCard] = useState<boolean>(false);
  const [newCardId, setNewCardId] = useState<string>('');
  const [newCardTitle, setNewCardTitle] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const [editingCard, setEditingCard] = useState<Category | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);

  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);

  const [actionType, setActionType] = useState<string>('');

  // State for Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  // New dropdown states - updated to arrays for multiple selections
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [selectedOffices, setSelectedOffices] = useState<string[]>([]);
  const [selectedFrequency, setSelectedFrequency] = useState<string>('');

  return {
    // State values
    categories,
    selectedCard,
    pageConfig,
    fields,
    availableDynamicFields,
    isLoading,
    loading,
    error,
    success,
    isAddingNewCard,
    newCardId,
    newCardTitle,
    showConfirmModal,
    editingCard,
    showEditModal,
    cardToDelete,
    showDeleteConfirmModal,
    actionType,
    isPreviewOpen,
    previewContent,
    selectedRegions,
    selectedDivisions,
    selectedOffices,
    selectedFrequency,

    // State setters
    setCategories,
    setSelectedCard,
    setPageConfig,
    setFields,
    setAvailableDynamicFields,
    setIsLoading,
    setLoading,
    setError,
    setSuccess,
    setIsAddingNewCard,
    setNewCardId,
    setNewCardTitle,
    setShowConfirmModal,
    setEditingCard,
    setShowEditModal,
    setCardToDelete,
    setShowDeleteConfirmModal,
    setActionType,
    setIsPreviewOpen,
    setPreviewContent,
    setSelectedRegions,
    setSelectedDivisions,
    setSelectedOffices,
    setSelectedFrequency,
  };
};
