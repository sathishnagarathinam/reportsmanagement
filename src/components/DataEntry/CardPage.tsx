import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../shared/Sidebar';
import { FaBriefcase, FaLaptopCode, FaBuilding, FaMoneyBill, FaPiggyBank, FaUniversity, FaUsers, FaSearch, FaEllipsisH, FaLock } from 'react-icons/fa';
import './DataEntry.css';
import DynamicForm, { FormConfig, DynamicFormRef } from '../shared/DynamicForm'; // Import the new component and FormConfig
import { FormFilteringService } from '../../services/formFilteringService';

// Define the Category interface
interface Category {
  id: string;
  name: string;
  parentId?: string | null;
  path?: string;
  subCategories?: string[]; // Assuming this might be part of your category structure
  hasChildren?: boolean;
  icon?: string; // Or any other relevant fields from your Firestore documents
  [key: string]: any; // To allow for other properties from Firestore
}

// Remove or comment out the old Section and PageConfig interfaces if DynamicForm's are sufficient
/*
interface Section { ... }
interface PageConfig { ... }
*/

const CardPage: React.FC = () => {
  // Existing state variables
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [currentCard, setCurrentCard] = useState<Category | null>(null);
  const [childCards, setChildCards] = useState<Category[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<Category[]>([]);
  
  // State variables for page configuration
  const [pageConfig, setPageConfig] = useState<FormConfig | null>(null); // Updated to use FormConfig
  const [hasPageConfig, setHasPageConfig] = useState(false); // Old
  const [loading, setLoading] = useState(false); // Old, DynamicForm has its own
  const [error, setError] = useState<string | null>(null); // Old, DynamicForm has its own

  const [currentCardId, setCurrentCardId] = useState<string | null>(null);

  // Office access validation state
  const [accessValidated, setAccessValidated] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const cardIdFromPath = pathSegments[pathSegments.length - 1];
    if (cardIdFromPath) {
      setCurrentCardId(cardIdFromPath);
      console.log('Card ID from path:', cardIdFromPath); // Add this line
    }

    const fetchCardData = async () => {
      if (!cardIdFromPath) return;

      const categoryRef = doc(db, 'categories', cardIdFromPath);
      const categorySnap = await getDoc(categoryRef);

      if (categorySnap.exists()) {
        const cardData = { id: categorySnap.id, ...categorySnap.data() } as Category;
        setCurrentCard(cardData);
        
        const childrenQuery = query(
          collection(db, 'categories'),
          where('parentId', '==', cardIdFromPath)
        );
        const childrenSnap = await getDocs(childrenQuery);
        const childrenData = childrenSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(), 
        })) as Category[];
        setChildCards(childrenData);

        // Breadcrumb logic (ensure this is still working as expected)
        const newBreadcrumb: Category[] = [];
        let currentId = cardData.parentId;
        let currentPathForBreadcrumb = location.pathname;
        const pathParts = currentPathForBreadcrumb.split('/').filter(p => p);

        // Add current card to breadcrumb first
        if (pathParts.length > 1) { // Assuming /data-entry/cardId, so at least 2 parts
            const currentCardPath = `/data-entry/${pathParts.slice(1).join('/')}`;
            newBreadcrumb.unshift({ ...cardData, path: currentCardPath });
        }

        // Traverse up for parent breadcrumbs
        while (currentId && pathParts.length > 2) { // Stop if no parentId or at /data-entry/parent
            pathParts.pop(); // Remove current segment
            const parentPath = `/data-entry/${pathParts.slice(1).join('/')}`;
            const parentRef = doc(db, 'categories', currentId);
            const parentSnap = await getDoc(parentRef);
            if (parentSnap.exists()) {
                const parentData = { id: parentSnap.id, ...parentSnap.data(), path: parentPath } as Category;
                newBreadcrumb.unshift(parentData);
                currentId = parentData.parentId;
            } else {
                break; // Parent not found
            }
        }
        setBreadcrumb(newBreadcrumb);

      } else {
        setCurrentCard(null);
        setChildCards([]);
        setBreadcrumb([]);
      }
    };

    if (cardIdFromPath) {
        fetchCardData();
    }
  }, [location.pathname]);

  // Office access validation effect
  useEffect(() => {
    const validateAccess = async () => {
      if (!currentCardId) return;

      setAccessLoading(true);
      setAccessError(null);

      try {
        console.log('🔒 CardPage: Validating access for form:', currentCardId);

        const hasFormAccess = await FormFilteringService.canUserAccessForm(currentCardId);

        setHasAccess(hasFormAccess);
        setAccessValidated(true);

        console.log(`🔒 CardPage: Access ${hasFormAccess ? 'GRANTED' : 'DENIED'} for form:`, currentCardId);

        if (!hasFormAccess) {
          setAccessError('Access denied: This form is not available for your office.');
        }
      } catch (error) {
        console.error('❌ CardPage: Error validating access:', error);
        setAccessError('Error validating form access. Please try again.');
        setHasAccess(false);
      } finally {
        setAccessLoading(false);
      }
    };

    validateAccess();
  }, [currentCardId]);

  // Remove old loadPageConfig and renderSectionContent functions
  // const loadPageConfig = async (cardId: string) => { ... }; // Old
  // const renderSectionContent = (section: Section) => { ... }; // Old

  const dynamicFormRef = React.useRef<DynamicFormRef>(null);

  const handleFormSubmit = async (formData: Record<string, any>) => {
    console.log('Form submitted in CardPage:', formData);

    try {
      // Get readable employee ID from current user's profile
      const readableEmployeeId = await getReadableEmployeeId(formData);
      console.log('Readable Employee ID:', readableEmployeeId);

      // Get current Firebase user for user_id
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated. Please log in again.');
      }

      console.log('🔍 Form submission - Firebase User:', currentUser.uid);
      console.log('🔍 Form submission - Employee ID:', readableEmployeeId);

      // Save to Supabase dynamic_form_submissions table (include both user_id and employee_id)
      const submissionData = {
        form_identifier: currentCardId,
        user_id: currentUser.uid, // Firebase Auth UID as string
        employee_id: readableEmployeeId, // Save readable employee ID
        submission_data: formData,
        submitted_at: new Date().toISOString()
      };

      console.log('🔍 Final submission data:', submissionData);

      const { data, error } = await supabase
        .from('dynamic_form_submissions')
        .insert(submissionData);

      if (error) {
        console.error('Error saving form data:', error);
        alert(`Error saving form: ${error.message}`);
      } else {
        console.log('Form data saved successfully:', data);
        alert('Form submitted successfully!');

        // Explicitly call the clear method with a slight delay to ensure alert is seen
        setTimeout(() => {
          if (dynamicFormRef.current) {
            console.log('Calling clearFormAfterSubmission via ref');
            dynamicFormRef.current.clearFormAfterSubmission();
          } else {
            console.warn('Form ref is not available for clearing');
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(`Error submitting form: ${error}`);
    }
  };

  const handleFormCleared = () => {
    console.log('✅ Form has been cleared and is ready for next submission');
  };

  // Gets the readable employee ID from the current user's profile
  const getReadableEmployeeId = async (formData: Record<string, any>): Promise<string> => {
    try {
      // Get current user from Firebase Auth
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.warn('⚠️ No Firebase user found, using fallback employee ID');
        return extractEmployeeId(formData);
      }

      // Try to get employee ID from Firestore (employees collection)
      try {
        const userDoc = await getDoc(doc(db, 'employees', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const employeeId = userData?.employeeId;
          if (employeeId && typeof employeeId === 'string' && employeeId.trim()) {
            console.log('✅ Found employee ID in Firestore:', employeeId);
            return employeeId.trim();
          }
        }
      } catch (firestoreError) {
        console.warn('⚠️ Error fetching from Firestore:', firestoreError);
      }

      // Try to get employee ID from Supabase (user_profiles table)
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('employeeId')
          .eq('uid', currentUser.uid)
          .single();

        if (!error && data?.employeeId && typeof data.employeeId === 'string' && data.employeeId.trim()) {
          console.log('✅ Found employee ID in Supabase:', data.employeeId);
          return data.employeeId.trim();
        }
      } catch (supabaseError) {
        console.warn('⚠️ Error fetching from Supabase:', supabaseError);
      }

      // Fallback: extract from form data or generate readable ID
      console.warn('⚠️ No employee ID found in databases, extracting from form data');
      const extractedId = extractEmployeeId(formData);

      // Ensure the extracted ID is readable and not a Firebase UID
      if (extractedId.length > 20 || extractedId.includes('-')) {
        // This looks like a Firebase UID, generate a readable ID instead
        const timestamp = Date.now();
        const readableId = `USER${timestamp.toString().slice(-6)}`;
        console.warn('⚠️ Extracted ID looks like UID, using readable ID:', readableId);
        return readableId;
      }

      return extractedId;

    } catch (error) {
      console.error('❌ Error getting readable employee ID:', error);
      // Generate a safe readable ID as final fallback
      const timestamp = Date.now();
      const safeId = `USER${timestamp.toString().slice(-6)}`;
      console.warn('⚠️ Using safe fallback employee ID:', safeId);
      return safeId;
    }
  };

  // Helper function to extract employee ID from form data
  const extractEmployeeId = (formData: Record<string, any>): string => {
    console.log('🔍 Extracting employee ID from form data:', formData);

    // Common field names that might contain employee ID
    const employeeIdFields = [
      'employeeId', 'employee_id', 'Employee ID', 'emp_id', 'empId',
      'staffId', 'staff_id', 'Staff ID', 'id', 'ID', 'userId', 'user_id'
    ];

    // Try to find employee ID field
    for (const field of employeeIdFields) {
      if (formData[field] && typeof formData[field] === 'string') {
        const value = formData[field].trim();
        if (value.length > 0) {
          console.log(`✅ Found employee ID in field "${field}": "${value}"`);
          return value;
        }
      }
    }

    // Try to extract a name or meaningful identifier from form data
    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string' && value.length > 2 && value.length < 50) {
        // Skip dates, office names, and other non-name fields
        if (value.includes('T') && value.includes(':')) continue;
        if (value.includes(' BO') || value.includes(' SO') || value.includes(' RO')) continue;
        if (key.toLowerCase().includes('office')) continue;

        // If it looks like a name, create an ID from it
        const cleanName = value.trim().replace(/\s+/g, '').toUpperCase();
        if (cleanName.length >= 3) {
          const shortId = cleanName.substring(0, 8);
          console.log(`✅ Generated employee ID from name "${value}": "${shortId}"`);
          return shortId;
        }
      }
    }

    // Final fallback: generate a readable ID
    const timestamp = Date.now();
    const shortId = `USER${timestamp.toString().slice(-6)}`;
    console.log(`⚠️ Using fallback employee ID: "${shortId}"`);
    return shortId;
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = {
      FaBriefcase,
      FaLaptopCode,
      FaBuilding,
      FaMoneyBill,
      FaPiggyBank,
      FaUniversity,
      FaUsers,
      FaSearch,
      FaEllipsisH
    }[iconName || 'FaEllipsisH'] || FaEllipsisH;

    return <IconComponent />;
  };

  const handleBack = () => {
    if (breadcrumb.length > 1) {
      const path = breadcrumb[breadcrumb.length - 2]?.path;
      if (path) {
        navigate(path);
      } else {
        // Fallback if path is not defined, e.g., navigate to a default parent or home
        navigate('/data-entry'); 
      }
    } else {
      const currentPath = location.pathname;
      const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
      if (parentPath && parentPath !== '/data-entry') {
        navigate(parentPath);
      } else {
        navigate('/data-entry');
      }
    }
  };

  const getIconColor = (title: string) => {
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
    <div className="dashboard-container">
      <Sidebar userData={userData} /> {/* Assuming userData is fetched elsewhere or passed down */}
      <div className="main-content">
        {/* Breadcrumb display */}
        <div className="breadcrumb">
          <span onClick={() => navigate('/data-entry')} style={{cursor: 'pointer', marginRight: '5px'}}>Data Entry</span>
          {breadcrumb.map((item, index) => (
            <span key={item.id} style={{cursor: 'pointer'}}>
              {' > '}
              <span 
                onClick={() => {
                  if (item.path) {
                    navigate(item.path);
                  }
                }} 
                style={{fontWeight: item.id === currentCardId ? 'bold' : 'normal'}} // Highlight current card in breadcrumb
              >
                {item.title} 
              </span>
            </span>
          ))}
        </div>

        {currentCard && (
          <div className="card-page-header" style={{ transition: 'opacity 0.2s' }}>
            <div className="card-icon" style={{ color: getIconColor(currentCard.title) }}>
              {renderIcon(currentCard.icon || '')}
            </div>
            <h2>{currentCard.title}</h2>
          </div>
        )}
        <button onClick={handleBack} className="back-button" style={{marginBottom: '20px'}}>Back</button>

        {/* Child Cards Container - Kept as is */}
        <div className="child-cards-container">
          <h2>Sub Reports</h2>
          <div className="category-grid">
            {childCards.map(child => (
              <div
                key={child.id}
                className="category-card nested-card"
                onClick={() => {
                  if (child.path) {
                    navigate(child.path);
                  }
                }} // Ensure child.path is correctly formed and exists
              >
                <div className="category-icon" style={{ color: child.color || '#2196f3' }}>
                  {renderIcon(child.icon || 'FaEllipsisH')}
                </div>
                <h3>{child.title}</h3>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Form Section - Conditionally render based on childCards and access validation */}
        {currentCardId && childCards.length === 0 && (
          <div className="page-content">
            {accessLoading ? (
              <div className="access-loading">
                <div className="loading-spinner"></div>
                <p>Validating form access...</p>
              </div>
            ) : accessError ? (
              <div className="access-denied">
                <FaLock size={48} color="#ff6b6b" />
                <h3>Access Restricted</h3>
                <p>{accessError}</p>
                <button
                  onClick={() => navigate('/data-entry')}
                  className="back-to-forms-btn"
                >
                  Back to Forms
                </button>
              </div>
            ) : hasAccess ? (
              <DynamicForm
                cardId={currentCardId}
                onSubmitForm={handleFormSubmit}
                onFormCleared={handleFormCleared}
                ref={dynamicFormRef}
              />
            ) : (
              <div className="access-denied">
                <FaLock size={48} color="#ff6b6b" />
                <h3>Access Denied</h3>
                <p>This form is not available for your office.</p>
                <button
                  onClick={() => navigate('/data-entry')}
                  className="back-to-forms-btn"
                >
                  Back to Forms
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CardPage;
