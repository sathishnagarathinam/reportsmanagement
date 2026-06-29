import { supabase } from '../config/supabaseClient';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { auth } from '../config/firebase';
import OfficeService from './officeService';

export interface FormConfiguration {
  id: string;
  title: string;
  selectedOffices?: string[];
  fields?: any[];
  lastUpdated?: string;
}

export interface FilteredFormResult {
  accessibleForms: FormConfiguration[];
  totalForms: number;
  userOfficeName: string | null;
}

/**
 * Service for filtering dynamic forms based on user's office access
 */
export class FormFilteringService {
  
  /**
   * Gets the current user's office name from Firebase
   */
  static async getCurrentUserOfficeName(): Promise<string | null> {
    try {
      console.log('FormFilteringService: Fetching current user office name...');
      
      const user = auth.currentUser;
      if (!user) {
        console.log('FormFilteringService: No user logged in');
        return null;
      }

      // Try employees collection first
      const employeeDoc = await getDoc(doc(db, 'employees', user.uid));
      if (employeeDoc.exists()) {
        const userData = employeeDoc.data();
        const officeName = userData?.officeName || null;
        if (officeName) {
          console.log('FormFilteringService: User office name from employees:', officeName);
          return officeName;
        }
      }

      // Fallback to userProfiles collection
      const userProfileDoc = await getDoc(doc(db, 'userProfiles', user.uid));
      if (userProfileDoc.exists()) {
        const userData = userProfileDoc.data();
        const officeName = userData?.officeName || null;
        if (officeName) {
          console.log('FormFilteringService: User office name from userProfiles:', officeName);
          return officeName;
        }
      }

      console.log('FormFilteringService: User document not found in employees or userProfiles');
      return null;

    } catch (error) {
      console.error('FormFilteringService: Error getting user office name:', error);
      return null;
    }
  }

