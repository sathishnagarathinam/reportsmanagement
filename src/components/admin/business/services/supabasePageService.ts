import { supabase } from '../../../../config/supabaseClient';
import { PageConfig } from '../types/PageBuilderTypes';

export interface SupabasePageConfig {
  id: string;
  title: string;
  last_updated: string;

  // Single selections (backward compatibility)
  selected_region?: string;
  selected_division?: string;
  selected_office?: string;
  selected_frequency?: string;

  // Multiple selections (new format)
  selected_regions: string[];
  selected_divisions: string[];
  selected_offices: string[];

  // Form fields
  fields: any[];

  // Metadata
  created_at?: string;
  updated_at?: string;
}

class SupabasePageService {
  
  /**
   * Save page configuration to Supabase
   */
  async savePageConfig(pageConfig: PageConfig): Promise<void> {
    try {
      // Saving page config to Supabase

      const supabaseConfig: SupabasePageConfig = {
        id: pageConfig.id,
        title: pageConfig.title,
        last_updated: pageConfig.lastUpdated,

        // Single selections (for backward compatibility)
        selected_region: pageConfig.selectedRegion,
        selected_division: pageConfig.selectedDivision,
        selected_office: pageConfig.selectedOffice,
        selected_frequency: pageConfig.selectedFrequency,

        // Multiple selections (new format)
        selected_regions: pageConfig.selectedRegions || [],
        selected_divisions: pageConfig.selectedDivisions || [],
        selected_offices: pageConfig.selectedOffices || [],

        // Form fields
        fields: pageConfig.fields || [],
      };

      const { error } = await supabase
        .from('page_configurations')
        .upsert(supabaseConfig, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Supabase save error:', error);
        throw error;
      }

      // Page config saved to Supabase successfully
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      throw error;
    }
  }

  /**
   * Load page configuration from Supabase
   */
  async loadPageConfig(pageId: string): Promise<PageConfig | null> {
    try {
      // Loading page config from Supabase

      const { data, error } = await supabase
        .from('page_configurations')
        .select('*')
        .eq('id', pageId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Supabase load error:', error);
        throw error;
      }

      if (!data) {
        return null;
      }

      // Convert Supabase format back to PageConfig format
      const pageConfig: PageConfig = {
        id: data.id,
        title: data.title,
        lastUpdated: data.last_updated,

        // Single selections (backward compatibility)
        selectedRegion: data.selected_region,
        selectedDivision: data.selected_division,
        selectedOffice: data.selected_office,
        selectedFrequency: data.selected_frequency,

        // Multiple selections (new format)
        selectedRegions: data.selected_regions || [],
        selectedDivisions: data.selected_divisions || [],
        selectedOffices: data.selected_offices || [],

        // Form fields
        fields: data.fields || [],
      };

      return pageConfig;
    } catch (error) {
      console.error('Error loading from Supabase:', error);
      throw error;
    }
  }

  /**
   * Delete page configuration from Supabase
   */
  async deletePageConfig(pageId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting page config from Supabase:', pageId);

      const { error } = await supabase
        .from('page_configurations')
        .delete()
        .eq('id', pageId);

      if (error) {
        console.error('❌ Supabase delete error:', error);
        throw error;
      }

      console.log('✅ Page config deleted from Supabase successfully');
    } catch (error) {
      console.error('❌ Error deleting from Supabase:', error);
      throw error;
    }
  }

  /**
   * Get all page configurations from Supabase
   */
  async getAllPageConfigs(): Promise<PageConfig[]> {
    try {
      console.log('📋 Loading all page configs from Supabase');

      const { data, error } = await supabase
        .from('page_configurations')
        .select('*')
        .order('last_updated', { ascending: false });

      if (error) {
        console.error('❌ Supabase load all error:', error);
        throw error;
      }

      const pageConfigs: PageConfig[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        lastUpdated: item.last_updated,

        // Single selections (backward compatibility)
        selectedRegion: item.selected_region,
        selectedDivision: item.selected_division,
        selectedOffice: item.selected_office,
        selectedFrequency: item.selected_frequency,

        // Multiple selections (new format)
        selectedRegions: item.selected_regions || [],
        selectedDivisions: item.selected_divisions || [],
        selectedOffices: item.selected_offices || [],

        // Form fields
        fields: item.fields || [],
      }));

      console.log('✅ All page configs loaded from Supabase:', pageConfigs.length);
      return pageConfigs;
    } catch (error) {
      console.error('❌ Error loading all from Supabase:', error);
      throw error;
    }
  }

  /**
   * Search page configurations by criteria
   */
  async searchPageConfigs(criteria: {
    region?: string;
    frequency?: string;
    title?: string;
  }): Promise<PageConfig[]> {
    try {
      console.log('🔍 Searching page configs in Supabase:', criteria);

      let query = supabase
        .from('page_configurations')
        .select('*');

      // Add filters based on criteria
      if (criteria.region) {
        query = query.or(`selected_region.eq.${criteria.region},selected_regions.cs.["${criteria.region}"]`);
      }

      if (criteria.frequency) {
        query = query.eq('selected_frequency', criteria.frequency);
      }

      if (criteria.title) {
        query = query.ilike('title', `%${criteria.title}%`);
      }

      const { data, error } = await query.order('last_updated', { ascending: false });

      if (error) {
        console.error('❌ Supabase search error:', error);
        throw error;
      }

      const pageConfigs: PageConfig[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        lastUpdated: item.last_updated,
        selectedRegion: item.selected_region,
        selectedDivision: item.selected_division,
        selectedOffice: item.selected_office,
        selectedFrequency: item.selected_frequency,
        selectedRegions: item.selected_regions || [],
        selectedDivisions: item.selected_divisions || [],
        selectedOffices: item.selected_offices || [],
        fields: item.fields || [],
      }));

      console.log('✅ Search completed, found:', pageConfigs.length, 'configs');
      return pageConfigs;
    } catch (error) {
      console.error('❌ Error searching Supabase:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const supabasePageService = new SupabasePageService();
