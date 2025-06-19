import { supabase } from '../config/supabaseClient';
import { doc, getDoc } from 'firebase/firestore';
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

      const userDoc = await getDoc(doc(db, 'employees', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const officeName = userData?.officeName || null;
        
        console.log('FormFilteringService: User office name:', officeName);
        return officeName;
      } else {
        console.log('FormFilteringService: User document not found');
        return null;
      }

    } catch (error) {
      console.error('FormFilteringService: Error getting user office name:', error);
      return null;
    }
  }

  /**
   * Fetches form configurations from Supabase page_configurations table
   */
  static async fetchFormConfigurations(): Promise<FormConfiguration[]> {
    try {
      console.log('FormFilteringService: Fetching form configurations from Supabase...');

      const { data, error } = await supabase
        .from('page_configurations')
        .select('id, title, selected_offices, fields, last_updated')
        .order('title', { ascending: true });

      if (error) {
        console.error('FormFilteringService: Supabase error:', error);
        throw error;
      }

      const formConfigs: FormConfiguration[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        selectedOffices: item.selected_offices || [],
        fields: item.fields || [],
        lastUpdated: item.last_updated
      }));

      console.log('FormFilteringService: Fetched', formConfigs.length, 'form configurations');
      return formConfigs;

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
   * Checks if a specific form is accessible to the current user
   */
  static async canUserAccessForm(formId: string): Promise<boolean> {
    try {
      console.log('FormFilteringService: Checking access for form:', formId);

      // Get user's office name
      const userOfficeName = await this.getCurrentUserOfficeName();
      
      // Get specific form configuration
      const { data, error } = await supabase
        .from('page_configurations')
        .select('selected_offices')
        .eq('id', formId)
        .limit(1);

      if (error) {
        console.error('FormFilteringService: Error fetching form config:', error);
        return false;
      }

      if (!data || data.length === 0) {
        console.log('FormFilteringService: Form not found:', formId);
        return false;
      }

      const formConfig = data[0];
      const selectedOffices = formConfig.selected_offices || [];

      const hasAccess = OfficeService.checkFormAccess(userOfficeName, selectedOffices);
      console.log(`FormFilteringService: User ${hasAccess ? 'CAN' : 'CANNOT'} access form:`, formId);
      
      return hasAccess;

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

      let query = supabase
        .from('page_configurations')
        .select('id, title, selected_offices, fields, last_updated');

      // Add title filter if specified
      if (criteria.title) {
        query = query.ilike('title', `%${criteria.title}%`);
      }

      const { data, error } = await query.order('title', { ascending: true });

      if (error) {
        console.error('FormFilteringService: Search error:', error);
        throw error;
      }

      let formConfigs: FormConfiguration[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        selectedOffices: item.selected_offices || [],
        fields: item.fields || [],
        lastUpdated: item.last_updated
      }));

      // Filter by office restrictions if specified
      if (criteria.hasOfficeRestrictions !== undefined) {
        formConfigs = formConfigs.filter(form => {
          const hasRestrictions = form.selectedOffices && form.selectedOffices.length > 0;
          return criteria.hasOfficeRestrictions ? hasRestrictions : !hasRestrictions;
        });
      }

      console.log('FormFilteringService: Found', formConfigs.length, 'forms matching criteria');
      return formConfigs;

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
