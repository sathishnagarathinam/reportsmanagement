import { FaFolder, FaFileAlt, FaCog, FaFolderOpen } from 'react-icons/fa';
import { Category } from '../types/PageBuilderTypes';

// Helper function to generate card style (icon and color)
export const generateCardStyle = (title: string) => {
  const hash = title
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const icons = [FaFolder, FaFileAlt, FaCog, FaFolderOpen]; // Add more icons if needed
  const colors = ['#FFC107', '#2196F3', '#4CAF50', '#E91E63', '#9C27B0'];

  const icon = icons[hash % icons.length];
  const color = colors[hash % colors.length];
  
  return { icon, color };
};

// Helper function to check if a card is a main card
export const isMainCard = (cardId: string, allCategories: Category[]): boolean => {
  const card = allCategories.find(c => c.id === cardId);
  return card ? !card.parentId : false;
};

// Helper function to check if a card is a leaf card
export const isLeafCard = (cardId: string, allCategories: Category[]): boolean => {
  return !allCategories.some(c => c.parentId === cardId);
};

// Helper function to organize cards into a tree structure
export const organizeCards = (list: Category[]): Category[] => {
  const map: { [key: string]: Category } = {};
  const roots: Category[] = [];
  list.forEach(item => {
    map[item.id] = { ...item, children: [] }; 
  });
  list.forEach(item => {
    if (item.parentId && map[item.parentId]) {
      map[item.parentId].children?.push(map[item.id]);
    } else {
      roots.push(map[item.id]);
    }
  });
  return roots;
};

// Helper function to get all descendant IDs
export const getAllDescendantIds = (parentId: string, allCategories: Category[]): string[] => {
  let descendants: string[] = [];
  const children = allCategories.filter(c => c.parentId === parentId);
  for (const child of children) {
    descendants.push(child.id);
    descendants = descendants.concat(getAllDescendantIds(child.id, allCategories));
  }
  return descendants;
};
