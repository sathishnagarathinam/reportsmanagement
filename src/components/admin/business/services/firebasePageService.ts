import { db, auth } from '../../../../config/firebase';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, orderBy, where } from 'firebase/firestore';
import { PageConfig } from '../types/PageBuilderTypes';

export interface FirebasePageConfig {
  id: string;
  title: string;
  lastUpdated: string;
  ownerId: string; // User who created/owns this configuration
  selectedRegion?: string;
  selectedDivision?: string;
  selectedOffice?: string;
  selectedFrequency?: string;
  fromEffectDate?: string;
  selectedRegions: string[];
  selectedDivisions: string[];
  selectedOffices: string[];
  fields: any[];
  createdAt?: string;
  updatedAt?: string;
}

class FirebasePageService {
  private collectionName = 'page_configurations';

  /**
   * Save page configuration to Firebase with ownership isolation
   * Only the owner can modify their configuration
   */
  async savePageConfig(pageConfig: PageConfig): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to save page configurations');
      }

      console.log('📝 FirebasePageService: Saving page config:', pageConfig.id);
      console.log('📝 FirebasePageService: Owner UID:', currentUser.uid);

      const firebaseConfig: any = {
        id: pageConfig.id,
        title: pageConfig.title,
        lastUpdated: pageConfig.lastUpdated,
        ownerId: currentUser.uid, // Store the UID of the user who created/is saving this config
        selectedRegions: pageConfig.selectedRegions || [],
        selectedDivisions: pageConfig.selectedDivisions || [],
        selectedOffices: pageConfig.selectedOffices || [],
        fields: pageConfig.fields || [],
        updatedAt: new Date().toISOString(),
      };

      // Add createdAt only on first save (if not already present)
      if (!pageConfig.createdAt) {
        firebaseConfig.createdAt = new Date().toISOString();
      } else {
        firebaseConfig.createdAt = pageConfig.createdAt;
      }

      // Only add optional fields if they have values (avoid undefined fields)
      if (pageConfig.selectedRegion !== undefined) {
        firebaseConfig.selectedRegion = pageConfig.selectedRegion;
      }
      if (pageConfig.selectedDivision !== undefined) {
        firebaseConfig.selectedDivision = pageConfig.selectedDivision;
      }
      if (pageConfig.selectedOffice !== undefined) {
        firebaseConfig.selectedOffice = pageConfig.selectedOffice;
      }
      if (pageConfig.selectedFrequency !== undefined) {
        firebaseConfig.selectedFrequency = pageConfig.selectedFrequency;
      }
      if (pageConfig.fromEffectDate !== undefined && pageConfig.fromEffectDate !== null && pageConfig.fromEffectDate !== '') {
        firebaseConfig.fromEffectDate = pageConfig.fromEffectDate;
      }

      await setDoc(doc(db, this.collectionName, pageConfig.id), firebaseConfig);
      console.log('✅ FirebasePageService: Config saved successfully with owner isolation');
    } catch (error) {
      console.error('❌ FirebasePageService: Error saving config:', error);
      throw error;
    }
  }

  /**
   * Load page configuration from Firebase with ownership check
   * Users can only load their own configurations
   */
  async loadPageConfig(pageId: string): Promise<PageConfig | null> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('⚠️ FirebasePageService: User not authenticated');
        return null;
      }

      console.log('🔍 FirebasePageService: Loading config for pageId:', pageId);
      console.log('🔍 FirebasePageService: Current user UID:', currentUser.uid);

      const docRef = doc(db, this.collectionName, pageId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.log('⚠️ FirebasePageService: No config found');
        return null;
      }

      const data = docSnap.data() as FirebasePageConfig;

      // Verify ownership before returning
      if (data.ownerId && data.ownerId !== currentUser.uid) {
        console.log('❌ FirebasePageService: Access denied - config owned by different user');
        console.log('   Config owner:', data.ownerId);
        console.log('   Current user:', currentUser.uid);
        return null;
      }

      console.log('✅ FirebasePageService: Config loaded and ownership verified');
      return data as PageConfig;
    } catch (error) {
      console.error('❌ FirebasePageService: Error loading config:', error);
      throw error;
    }
  }

  /**
   * Delete page configuration from Firebase with ownership check
   * Users can only delete their own configurations
   */
  async deletePageConfig(pageId: string): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to delete page configurations');
      }

      console.log('🗑️ FirebasePageService: Deleting config:', pageId);
      console.log('🗑️ FirebasePageService: Current user UID:', currentUser.uid);

      // Verify ownership before deleting
      const docRef = doc(db, this.collectionName, pageId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Configuration not found');
      }

      const data = docSnap.data() as FirebasePageConfig;
      if (data.ownerId !== currentUser.uid) {
        throw new Error('Access denied - you can only delete your own configurations');
      }

      await deleteDoc(docRef);
      console.log('✅ FirebasePageService: Config deleted successfully');
    } catch (error) {
      console.error('❌ FirebasePageService: Error deleting config:', error);
      throw error;
    }
  }

  /**
   * Get all page configurations for the current user from Firebase
   * Users only see their own configurations
   */
  async getAllPageConfigs(): Promise<PageConfig[]> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('⚠️ FirebasePageService: User not authenticated - returning empty list');
        return [];
      }

      console.log('📋 FirebasePageService: Loading all configs for user:', currentUser.uid);

      // Query with ownership filter - only show configs owned by current user
      const q = query(
        collection(db, this.collectionName),
        where('ownerId', '==', currentUser.uid),
        orderBy('lastUpdated', 'desc')
      );
      const snapshot = await getDocs(q);

      const configs = snapshot.docs.map(doc => doc.data() as PageConfig);
      console.log(`✅ FirebasePageService: Loaded ${configs.length} user-owned configs`);
      return configs;
    } catch (error) {
      console.error('❌ FirebasePageService: Error loading all configs:', error);
      return [];
    }
  }
}

export const firebasePageService = new FirebasePageService();
