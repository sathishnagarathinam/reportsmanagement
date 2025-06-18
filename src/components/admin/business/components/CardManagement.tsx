import React from 'react';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { Category } from '../types/PageBuilderTypes';

interface CardManagementProps {
  selectedCard: string;
  categories: Category[];
  onEditCard: (card: Category) => void;
  onDeleteCard: (cardId: string) => void;
}

const CardManagement: React.FC<CardManagementProps> = ({
  selectedCard,
  categories,
  onEditCard,
  onDeleteCard,
}) => {
  const selectedCategory = categories.find(c => c.id === selectedCard);

  if (!selectedCategory) {
    return null;
  }

  return (
    <div className="card-management">
      <h3>Report Details: "{selectedCategory.title}"</h3>
      <div className="card-actions">
        <button
          onClick={() => onEditCard(selectedCategory)}
          className="edit-button btn btn-outline-primary btn-sm me-2"
          disabled={!selectedCard}
        >
          {React.createElement(FaEdit as React.ComponentType<any>)} Edit Name
        </button>
        <button
          onClick={() => onDeleteCard(selectedCard)}
          className="delete-button btn btn-outline-danger btn-sm"
          disabled={!selectedCard}
        >
          {React.createElement(FaTrash as React.ComponentType<any>)} Delete Report
        </button>
      </div>
    </div>
  );
};

export default CardManagement;
