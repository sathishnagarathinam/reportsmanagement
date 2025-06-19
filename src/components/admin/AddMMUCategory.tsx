import React, { useState } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FaTruck } from 'react-icons/fa';

const AddMMUCategory: React.FC = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const addMMUCategory = async () => {
    setIsAdding(true);
    setError('');
    setSuccess('');

    try {
      // Add MMU as a main category to Firebase
      const mmuCategoryData = {
        id: 'mmu',
        title: 'MMU',
        parentId: '', // Empty string for top-level category
        isPage: false, // This is a category, not a form page
        pageId: null,
        lastUpdated: new Date(),
        description: 'Mail Motor Unit - Vehicle management and logistics',
        order: 9, // Position before "Others"
        icon: 'truck', // Icon identifier
      };

      // Add to Firebase pages collection (used by PageBuilder)
      await setDoc(doc(db, 'pages', 'mmu'), mmuCategoryData);

      // Also add to categories collection for mobile app
      await setDoc(doc(db, 'categories', 'mmu'), {
        id: 'mmu',
        name: 'MMU',
        icon: 'fatruck', // This will map to FontAwesome truck icon in mobile
        parentId: '', // Empty string for top-level category
        isPage: false,
        pageId: null,
        lastUpdated: new Date(),
        description: 'Mail Motor Unit - Vehicle management and logistics',
        order: 9,
      });

      setSuccess('✅ MMU category successfully added! You can now see it in both web and mobile data entry sections.');
      
      // Refresh the page after 2 seconds to show the new category
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err) {
      console.error('Error adding MMU category:', err);
      setError('❌ Failed to add MMU category. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div style={{
      padding: '20px',
      margin: '20px 0',
      border: '2px solid #007bff',
      borderRadius: '8px',
      backgroundColor: '#f8f9fa'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
        {React.createElement(FaTruck as React.ComponentType<any>, { size: 24, color: '#007bff' })}
        <h3 style={{ margin: 0, color: '#007bff' }}>Add MMU Category</h3>
      </div>
      
      <p style={{ marginBottom: '15px', color: '#495057' }}>
        Click the button below to add the MMU (Mail Motor Unit) category to both web and mobile data entry sections.
        This will create a new top-level category for vehicle management and logistics forms.
      </p>

      {error && (
        <div style={{
          padding: '10px',
          marginBottom: '15px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '10px',
          marginBottom: '15px',
          backgroundColor: '#d4edda',
          color: '#155724',
          border: '1px solid #c3e6cb',
          borderRadius: '4px'
        }}>
          {success}
        </div>
      )}

      <button
        onClick={addMMUCategory}
        disabled={isAdding}
        style={{
          padding: '12px 24px',
          backgroundColor: isAdding ? '#6c757d' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isAdding ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        {React.createElement(FaTruck as React.ComponentType<any>, { size: 16 })}
        {isAdding ? 'Adding MMU Category...' : 'Add MMU Category to Database'}
      </button>

      <div style={{ marginTop: '15px', fontSize: '14px', color: '#6c757d' }}>
        <strong>What this will do:</strong>
        <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
          <li>Add MMU category to Firebase database</li>
          <li>Make MMU appear in web admin panel</li>
          <li>Make MMU appear in mobile app data entry</li>
          <li>Enable creation of MMU-related forms</li>
        </ul>
      </div>
    </div>
  );
};

export default AddMMUCategory;
