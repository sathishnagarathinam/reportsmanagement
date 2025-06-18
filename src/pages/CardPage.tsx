import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { FaBriefcase, FaLaptopCode, FaBuilding, FaMoneyBill, FaPiggyBank, FaUniversity, FaUsers, FaSearch, FaEllipsisH } from 'react-icons/fa';
import '../components/DataEntry/DataEntry.css';

interface Category {
  id: string;
  title: string;
  path: string;
  icon?: string;
  color?: string;
  parentId?: string | null;
  children?: Category[];
}

const CardPage: React.FC = () => {
  const { '*': splat } = useParams<{ '*': string }>(); // Use splat to get the full path
  const navigate = useNavigate();
  const location = useLocation();
  const [currentCard, setCurrentCard] = useState<Category | null>(null);
  const [childCards, setChildCards] = useState<Category[]>([]);
  const [parentCard, setParentCard] = useState<Category | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Category[]>([]);

  const getIconComponent = (title: string) => {
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

  const fetchBreadcrumb = async (card: Category, currentPathname: string) => {
    const breadcrumbPath: Category[] = [];
    let currentItem = card;
    let pathBuilder = currentPathname;

    // Add current card first
    breadcrumbPath.unshift({ ...currentItem, path: pathBuilder });

    while (currentItem.parentId) {
      const parentRef = doc(db, 'categories', currentItem.parentId);
      const parentSnap = await getDoc(parentRef);

      if (parentSnap.exists()) {
        const parentData = { id: parentSnap.id, ...parentSnap.data() } as Category;
        // Construct parent path by removing the last segment
        const pathSegments = pathBuilder.split('/').filter(Boolean);
        pathBuilder = `/${pathSegments.slice(0, -1).join('/')}`;
        breadcrumbPath.unshift({ ...parentData, path: pathBuilder });
        currentItem = parentData;
      } else {
        break; // Parent not found
      }
    }
    setBreadcrumb(breadcrumbPath);
  };

  useEffect(() => {
    setCurrentCard(null);
    setChildCards([]);
    setParentCard(null);
    setBreadcrumb([]);

    const fetchCardData = async () => {
      const pathSegments = location.pathname.split('/').filter(Boolean);
      // The last segment is the ID of the current card
      const currentCardId = pathSegments[pathSegments.length - 1];

      if (!currentCardId) {
        // This case might happen if the path is just /data-entry, handle appropriately
        // For now, let's assume it means going back to the root or a default view
        navigate('/data-entry'); 
        return;
      }

      const cardRef = doc(db, 'categories', currentCardId);
      const cardSnap = await getDoc(cardRef);

      if (cardSnap.exists()) {
        const currentCardData = {
          id: cardSnap.id,
          ...cardSnap.data(),
          path: location.pathname, // Use the current full path
        } as Category;
        setCurrentCard(currentCardData);

        if (currentCardData.parentId) {
          const parentRef = doc(db, 'categories', currentCardData.parentId);
          const parentSnap = await getDoc(parentRef);
          if (parentSnap.exists()) {
            const parentPath = `/${pathSegments.slice(0, -1).join('/')}`;
            setParentCard({
              id: parentSnap.id,
              ...parentSnap.data(),
              path: parentPath,
            } as Category);
          }
        }

        const childrenQuery = query(
          collection(db, 'categories'),
          where('parentId', '==', currentCardId)
        );
        const childrenSnap = await getDocs(childrenQuery);
        const childrenData = childrenSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          // Child path is current path + child ID
          path: `${location.pathname}/${doc.id}`,
        })) as Category[];
        setChildCards(childrenData);

        await fetchBreadcrumb(currentCardData, location.pathname);
      } else {
        // Card not found, maybe navigate to a 404 page or back
        navigate('/data-entry');
      }
    };

    fetchCardData();
  }, [location.pathname, navigate]); // Depend on location.pathname

  const renderCard = (category: Category) => {
    const IconComponent = getIconComponent(category.title);
    return (
      <div
        key={category.id}
        className="category-card"
        onClick={() => {
          // Navigate to the child card's full path
          navigate(category.path);
        }}
      >
        <div className="category-icon" style={{ color: getIconColor(category.title) }}>
          <IconComponent size={40} />
        </div>
        <h3>{category.title}</h3>
      </div>
    );
  };

  const handleBack = () => {
    if (parentCard && parentCard.path) {
      navigate(parentCard.path);
    } else {
      // If no parent or parent path, go to the main data-entry page
      const pathSegments = location.pathname.split('/').filter(Boolean);
      if (pathSegments.length > 1) { // We are in a nested card
         const oneLevelUp = `/${pathSegments.slice(0, -1).join('/')}`;
         if (oneLevelUp === '/data-entry') {
            navigate('/data-entry'); // Go to root if one level up is data-entry
         } else {
            navigate(oneLevelUp);
         }
      } else {
        navigate('/data-entry'); // Default back to data-entry root
      }
    }
  };

  if (!currentCard) return <div>Loading...</div>;

  return (
    <div className="dashboard-container">
      <div className="main-content">
        <div className="breadcrumb-navigation">
          {breadcrumb.map((item, index) => (
            <React.Fragment key={item.id}>
              <span 
                className="breadcrumb-item"
                onClick={() => navigate(item.path)}
                style={{ cursor: 'pointer' }}
              >
                {item.title}
              </span>
              {index < breadcrumb.length - 1 && <span> / </span>}
            </React.Fragment>
          ))}
        </div>
        <div 
          className="page-header" 
          onClick={handleBack}
          style={{ cursor: 'pointer' }}
          title={parentCard ? `Back to ${parentCard.title}` : 'Back to Dashboard'}
        >
          <div className="current-card-icon" style={{ color: getIconColor(currentCard.title) }}>
            {React.createElement(getIconComponent(currentCard.title), { size: 60 })}
          </div>
          <h1 className="page-title">{currentCard.title}</h1>
        </div>
        <div className="category-grid">
          {childCards.map(card => renderCard(card))}
        </div>
      </div>
    </div>
  );
};

export default CardPage;