  /**
   * Fetches form configurations from Firebase page_configurations collection
   */
  static async fetchFormConfigurations(): Promise<FormConfiguration[]> {
    try {
      console.log('FormFilteringService: Fetching form configurations from Firebase...');

      const snapshot = await getDocs(collection(db, 'page_configurations'));
      const formConfigs: FormConfiguration[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        formConfigs.push({
          id: doc.id,
          title: data.title || 'Untitled Form',
          selectedOffices: data.selectedOffices || data.selected_offices || [],
          fields: data.fields || [],
          lastUpdated: data.lastUpdated || data.last_updated || data.updatedAt
        });
      });

      console.log('FormFilteringService: Fetched', formConfigs.length, 'form configurations');
      return formConfigs.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    } catch (error) {
      console.error('FormFilteringService: Error fetching form configurations:', error);
      return [];
    }
  }

  /**
   * Gets filtered forms for the current user
   */
  static async getFilteredFormsForCurrentUser(): Promise<FilteredFormResult> {
    try {
      console.log('FormFilteringService: Getting filtered forms for current user...');

      // Get user's office name
      const userOfficeName = await this.getCurrentUserOfficeName();
      
      // Get all form configurations
      const allForms = await this.fetchFormConfigurations();
      
      // Filter forms based on user's office access
      const accessibleForms = OfficeService.filterFormsByOfficeAccess(allForms, userOfficeName);
      
      console.log(`FormFilteringService: User has access to ${accessibleForms.length} out of ${allForms.length} forms`);
      
      return {
        accessibleForms,
        totalForms: allForms.length,
        userOfficeName
      };

    } catch (error) {
      console.error('FormFilteringService: Error getting filtered forms:', error);
      return {
        accessibleForms: [],
        totalForms: 0,
        userOfficeName: null
      };
    }
  }

  /**
   * Checks if a specific form is accessible to the current user.
   * Handles both office names and facility IDs in selectedOffices.
   */
  static async canUserAccessForm(formId: string): Promise<boolean> {
    try {
      console.log('FormFilteringService: Checking access for form:', formId);

      // Get user's office name
      const userOfficeName = await this.getCurrentUserOfficeName();
      if (!userOfficeName) {
        console.log('FormFilteringService: No user office found');
        return false;
      }

      // Get specific form configuration from Firebase
      const formDocRef = doc(db, 'page_configurations', formId);
      const formDoc = await getDoc(formDocRef);

      if (!formDoc.exists()) {
        console.log('FormFilteringService: Form not found in Firebase:', formId);
        return false;
      }

      const formData = formDoc.data();
      const selectedOffices = formData?.selectedOffices || formData?.selected_offices || [];

      // First try exact office name match
      const hasAccess = OfficeService.checkFormAccess(userOfficeName, selectedOffices);
      if (hasAccess) {
        console.log(`FormFilteringService: User CAN access form by office name:`, formId);
        return true;
      }

      // Fallback: some forms may have facility IDs stored in selectedOffices.
      // Look up the office name for each selected facility ID and compare.
      const userOfficeNameNormalized = userOfficeName.toLowerCase().trim();
      for (const selectedOffice of selectedOffices) {
        const selectedValue = selectedOffice?.toString().trim() ?? '';
        if (selectedValue === '') continue;

        try {
          const officeDocRef = doc(db, 'offices', selectedValue);
          const officeDoc = await getDoc(officeDocRef);
          if (officeDoc.exists()) {
            const officeData = officeDoc.data();
            const officeName = officeData?.officeName || officeData?.office_name || officeData?.name || '';
            if (officeName.toLowerCase().trim() === userOfficeNameNormalized) {
              console.log(`FormFilteringService: User CAN access form by facility ID:`, formId, selectedValue);
              return true;
            }
          }
        } catch (e) {
          // Ignore lookup errors for non-facility-ID values
        }
      }

      console.log(`FormFilteringService: User CANNOT access form:`, formId);
      return false;

    } catch (error) {
      console.error('FormFilteringService: Error checking form access:', error);
      return false;
    }
  }

  /**
   * Gets form configurations that match specific criteria
   */
  static async searchFormConfigurations(criteria: {
    title?: string;
    hasOfficeRestrictions?: boolean;
  }): Promise<FormConfiguration[]> {
    try {
      console.log('FormFilteringService: Searching form configurations with criteria:', criteria);

      const snapshot = await getDocs(collection(db, 'page_configurations'));
      let formConfigs: FormConfiguration[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const title = data.title || 'Untitled Form';

        // Filter by title if specified
        if (criteria.title && !title.toLowerCase().includes(criteria.title.toLowerCase())) {
          return;
        }

        formConfigs.push({
          id: doc.id,
          title: title,
          selectedOffices: data.selectedOffices || data.selected_offices || [],
          fields: data.fields || [],
          lastUpdated: data.lastUpdated || data.last_updated || data.updatedAt
        });
      });

      // Filter by office restrictions if specified
      if (criteria.hasOfficeRestrictions !== undefined) {
        formConfigs = formConfigs.filter(form => {
          const hasRestrictions = form.selectedOffices && form.selectedOffices.length > 0;
          return criteria.hasOfficeRestrictions ? hasRestrictions : !hasRestrictions;
        });
      }

      console.log('FormFilteringService: Found', formConfigs.length, 'forms matching criteria');
      return formConfigs.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    } catch (error) {
      console.error('FormFilteringService: Error searching form configurations:', error);
      return [];
    }
  }

  /**
   * Gets statistics about form access for the current user
   */
  static async getFormAccessStats(): Promise<{
    totalForms: number;
    accessibleForms: number;
    restrictedForms: number;
    unrestrictedForms: number;
    userOfficeName: string | null;
  }> {
    try {
      const userOfficeName = await this.getCurrentUserOfficeName();
      const allForms = await this.fetchFormConfigurations();
      
      const accessibleForms = OfficeService.filterFormsByOfficeAccess(allForms, userOfficeName);
      const unrestrictedForms = allForms.filter(form => !form.selectedOffices || form.selectedOffices.length === 0);
      const restrictedForms = allForms.filter(form => form.selectedOffices && form.selectedOffices.length > 0);

      return {
        totalForms: allForms.length,
        accessibleForms: accessibleForms.length,
        restrictedForms: restrictedForms.length,
        unrestrictedForms: unrestrictedForms.length,
        userOfficeName
      };

    } catch (error) {
      console.error('FormFilteringService: Error getting form access stats:', error);
      return {
        totalForms: 0,
        accessibleForms: 0,
        restrictedForms: 0,
        unrestrictedForms: 0,
        userOfficeName: null
      };
    }
  }
}

export default FormFilteringService;
