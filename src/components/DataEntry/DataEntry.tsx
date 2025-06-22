import React, { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../shared/Sidebar';
import StatsCards from '../shared/StatsCards';
import { FaBriefcase, FaLaptopCode, FaBuilding, FaMoneyBill, FaPiggyBank, FaUniversity, FaUsers, FaSearch, FaEllipsisH } from 'react-icons/fa';
import { IconType } from 'react-icons';
import { FormFilteringService } from '../../services/formFilteringService';
import './DataEntry.css';

interface Category {
  id: string;
  title: string;
  path: string;
  icon?: string;
  color?: string;
  parentId?: string; // Add parentId for nested cards
  children?: Category[]; // Add children array for nested cards
}

const DataEntry: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        const userRef = doc(db, 'employees', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }
      }
    };
    fetchUserData();
  }, [currentUser]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesCollection = collection(db, 'categories');
        const categoriesSnapshot = await getDocs(categoriesCollection);
        const categoriesData = categoriesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            path: data.path,
            icon: data.icon,
            color: data.color,
            parentId: data.parentId || null // Ensure parentId is explicitly set
          } as Category;
        });
        
        console.log('Raw categories data:', categoriesData); // Log raw data
        
        if (categoriesData.length > 0) {
          // Organize cards into hierarchical structure
          const organizedCategories = organizeCards(categoriesData);
          console.log('Organized categories:', organizedCategories); // Log organized data
          setCategories(organizedCategories);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    
    fetchCategories();
  }, []);

  // Function to organize cards into hierarchical structure
  const organizeCards = (cards: Category[]) => {
    console.log('Organizing cards, total count:', cards.length);
    
    // Log cards with parentId to verify they exist
    const cardsWithParent = cards.filter(card => card.parentId && card.parentId !== null);
    console.log('Cards with parentId:', cardsWithParent);
    
    const topLevel = cards.filter(card => !card.parentId || card.parentId === null);
    const nested = cards.filter(card => card.parentId && card.parentId !== null);
    
    console.log('Top level cards:', topLevel.length);
    console.log('Nested cards:', nested.length);
  
    return topLevel.map(card => {
      const children = nested.filter(n => n.parentId === card.id);
      console.log(`Children for card ${card.id}:`, children.length);
      return {
        ...card,
        children: children
      };
    });
  };

  // Recursive function to render cards with their children
  // Modify the renderCard function to remove child card rendering
  // Add this function before renderCard
  const getIconComponent = (title: string | undefined | null): IconType => {
    // Handle undefined, null, or empty titles
    if (!title || typeof title !== 'string') {
      return FaEllipsisH; // Default icon for undefined/null titles
    }

    const normalizedTitle = title.toLowerCase();
    if (normalizedTitle.includes('business')) return FaBriefcase;
    if (normalizedTitle.includes('tech')) return FaLaptopCode;
    if (normalizedTitle.includes('building')) return FaBuilding;
    if (normalizedTitle.includes('payment')) return FaMoneyBill;
    if (normalizedTitle.includes('bank')) return FaPiggyBank;
    if (normalizedTitle.includes('ippb')) return FaUniversity;
    if (normalizedTitle.includes('recruitment')) return FaUsers;
    if (normalizedTitle.includes('investigation')) return FaSearch;
    return FaEllipsisH;
  };

  // Update the renderCard function's getIconColor
  const renderCard = (category: Category) => {
    const IconComponent = getIconComponent(category.title);
    const getIconColor = (title: string | undefined | null) => {
      // Handle undefined, null, or empty titles
      if (!title || typeof title !== 'string') {
        return '#607D8B'; // Default color for undefined/null titles
      }

      const normalizedTitle = title.toLowerCase();
      if (normalizedTitle.includes('business')) return '#4CAF50';
      if (normalizedTitle.includes('tech')) return '#2196F3';
      if (normalizedTitle.includes('building')) return '#FF9800';
      if (normalizedTitle.includes('payment')) return '#9C27B0';
      if (normalizedTitle.includes('bank')) return '#F44336';
      if (normalizedTitle.includes('ippb')) return '#3F51B5';
      if (normalizedTitle.includes('recruitment')) return '#009688';
      if (normalizedTitle.includes('investigation')) return '#795548';
      return '#607D8B';
    };

    return (
      <div
        key={category.id}
        className="category-card"
        onClick={async () => {
          // Check if this is a dynamic form route
          const isDynamicForm = category.path.includes('/dynamic-form/');

          if (isDynamicForm) {
            // Extract form ID from path (e.g., '/dynamic-form/123' -> '123')
            const formId = category.path.split('/dynamic-form/')[1];

            if (formId) {
              console.log('🔒 DataEntry: Checking access for form:', formId);

              try {
                // Check if user can access this form
                const hasAccess = await FormFilteringService.canUserAccessForm(formId);

                if (hasAccess) {
                  console.log('✅ DataEntry: Access granted for form:', formId);
                  navigate(category.path);
                } else {
                  console.log('❌ DataEntry: Access denied for form:', formId);
                  alert('Access denied: This form is not available for your office.');
                }
              } catch (error) {
                console.error('❌ DataEntry: Error checking form access:', error);
                alert('Error checking form access. Please try again.');
              }
            } else {
              // Invalid form ID, navigate anyway
              navigate(category.path);
            }
          } else {
            // Not a dynamic form, navigate normally
            navigate(category.path);
          }
        }}
      >
        <div className="category-icon" style={{ color: getIconColor(category.title) }}>
          {React.createElement(IconComponent as React.ComponentType<any>, { size: 40 })}
        </div>
        <h3>{category.title || 'Unnamed Category'}</h3>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <Sidebar userData={userData} />
      <div className="main-content">
        <h1 className="page-title">Data Entry</h1>
        <StatsCards />
        <div className="category-grid">
          {categories
            .filter(category => !category.parentId || category.parentId === '') // Only show top-level cards (handle both null and empty string)
            .filter(category => category.title && category.title.trim() !== '' && category.title !== 'undefined') // Filter out undefined titles
            .map(category => renderCard(category))}
        </div>
      </div>
    </div>
  );
};

export default DataEntry;