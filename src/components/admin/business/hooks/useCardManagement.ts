import { useCallback } from 'react';
import { db } from '../../../../config/firebase';
import { doc, setDoc, getDoc, collection, getDocs, writeBatch, deleteDoc, updateDoc } from 'firebase/firestore';
import { Category } from '../types/PageBuilderTypes';
import { generateCardStyle, getAllDescendantIds } from '../utils/cardUtils';

interface UseCardManagementProps {
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  selectedCard: string;
  setSelectedCard: (card: string) => void;
  newCardId: string;
  setNewCardId: (id: string) => void;
  newCardTitle: string;
  setNewCardTitle: (title: string) => void;
  actionType: string;
  setActionType: (type: string) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSuccess: (success: string | null) => void;
  setShowConfirmModal: (show: boolean) => void;
  setIsAddingNewCard: (adding: boolean) => void;
  setPageConfig: (config: any) => void;
  setFields: (fields: any[]) => void;
  setEditingCard: (card: Category | null) => void;
  setShowEditModal: (show: boolean) => void;
  setCardToDelete: (id: string | null) => void;
  setShowDeleteConfirmModal: (show: boolean) => void;
}

export const useCardManagement = (props: UseCardManagementProps) => {
  const {
    categories,
    setCategories,
    selectedCard,
    setSelectedCard,
    newCardId,
    setNewCardId,
    newCardTitle,
    setNewCardTitle,
    actionType,
    setActionType,
    setIsLoading,
    setError,
    setSuccess,
    setShowConfirmModal,
    setIsAddingNewCard,
    setPageConfig,
    setFields,
    setEditingCard,
    setShowEditModal,
    setCardToDelete,
    setShowDeleteConfirmModal,
  } = props;

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'categories'));
      const fetchedCategories = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(fetchedCategories);
    } catch (err) {
      setError('Failed to fetch categories.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [setCategories, setIsLoading, setError]);

  const checkDuplicateId = async (id: string): Promise<boolean> => {
    const docRef = doc(db, 'categories', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  };

  const handleAddNewCard = async () => {
    if (!newCardId || !newCardTitle) {
      setError('Report ID and Title are required.');
      return;
    }
    setIsLoading(true);
    const isDuplicate = await checkDuplicateId(newCardId);
    if (isDuplicate) {
      setError('This Report ID already exists. Please use a unique ID.');
      setIsLoading(false);
      return;
    }
    setIsLoading(false);
    setShowConfirmModal(true);
  };

  const handleConfirmCreate = async () => {
    if (!newCardId || !newCardTitle) {
        setError('Report ID and Title cannot be empty.');
        setShowConfirmModal(false);
        return;
    }
    let parentIdToSet: string | null = null;
    if (actionType === 'createNestedCard' && selectedCard) {
      parentIdToSet = selectedCard;
    } else if (actionType === 'addNewCardGlobal') {
      parentIdToSet = null; 
    } else if (selectedCard && actionType !== 'addNewCardGlobal') {
        parentIdToSet = selectedCard;
    } else if (!selectedCard && actionType !== 'createNestedCard') { 
        parentIdToSet = null;
    }

    const parentPath = parentIdToSet ? categories.find(c => c.id === parentIdToSet)?.path : '/categories';
    const newPath = `${parentPath}/${newCardId}`.replace(/\/+/g, '/');

    try {
      setIsLoading(true);
      setShowConfirmModal(false);
      const cardRef = doc(db, 'categories', newCardId);
      const { icon: generatedIcon, color: generatedColor } = generateCardStyle(newCardTitle);
      
      await setDoc(cardRef, {
        id: newCardId,
        title: newCardTitle,
        path: newPath,
        parentId: parentIdToSet || '', // Use empty string instead of null for consistency
        lastUpdated: new Date().toISOString(),
        icon: generatedIcon.name,
        color: generatedColor,
        fields: [],
        isPage: true,
        pageId: newCardId,
      });
  
      await fetchCategories(); 
      
      setNewCardId('');
      setNewCardTitle('');
      setIsAddingNewCard(false);
      setActionType(''); 
      setSelectedCard(newCardId);
      setSuccess(`Report "${newCardTitle}" has been created successfully!`);
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      setError('Error creating new report. Check console for details.');
      console.error('Error creating card:', err);
    } finally {
      setIsLoading(false); 
    }
  };

  const handleEditCard = (card: Category) => {
    setEditingCard(card);
    setNewCardTitle(card.title);
    setShowEditModal(true);
  };

  const handleUpdateCard = async () => {
    const editingCard = categories.find(c => c.id === selectedCard);
    if (!editingCard || !newCardTitle) return;
    try {
      setIsLoading(true);
      const cardRef = doc(db, 'categories', editingCard.id);
      await updateDoc(cardRef, { title: newCardTitle, lastUpdated: new Date().toISOString() });
      await fetchCategories();
      setShowEditModal(false);
      setEditingCard(null);
      setNewCardTitle('');
      setSuccess('Report updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update report.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (cardId: string) => {
    setCardToDelete(cardId);
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCard) return;
    setIsLoading(true);
    try {
      const batch = writeBatch(db);
      const allDescendants = getAllDescendantIds(selectedCard, categories);
      const idsToDelete = [selectedCard, ...allDescendants];

      for (const id of idsToDelete) {
        batch.delete(doc(db, 'categories', id));
        batch.delete(doc(db, 'pages', id));
      }
      await batch.commit();
      await fetchCategories();

      setShowDeleteConfirmModal(false);
      setCardToDelete(null);
      setSelectedCard('');
      setPageConfig(null);
      setFields([]);
      setSuccess('Report and all its nested items deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to delete report.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchCategories,
    handleAddNewCard,
    handleConfirmCreate,
    handleEditCard,
    handleUpdateCard,
    handleDeleteClick,
    handleConfirmDelete,
  };
};
