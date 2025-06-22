import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'dropdown' | 'radio' | 'button' | 'checkbox' | 'number' | 'date' | 'file' | 'section' | 'switch' | 'checkbox-group' | 'calculated';
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number | boolean | string[];
  // For calculated fields
  calculationType?: 'sum' | 'subtract' | 'multiply' | 'divide' | 'average' | 'percentage' | 'custom';
  sourceFields?: string[];
  customFormula?: string;
  decimalPlaces?: number;
  prefix?: string;
  suffix?: string;
}

export interface FormConfig {
  id: string;
  title?: string;
  fields: FormField[];
}

export class FormConfigService {
  private static cache = new Map<string, FormConfig>();
  private static fieldMappingCache = new Map<string, Map<string, string>>();

  /**
   * Fetches form configuration from Firebase
   */
  static async getFormConfig(formIdentifier: string): Promise<FormConfig | null> {
    try {
      // Check cache first
      if (this.cache.has(formIdentifier)) {
        return this.cache.get(formIdentifier)!;
      }

      console.log(`🔍 FormConfigService: Fetching config for ${formIdentifier}`);
      
      // Try different possible document paths
      const possiblePaths = [
        `pages/${formIdentifier}`,
        `formConfigs/${formIdentifier}`,
        `forms/${formIdentifier}`
      ];

      for (const path of possiblePaths) {
        try {
          const docRef = doc(db, path);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data() as FormConfig;
            if (data && data.fields) {
              console.log(`✅ FormConfigService: Found config at ${path}`, data);
              this.cache.set(formIdentifier, data);
              return data;
            }
          }
        } catch (err) {
          console.log(`❌ FormConfigService: Failed to fetch from ${path}:`, err);
        }
      }

      console.log(`⚠️ FormConfigService: No config found for ${formIdentifier}`);
      return null;

    } catch (error) {
      console.error('FormConfigService: Error fetching form config:', error);
      return null;
    }
  }

  /**
   * Gets field ID to label mapping for a form
   */
  static async getFieldMapping(formIdentifier: string): Promise<Map<string, string>> {
    try {
      // Check cache first
      if (this.fieldMappingCache.has(formIdentifier)) {
        return this.fieldMappingCache.get(formIdentifier)!;
      }

      const formConfig = await this.getFormConfig(formIdentifier);
      const mapping = new Map<string, string>();

      if (formConfig && formConfig.fields) {
        formConfig.fields.forEach(field => {
          if (field.type !== 'section' && field.type !== 'button') {
            mapping.set(field.id, field.label);
          }
        });
      }

      this.fieldMappingCache.set(formIdentifier, mapping);
      console.log(`📋 FormConfigService: Created field mapping for ${formIdentifier}:`, mapping);
      return mapping;

    } catch (error) {
      console.error('FormConfigService: Error creating field mapping:', error);
      return new Map();
    }
  }

  /**
   * Gets all unique field labels across multiple form types
   */
  static async getAllFieldLabels(formIdentifiers: string[]): Promise<Set<string>> {
    const allLabels = new Set<string>();

    for (const formId of formIdentifiers) {
      const mapping = await this.getFieldMapping(formId);
      mapping.forEach(label => allLabels.add(label));
    }

    return allLabels;
  }

  /**
   * Converts submission data from field IDs to readable labels
   */
  static async convertSubmissionData(
    formIdentifier: string, 
    submissionData: Record<string, any>
  ): Promise<Record<string, any>> {
    try {
      const mapping = await this.getFieldMapping(formIdentifier);
      const convertedData: Record<string, any> = {};

      Object.entries(submissionData).forEach(([fieldId, value]) => {
        const label = mapping.get(fieldId) || fieldId;
        convertedData[label] = value;
      });

      return convertedData;

    } catch (error) {
      console.error('FormConfigService: Error converting submission data:', error);
      return submissionData;
    }
  }

  /**
   * Clears the cache
   */
  static clearCache(): void {
    this.cache.clear();
    this.fieldMappingCache.clear();
    console.log('FormConfigService: Cache cleared');
  }
}

export default FormConfigService;
