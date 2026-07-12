import { db } from '../config/firebase';
import { collection, getDocs, doc, getDoc, query, where, orderBy, limit, startAfter, QuerySnapshot, DocumentData, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { FormConfigService, FormField } from './formConfigService';

// Types for Report Metadata
export interface ReportField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'dropdown' | 'boolean' | 'reference';
  source: 'submission_data' | 'metadata' | 'calculated';
  path?: string;
  options?: string[];
  format?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none';
}

export interface ReportFilterConfig {
  id: string;
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  valueTo?: any;
  logic: 'and' | 'or';
}

export interface ReportColumnConfig {
  fieldId: string;
  width?: number;
  sortable?: boolean;
  hidden?: boolean;
  format?: string;
}

export interface ArithmeticOperation {
  id: string;
  name: string;
  operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'sum' | 'custom';
  fieldId1: string;
  fieldId2?: string;
  resultFieldName: string;
  customFormula?: string;
  description?: string;
}

export interface ReportConfiguration {
  id: string;
  name: string;
  description?: string;
  formIdentifiers: string[];
  fields: ReportField[];
  filters: ReportFilterConfig[];
  columns: ReportColumnConfig[];
  groupBy?: string;
  sortBy?: { fieldId: string; direction: 'asc' | 'desc' }[];
  aggregations?: { fieldId: string; type: 'sum' | 'avg' | 'count' | 'min' | 'max' }[];
  arithmeticOperations?: ArithmeticOperation[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  isPublic?: boolean;
  isTemplate?: boolean;
}

export interface ReportData {
  rows: any[];
  totalCount: number;
  aggregatedData?: any;
  metadata: {
    fields: ReportField[];
    columns: ReportColumnConfig[];
  };
}

// Predefined report templates
export const REPORT_TEMPLATES: Partial<ReportConfiguration>[] = [
  {
    name: 'Submission Summary',
    description: 'Overview of all form submissions with key metrics',
    fields: [
      { id: 'form_identifier', label: 'Form Type', type: 'text', source: 'metadata' },
      { id: 'user_office', label: 'Office', type: 'text', source: 'metadata' },
      { id: 'submitted_at', label: 'Submission Date', type: 'date', source: 'metadata' },
      { id: 'submission_count', label: 'Count', type: 'number', source: 'calculated', aggregation: 'count' }
    ],
    groupBy: 'form_identifier'
  },
  {
    name: 'Office Performance',
    description: 'Analyze submission patterns by office',
    fields: [
      { id: 'user_office', label: 'Office', type: 'text', source: 'metadata' },
      { id: 'form_identifier', label: 'Form Type', type: 'text', source: 'metadata' },
      { id: 'submitted_at', label: 'Date', type: 'date', source: 'metadata' },
      { id: 'total_submissions', label: 'Total Submissions', type: 'number', source: 'calculated', aggregation: 'count' }
    ],
    groupBy: 'user_office'
  },
  {
    name: 'Time Series Analysis',
    description: 'Track submissions over time',
    fields: [
      { id: 'submitted_at', label: 'Date', type: 'date', source: 'metadata', format: 'YYYY-MM-DD' },
      { id: 'form_identifier', label: 'Form', type: 'text', source: 'metadata' },
      { id: 'daily_count', label: 'Daily Count', type: 'number', source: 'calculated', aggregation: 'count' }
    ],
    groupBy: 'submitted_at'
  }
];

class ReportMetadataService {
  private static readonly COLLECTION_NAME = 'report_configurations';
  private static readonly LOCAL_STORAGE_KEY = 'saved_reports';
  private static cache = new Map<string, ReportConfiguration>();
  private static useLocalStorage = false;

