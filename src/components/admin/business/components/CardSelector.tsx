import React from 'react';
import { Category } from '../types/PageBuilderTypes';
import { organizeCards, isLeafCard, isMainCard } from '../utils/cardUtils';

interface CardSelectorProps {
  categories: Category[];
  selectedCard: string;
  onCardChange: (cardId: string) => void;
  actionType: string;
  onActionChange: (action: string) => void;
  isLoading: boolean;
  onCreateAction: () => void;
  onWebPageAction: () => void;
}

const CardSelector: React.FC<CardSelectorProps> = ({
  categories,
  selectedCard,
  onCardChange,
  actionType,
  onActionChange,
  isLoading,
  onCreateAction,
  onWebPageAction,
}) => {
  const renderCardOptions = (cards: Category[], level = 0): React.ReactElement[] => {
    return cards.flatMap(card => {
      // Handle undefined or empty titles gracefully
      let displayTitle = card.title;

      // If title is undefined, null, or empty, check if it's an MMU-related entry
      if (!displayTitle || displayTitle.trim() === '') {
        // Check if this might be an MMU entry based on ID or other properties
        if (card.id === 'mmu' || card.id.toLowerCase().includes('mmu')) {
          displayTitle = 'MMU';
        } else {
          displayTitle = '[Unnamed Report]';
        }
      }

      return [
        <option key={card.id} value={card.id} style={{ paddingLeft: `${level * 20}px` }}>
          {`${'--'.repeat(level)} ${displayTitle}`}
        </option>,
        ...(card.children && card.children.length > 0 ? renderCardOptions(card.children, level + 1) : []),
      ];
    });
  };

  const handleCardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSelectedCard = e.target.value;
    onCardChange(newSelectedCard);
  };

  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAction = e.target.value;
    onActionChange(newAction);
    
    if (newAction === 'createNestedCard' || newAction === 'addNewCardGlobal') {
      onCreateAction();
    } else if (newAction === 'createWebPage') {
      onWebPageAction();
    }
  };

  return (
    <div className="card-selector">
      <select
        value={selectedCard}
        onChange={handleCardChange}
        className="form-select"
        disabled={isLoading}
      >
        <option value="">{isLoading ? 'Loading Reports...' : 'Select or Create New Report'}</option>
        {renderCardOptions(organizeCards(categories))}
      </select>

      <div className="action-dropdown-container">
        <select
          value={actionType}
          onChange={handleActionChange}
          className="form-select action-dropdown"
        >
          <option value="">Select Action...</option>
          <option value="addNewCardGlobal" disabled={!!selectedCard}>
            Create New Main Report
          </option>
          {selectedCard && (
            <>
              <option value="createNestedCard">
                Create Nested Report
              </option>
              <option
                value="createWebPage"
                disabled={!isLeafCard(selectedCard, categories) || isMainCard(selectedCard, categories)}
              >
                Create/Edit Web Page for this Report
              </option>
            </>
          )}
        </select>
      </div>
    </div>
  );
};

export default CardSelector;
