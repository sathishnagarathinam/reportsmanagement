/**
 * MMU Category Setup Utility
 * Creates MMU subcategories with the same hierarchical logic as PLI
 */

import { db } from '../../../../config/firebase';
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';

interface CategoryData {
  id: string;
  title: string;
  path: string;
  parentId: string | null;
  icon: string;
  color: string;
  lastUpdated: string;
  isPage: boolean;
  pageId: string;
}

/**
 * Set up MMU category with subcategories using PLI-like structure
 */
export const setupMMUWithSubcategories = async (): Promise<{
  mmuCreated: boolean;
  subcategoriesCreated: string[];
  errors: string[];
}> => {
  const results = {
    mmuCreated: false,
    subcategoriesCreated: [] as string[],
    errors: [] as string[]
  };

  try {
    console.log('🚛 Setting up MMU category with subcategories...');

    // First, ensure MMU parent category exists
    const mmuId = 'mmu';
    const mmuExists = await checkCategoryExists(mmuId);

    if (!mmuExists) {
      await createMMUParentCategory(mmuId);
      results.mmuCreated = true;
      console.log('✅ Created MMU parent category');
    } else {
      console.log('✅ MMU parent category already exists');
    }

    // Define MMU subcategories (similar to PLI structure)
    const subcategories = [
      {
        id: 'vehicle-maintenance',
        title: 'Vehicle Maintenance',
        icon: 'FaTruck',
        color: '#28a745',
        description: 'Vehicle maintenance and service records'
      },
      {
        id: 'fuel-management',
        title: 'Fuel Management',
        icon: 'FaGasPump',
        color: '#fd7e14',
        description: 'Fuel consumption and cost tracking'
      },
      {
        id: 'driver-management',
        title: 'Driver Management',
        icon: 'FaUserTie',
        color: '#6f42c1',
        description: 'Driver assignments and performance tracking'
      },
      {
        id: 'route-optimization',
        title: 'Route Optimization',
        icon: 'FaRoute',
        color: '#20c997',
        description: 'Route planning and optimization reports'
      },
      {
        id: 'vehicle-tracking',
        title: 'Vehicle Tracking',
        icon: 'FaMapMarkerAlt',
        color: '#dc3545',
        description: 'Real-time vehicle location and tracking'
      },
      {
        id: 'maintenance-schedule',
        title: 'Maintenance Schedule',
        icon: 'FaCalendarAlt',
        color: '#0dcaf0',
        description: 'Scheduled maintenance and service planning'
      }
    ];

    // Create subcategories
    for (const subcat of subcategories) {
      try {
        const subcatExists = await checkCategoryExists(subcat.id);
        
        if (!subcatExists) {
          await createSubcategory(mmuId, subcat);
          results.subcategoriesCreated.push(subcat.title);
          console.log(`✅ Created subcategory: ${subcat.title}`);
        } else {
          console.log(`✅ Subcategory already exists: ${subcat.title}`);
        }
      } catch (error) {
        const errorMsg = `Failed to create ${subcat.title}: ${error}`;
        results.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log('🎉 MMU setup completed successfully!');
    return results;

  } catch (error) {
    const errorMsg = `MMU setup failed: ${error}`;
    results.errors.push(errorMsg);
    console.error(`❌ ${errorMsg}`);
    return results;
  }
};

/**
 * Check if a category exists in Firebase
 */
const checkCategoryExists = async (categoryId: string): Promise<boolean> => {
  try {
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    return categoriesSnapshot.docs.some(doc => doc.id === categoryId);
  } catch (error) {
    console.error(`Error checking category existence: ${error}`);
    return false;
  }
};

/**
 * Create MMU parent category
 */
const createMMUParentCategory = async (mmuId: string): Promise<void> => {
  const mmuData: CategoryData = {
    id: mmuId,
    title: 'MMU',
    path: `/data-entry/${mmuId}`,
    parentId: null, // Top-level category
    icon: 'FaTruck',
    color: '#28a745',
    lastUpdated: new Date().toISOString(),
    isPage: false, // Parent category, not a form page
    pageId: mmuId
  };

  await setDoc(doc(db, 'categories', mmuId), mmuData);
};

/**
 * Create a subcategory under MMU
 */
const createSubcategory = async (
  parentId: string,
  subcategory: {
    id: string;
    title: string;
    icon: string;
    color: string;
    description: string;
  }
): Promise<void> => {
  const subcategoryData: CategoryData = {
    id: subcategory.id,
    title: subcategory.title,
    path: `/data-entry/${parentId}/${subcategory.id}`,
    parentId: parentId,
    icon: subcategory.icon,
    color: subcategory.color,
    lastUpdated: new Date().toISOString(),
    isPage: true, // This is a form page
    pageId: subcategory.id
  };

  await setDoc(doc(db, 'categories', subcategory.id), subcategoryData);
};

/**
 * Get all MMU subcategories
 */
export const getMMUSubcategories = async (): Promise<CategoryData[]> => {
  try {
    const subcategoriesQuery = query(
      collection(db, 'categories'),
      where('parentId', '==', 'mmu')
    );
    
    const snapshot = await getDocs(subcategoriesQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CategoryData[];
  } catch (error) {
    console.error('Error fetching MMU subcategories:', error);
    return [];
  }
};

/**
 * Verify MMU hierarchy is properly set up
 */
export const verifyMMUHierarchy = async (): Promise<{
  isValid: boolean;
  issues: string[];
  summary: string;
}> => {
  const issues: string[] = [];
  
  try {
    // Check if MMU parent exists
    const mmuExists = await checkCategoryExists('mmu');
    if (!mmuExists) {
      issues.push('MMU parent category does not exist');
    }

    // Check subcategories
    const subcategories = await getMMUSubcategories();
    if (subcategories.length === 0) {
      issues.push('No MMU subcategories found');
    }

    // Validate each subcategory structure
    for (const subcat of subcategories) {
      if (!subcat.parentId || subcat.parentId !== 'mmu') {
        issues.push(`Subcategory ${subcat.title} has incorrect parentId: ${subcat.parentId}`);
      }
      
      if (!subcat.path || !subcat.path.includes('/data-entry/mmu/')) {
        issues.push(`Subcategory ${subcat.title} has incorrect path: ${subcat.path}`);
      }
      
      if (!subcat.isPage) {
        issues.push(`Subcategory ${subcat.title} should be a page (isPage: true)`);
      }
    }

    const isValid = issues.length === 0;
    const summary = isValid 
      ? `✅ MMU hierarchy is properly configured with ${subcategories.length} subcategories`
      : `❌ Found ${issues.length} issues in MMU hierarchy`;

    return { isValid, issues, summary };

  } catch (error) {
    issues.push(`Error verifying hierarchy: ${error}`);
    return {
      isValid: false,
      issues,
      summary: '❌ Failed to verify MMU hierarchy'
    };
  }
};