  // Get all available fields from form configurations
  static async discoverFields(formIdentifiers: string[]): Promise<ReportField[]> {
    const fields: ReportField[] = [
      // Metadata fields (always available)
      { id: 'id', label: 'Submission ID', type: 'text', source: 'metadata' },
      { id: 'form_identifier', label: 'Form Type', type: 'text', source: 'metadata' },
      { id: 'user_id', label: 'User ID', type: 'text', source: 'metadata' },
      { id: 'employee_id', label: 'Employee ID', type: 'text', source: 'metadata' },
      { id: 'user_office', label: 'User Office', type: 'text', source: 'metadata' },
      { id: 'submitted_at', label: 'Submission Date', type: 'date', source: 'metadata' },
      { id: 'created_at', label: 'Created Date', type: 'date', source: 'metadata' }
    ];

    // Discover fields from form configurations
    for (const formId of formIdentifiers) {
      try {
        const formConfig = await FormConfigService.getFormConfig(formId);
        if (formConfig?.fields) {
          for (const field of formConfig.fields) {
            if (field.type !== 'section' && field.type !== 'button') {
              const existingField = fields.find(f => f.id === field.id);
              if (!existingField) {
                fields.push({
                  id: field.id,
                  label: field.label,
                  type: this.mapFieldType(field.type),
                  source: 'submission_data',
                  path: `submission_data.${field.id}`
                });
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to discover fields for ${formId}:`, error);
      }
    }

    return fields;
  }

  private static mapFieldType(formFieldType: string): ReportField['type'] {
    switch (formFieldType) {
      case 'number':
        return 'number';
      case 'date':
        return 'date';
      case 'dropdown':
      case 'radio':
        return 'dropdown';
      case 'checkbox':
      case 'switch':
        return 'boolean';
      default:
        return 'text';
    }
  }

  // Create a new report configuration
  static async createConfiguration(config: Omit<ReportConfiguration, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportConfiguration> {
    const now = new Date().toISOString();

    // Debug: Log incoming config before processing
    console.log('🔧 ReportMetadataService.createConfiguration - Incoming config:', {
      name: config.name,
      aggregations: config.aggregations,
      aggregationsLength: config.aggregations?.length,
      arithmeticOperations: config.arithmeticOperations,
      arithmeticOperationsLength: config.arithmeticOperations?.length,
      groupBy: config.groupBy
    });

    // Sanitize config for Firebase - Firebase doesn't accept undefined values
    // We must explicitly handle each field to avoid undefined values
    const sanitizedConfig: any = {};

    // Copy all defined values from config
    Object.keys(config).forEach(key => {
      const value = (config as any)[key];
      if (value !== undefined) {
        sanitizedConfig[key] = value;
      }
    });

    // Ensure critical fields exist and are never undefined
    sanitizedConfig.aggregations = sanitizedConfig.aggregations || [];
    sanitizedConfig.arithmeticOperations = sanitizedConfig.arithmeticOperations || [];
    sanitizedConfig.columns = sanitizedConfig.columns || [];
    sanitizedConfig.filters = sanitizedConfig.filters || [];
    sanitizedConfig.formIdentifiers = sanitizedConfig.formIdentifiers || [];
    sanitizedConfig.fields = sanitizedConfig.fields || [];

    // Handle optional fields - convert undefined to null or omit
    if (sanitizedConfig.groupBy === undefined) {
      sanitizedConfig.groupBy = null;
    }
    if (sanitizedConfig.sortBy === undefined) {
      sanitizedConfig.sortBy = null;
    }
    if (sanitizedConfig.description === undefined) {
      sanitizedConfig.description = null;
    }

    console.log('🔧 Sanitized config for Firebase:', {
      aggregations: sanitizedConfig.aggregations,
      aggregationsLength: sanitizedConfig.aggregations?.length,
      arithmeticOperations: sanitizedConfig.arithmeticOperations,
      arithmeticOperationsLength: sanitizedConfig.arithmeticOperations?.length,
      groupBy: sanitizedConfig.groupBy,
      hasUndefined: Object.values(sanitizedConfig).some(v => v === undefined)
    });

    const newConfig: ReportConfiguration = {
      ...sanitizedConfig as any,
      id: `report_${Date.now()}`,
      createdAt: now,
      updatedAt: now
    };

    // Debug: Log the newConfig before saving to Firebase
    console.log('🔧 ReportMetadataService.createConfiguration - newConfig to save:', {
      id: newConfig.id,
      name: newConfig.name,
      aggregations: newConfig.aggregations,
      aggregationsLength: newConfig.aggregations?.length,
      arithmeticOperations: newConfig.arithmeticOperations,
      arithmeticOperationsLength: newConfig.arithmeticOperations?.length,
      groupBy: newConfig.groupBy
    });

    try {
      // Try to save to Firebase
      await setDoc(doc(db, this.COLLECTION_NAME, newConfig.id), newConfig);
      this.cache.set(newConfig.id, newConfig);
      console.log('✅ ReportMetadataService.createConfiguration - Saved to Firebase:', newConfig.id);
      return newConfig;
    } catch (error) {
      console.warn('Firebase save failed, using localStorage fallback:', error);
      
      // Fallback to localStorage
      try {
        const existingReports = this.getLocalReports();
        existingReports.push(newConfig);
        localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(existingReports));
        this.cache.set(newConfig.id, newConfig);
        this.useLocalStorage = true;
        console.log('✅ Report saved to localStorage');
        return newConfig;
      } catch (localError) {
        console.error('Failed to save to localStorage:', localError);
        // Return the config even if save fails
        return newConfig;
      }
    }
  }

  // Get reports from localStorage
  private static getLocalReports(): ReportConfiguration[] {
    try {
      const stored = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // Update report configuration
  static async updateConfiguration(id: string, updates: Partial<ReportConfiguration>): Promise<ReportConfiguration | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(docRef, updateData);
      
      // Update cache
      const cached = this.cache.get(id);
      if (cached) {
        const updated = { ...cached, ...updateData };
        this.cache.set(id, updated);
        return updated;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to update report configuration:', error);
      return null;
    }
  }

  // Delete report configuration
  static async deleteConfiguration(id: string): Promise<boolean> {
    // First, always delete from localStorage immediately
    try {
      const localReports = this.getLocalReports();
      const filteredReports = localReports.filter(r => r.id !== id);
      if (filteredReports.length !== localReports.length) {
        localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(filteredReports));
        console.log('✅ Report deleted from localStorage:', id);
      }
    } catch (localError) {
      console.warn('Failed to delete from localStorage:', localError);
    }
    
    // Delete from cache
    this.cache.delete(id);
    
    // Then try to delete from Firebase
    try {
      await deleteDoc(doc(db, this.COLLECTION_NAME, id));
      console.log('✅ Report deleted from Firebase:', id);
      return true;
    } catch (error) {
      console.error('Failed to delete report from Firebase:', error);
      // Still return true if it was deleted from localStorage
      return true;
    }
  }

  // Get report configuration by ID
  static async getConfiguration(id: string): Promise<ReportConfiguration | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    try {
      const docSnap = await getDoc(doc(db, this.COLLECTION_NAME, id));
      if (docSnap.exists()) {
        const config = docSnap.data() as ReportConfiguration;
        this.cache.set(id, config);
        return config;
      }
    } catch (error) {
      console.error('Failed to fetch report configuration:', error);
    }

    return null;
  }

  // Get all report configurations for a user
  static async getUserConfigurations(userId: string): Promise<ReportConfiguration[]> {
    try {
      // Try Firebase first
      let q;
      try {
        // First try with ordering (requires composite index)
        q = query(
          collection(db, this.COLLECTION_NAME),
          where('createdBy', '==', userId),
          orderBy('updatedAt', 'desc')
        );
      } catch (indexError) {
        // Fallback: query without ordering if index doesn't exist
        console.warn('Composite index missing, using fallback query without ordering');
        q = query(
          collection(db, this.COLLECTION_NAME),
          where('createdBy', '==', userId)
        );
      }
      const snapshot = await getDocs(q);
      console.log('📥 ReportMetadataService.getUserConfigurations - Fetched from Firebase:', snapshot.docs.length, 'reports');

      const firebaseReports = snapshot.docs.map(doc => {
        const data = doc.data() as ReportConfiguration;
        // Debug: Log raw data from Firebase
        console.log('📥 Raw Firebase data for report:', doc.id, {
          name: data.name,
          aggregations: data.aggregations,
          arithmeticOperations: data.arithmeticOperations
        });
        // Ensure aggregations and arithmeticOperations always exist as arrays
        return {
          ...data,
          aggregations: data.aggregations || [],
          arithmeticOperations: data.arithmeticOperations || []
        };
      });
      
      // Also check localStorage for any locally saved reports
      const localReports = this.getLocalReports().filter(r => r.createdBy === userId);
      
      // Merge and deduplicate (prefer Firebase versions if same ID exists)
      const reportMap = new Map<string, ReportConfiguration>();
      
      // Add local reports first
      localReports.forEach(report => reportMap.set(report.id, report));
      
      // Add Firebase reports (will overwrite locals if same ID)
      firebaseReports.forEach(report => reportMap.set(report.id, report));
      
      // Convert to array and sort by updatedAt
      return Array.from(reportMap.values()).sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (error) {
      console.warn('Firebase fetch failed, using localStorage fallback:', error);
      
      // Fallback to localStorage only
      try {
        const localReports = this.getLocalReports().filter(r => r.createdBy === userId);
        return localReports.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      } catch (localError) {
        console.error('Failed to fetch from localStorage:', localError);
        return [];
      }
    }
  }

  // Get public templates
  static async getPublicTemplates(): Promise<ReportConfiguration[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('isTemplate', '==', true),
        where('isPublic', '==', true),
        orderBy('name')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as ReportConfiguration);
    } catch (error) {
      console.error('Failed to fetch public templates:', error);
      return [];
    }
  }

  // Generate report data based on configuration
  static async generateReport(
    config: ReportConfiguration,
    page: number = 1,
    pageSize: number = 50
  ): Promise<ReportData> {
    // This would integrate with reportsService to fetch actual data
    // For now, returning a structure that can be populated
    return {
      rows: [],
      totalCount: 0,
      metadata: {
        fields: config.fields,
        columns: config.columns
      }
    };
  }

  // Create report configuration from template
  static createFromTemplate(
    template: Partial<ReportConfiguration>,
    overrides: Partial<ReportConfiguration> = {}
  ): Omit<ReportConfiguration, 'id' | 'createdAt' | 'updatedAt'> {
    const now = new Date().toISOString();
    return {
      name: template.name || 'Untitled Report',
      description: template.description,
      formIdentifiers: template.formIdentifiers || [],
      fields: template.fields || [],
      filters: template.filters || [],
      columns: template.columns || [],
      groupBy: template.groupBy,
      sortBy: template.sortBy,
      aggregations: template.aggregations,
      isPublic: false,
      isTemplate: false,
      ...overrides
    } as any;
  }
}

export default ReportMetadataService;
