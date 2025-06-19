/**
 * MMU Setup and Database Cleanup Utility
 * This utility helps set up MMU properly and clean up undefined entries
 */

import { db } from '../../../../config/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

interface CategoryData {
  id: string;
  title: string;
  path: string;
  parentId: string | null;
  icon?: string;
  color?: string;
  lastUpdated: string;
  isPage: boolean;
  pageId: string;
}

/**
 * Clean up undefined entries and ensure MMU is properly set up
 */
export const setupMMUAndCleanup = async (): Promise<{
  cleaned: number;
  mmuSetup: boolean;
  nestedReports: string[];
}> => {
  try {
    console.log('🔧 Starting MMU setup and database cleanup...');
    
    // Get all categories
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    const categories = categoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CategoryData[];

    let cleanedCount = 0;
    let mmuExists = false;
    let mmuId = '';

    // First pass: Clean up undefined entries and find/fix MMU
    for (const category of categories) {
      // Check if this is an undefined entry
      if (!category.title || category.title.trim() === '' || category.title === 'undefined') {
        // Check if this should be MMU
        if (category.id === 'mmu' || category.id.toLowerCase().includes('mmu')) {
          // Fix MMU entry
          await updateDoc(doc(db, 'categories', category.id), {
            title: 'MMU',
            path: '/categories/mmu',
            parentId: null,
            icon: 'FaTruck',
            color: '#28a745',
            lastUpdated: new Date().toISOString(),
            isPage: false,
            pageId: category.id
          });
          mmuExists = true;
          mmuId = category.id;
          console.log(`✅ Fixed MMU entry: ${category.id}`);
        } else {
          // Delete undefined entries that are not MMU
          await deleteDoc(doc(db, 'categories', category.id));
          cleanedCount++;
          console.log(`🗑️ Deleted undefined entry: ${category.id}`);
        }
      } else if (category.title === 'MMU') {
        mmuExists = true;
        mmuId = category.id;
      }
    }

    // Create MMU if it doesn't exist
    if (!mmuExists) {
      mmuId = 'mmu';
      await setDoc(doc(db, 'categories', mmuId), {
        id: mmuId,
        title: 'MMU',
        path: '/categories/mmu',
        parentId: null,
        icon: 'FaTruck',
        color: '#28a745',
        lastUpdated: new Date().toISOString(),
        isPage: false,
        pageId: mmuId
      });
      console.log('✅ Created MMU category');
    }

    // Create default nested reports under MMU
    const nestedReports = await createMMUNestedReports(mmuId);

    return {
      cleaned: cleanedCount,
      mmuSetup: true,
      nestedReports
    };

  } catch (error) {
    console.error('❌ Error in MMU setup and cleanup:', error);
    throw error;
  }
};

/**
 * Create default nested reports under MMU
 */
export const createMMUNestedReports = async (mmuParentId: string): Promise<string[]> => {
  const nestedReports = [
    {
      id: 'vehicle-maintenance',
      title: 'Vehicle Maintenance',
      description: 'Vehicle maintenance and service records'
    },
    {
      id: 'fuel-management',
      title: 'Fuel Management',
      description: 'Fuel consumption and cost tracking'
    },
    {
      id: 'driver-management',
      title: 'Driver Management',
      description: 'Driver assignments and performance tracking'
    },
    {
      id: 'route-optimization',
      title: 'Route Optimization',
      description: 'Route planning and optimization reports'
    }
  ];

  const createdReports: string[] = [];

  for (const report of nestedReports) {
    try {
      // Check if report already exists
      const existingSnapshot = await getDocs(collection(db, 'categories'));
      const exists = existingSnapshot.docs.some(doc => doc.id === report.id);

      if (!exists) {
        await setDoc(doc(db, 'categories', report.id), {
          id: report.id,
          title: report.title,
          path: `/categories/${mmuParentId}/${report.id}`,
          parentId: mmuParentId,
          icon: 'FaFileAlt',
          color: '#007bff',
          lastUpdated: new Date().toISOString(),
          isPage: true,
          pageId: report.id
        });
        createdReports.push(report.title);
        console.log(`✅ Created nested report: ${report.title}`);
      }
    } catch (error) {
      console.error(`❌ Error creating nested report ${report.title}:`, error);
    }
  }

  return createdReports;
};

/**
 * Add a custom nested report under MMU
 */
export const addCustomMMUReport = async (
  reportId: string,
  reportTitle: string,
  mmuParentId: string = 'mmu'
): Promise<boolean> => {
  try {
    // Sanitize the report ID
    const sanitizedId = reportId.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    await setDoc(doc(db, 'categories', sanitizedId), {
      id: sanitizedId,
      title: reportTitle,
      path: `/categories/${mmuParentId}/${sanitizedId}`,
      parentId: mmuParentId,
      icon: 'FaFileAlt',
      color: '#007bff',
      lastUpdated: new Date().toISOString(),
      isPage: true,
      pageId: sanitizedId
    });

    console.log(`✅ Created custom MMU report: ${reportTitle}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating custom MMU report:`, error);
    return false;
  }
};
