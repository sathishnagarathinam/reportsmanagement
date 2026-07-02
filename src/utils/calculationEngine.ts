/**
 * Calculation Engine for Dynamic Forms
 * Handles all types of field calculations including custom formulas
 */

export interface CalculationField {
  id: string;
  calculationType: 'sum' | 'subtract' | 'multiply' | 'divide' | 'average' | 'percentage' | 'custom';
  sourceFields: string[]; // Now contains field labels instead of IDs
  customFormula?: string;
  decimalPlaces?: number;
  prefix?: string;
  suffix?: string;
}

export class CalculationEngine {
  /**
   * Calculate the value for a calculated field
   */
  static calculateValue(
    field: CalculationField,
    formData: Record<string, any>,
    allFields: any[] = []
  ): string {
    try {
      const sourceValues = this.getSourceValues(field.sourceFields, formData, allFields);
      let result: number;

      switch (field.calculationType) {
        case 'sum':
          result = this.sum(sourceValues);
          break;
        case 'subtract':
          result = this.subtract(sourceValues);
          break;
        case 'multiply':
          result = this.multiply(sourceValues);
          break;
        case 'divide':
          result = this.divide(sourceValues);
          break;
        case 'average':
          result = this.average(sourceValues);
          break;
        case 'percentage':
          result = this.percentage(sourceValues);
          break;
        case 'custom':
          result = this.customCalculation(field.customFormula || '', formData, allFields);
          break;
        default:
          result = 0;
      }

      // Handle NaN and Infinity
      if (isNaN(result) || !isFinite(result)) {
        result = 0;
      }

      // Format the result
      return this.formatResult(result, field);
    } catch (error) {
      console.error('Calculation error:', error);
      return this.formatResult(0, field);
    }
  }

  /**
   * Calculate the raw numeric value for a calculated field (without formatting)
   * Used when a calculated field is used as a source for another calculation
   */
  static calculateRawValue(
    field: CalculationField,
    formData: Record<string, any>,
    allFields: any[] = []
  ): number {
    try {
      const sourceValues = this.getSourceValues(field.sourceFields, formData, allFields);
      let result: number;

      switch (field.calculationType) {
        case 'sum':
          result = this.sum(sourceValues);
          break;
        case 'subtract':
          result = this.subtract(sourceValues);
          break;
        case 'multiply':
          result = this.multiply(sourceValues);
          break;
        case 'divide':
          result = this.divide(sourceValues);
          break;
        case 'average':
          result = this.average(sourceValues);
          break;
        case 'percentage':
          result = this.percentage(sourceValues);
          break;
        case 'custom':
          result = this.customCalculation(field.customFormula || '', formData, allFields);
          break;
        default:
          result = 0;
      }

      // Handle NaN and Infinity
      if (isNaN(result) || !isFinite(result)) {
        result = 0;
      }

      return result;
    } catch (error) {
      console.error('Calculation error:', error);
      return 0;
    }
  }

  /**
   * Get numeric values from source fields using field labels
   */
  private static getSourceValues(sourceFields: string[], formData: Record<string, any>, allFields: any[] = []): number[] {
    return sourceFields
      .map(fieldLabel => {
        // Find field by label
        const field = allFields.find(f => f.label === fieldLabel);
        const fieldId = field ? field.id : fieldLabel; // Fallback to label if field not found

        // Check if this is a calculated field - if so, recalculate the raw value
        if (field && field.type === 'calculated') {
          const calcField: CalculationField = {
            id: field.id,
            calculationType: field.calculationType || 'sum',
            sourceFields: field.sourceFields || [],
            customFormula: field.customFormula,
            decimalPlaces: field.decimalPlaces,
            prefix: field.prefix,
            suffix: field.suffix
          };
          return this.calculateRawValue(calcField, formData, allFields);
        }

        const value = formData[fieldId];
        const numValue = parseFloat(value);
        return isNaN(numValue) ? 0 : numValue;
      })
      .filter(value => !isNaN(value));
  }

  /**
   * Sum calculation
   */
  private static sum(values: number[]): number {
    return values.reduce((acc, val) => acc + val, 0);
  }

  /**
   * Subtract calculation (first value minus all others)
   */
  private static subtract(values: number[]): number {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];
    
    return values.slice(1).reduce((acc, val) => acc - val, values[0]);
  }

  /**
   * Multiply calculation
   */
  private static multiply(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((acc, val) => acc * val, 1);
  }

  /**
   * Divide calculation (first value divided by all others)
   */
  private static divide(values: number[]): number {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];
    
    const result = values.slice(1).reduce((acc, val) => {
      if (val === 0) return acc; // Avoid division by zero
      return acc / val;
    }, values[0]);
    
    return result;
  }

  /**
   * Average calculation
   */
  private static average(values: number[]): number {
    if (values.length === 0) return 0;
    return this.sum(values) / values.length;
  }

  /**
   * Percentage calculation (first/second * 100)
   */
  private static percentage(values: number[]): number {
    if (values.length < 2) return 0;
    if (values[1] === 0) return 0; // Avoid division by zero
    
    return (values[0] / values[1]) * 100;
  }

  /**
   * Custom formula calculation using field labels
   */
  private static customCalculation(formula: string, formData: Record<string, any>, allFields: any[] = []): number {
    try {
      // Replace field labels with their values in the formula
      let processedFormula = formula;

      // Find all field references in the formula (enclosed in square brackets [Field Label])
      const fieldMatches = formula.match(/\[([^\]]+)\]/g) || [];

      for (const match of fieldMatches) {
        const fieldLabel = match.slice(1, -1); // Remove brackets
        const field = allFields.find(f => f.label === fieldLabel);
        const fieldId = field ? field.id : fieldLabel;

        let numValue: number;

        // Check if this is a calculated field - if so, recalculate the raw value
        if (field && field.type === 'calculated') {
          const calcField: CalculationField = {
            id: field.id,
            calculationType: field.calculationType || 'sum',
            sourceFields: field.sourceFields || [],
            customFormula: field.customFormula,
            decimalPlaces: field.decimalPlaces,
            prefix: field.prefix,
            suffix: field.suffix
          };
          numValue = this.calculateRawValue(calcField, formData, allFields);
        } else {
          const value = formData[fieldId];
          numValue = parseFloat(value) || 0;
        }

        // Escape regex special chars in the label and replace ALL occurrences
        // (a plain string .replace() only swaps the first match).
        const escapedMatch = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        processedFormula = processedFormula.replace(new RegExp(escapedMatch, 'g'), numValue.toString());
      }

      // Evaluate the formula safely (basic math operations only)
      const result = this.safeEval(processedFormula);
      return isNaN(result) ? 0 : result;
    } catch (error) {
      console.error('Custom calculation error:', error);
      return 0;
    }
  }

  /**
   * Safe evaluation of mathematical expressions
   * Only allows basic math operations for security
   */
  private static safeEval(expression: string): number {
    // Remove any non-mathematical characters for security
    const sanitized = expression.replace(/[^0-9+\-*/.() ]/g, '');
    
    // Check if the expression is safe (only contains numbers and basic operators)
    if (!/^[0-9+\-*/.() ]+$/.test(sanitized)) {
      throw new Error('Invalid expression');
    }

    try {
      // Use Function constructor for safer evaluation than eval()
      return new Function('return ' + sanitized)();
    } catch (error) {
      throw new Error('Expression evaluation failed');
    }
  }

  /**
   * Format the calculation result with prefix, suffix, and decimal places
   */
  private static formatResult(value: number, field: CalculationField): string {
    const decimalPlaces = field.decimalPlaces ?? 2;
    const formattedNumber = value.toFixed(decimalPlaces);
    
    const prefix = field.prefix || '';
    const suffix = field.suffix || '';
    
    return `${prefix}${formattedNumber}${suffix}`;
  }

  /**
   * Get all calculated fields from a form configuration
   */
  static getCalculatedFields(fields: any[]): CalculationField[] {
    return fields
      .filter(field => field.type === 'calculated')
      .map(field => ({
        id: field.id,
        calculationType: field.calculationType || 'sum',
        sourceFields: field.sourceFields || [],
        customFormula: field.customFormula,
        decimalPlaces: field.decimalPlaces,
        prefix: field.prefix,
        suffix: field.suffix
      }));
  }

  /**
   * Update all calculated fields in form data
   * This method recalculates multiple times to handle chains of calculated fields
   * (e.g., Field A depends on Field B which depends on regular fields)
   */
  static updateCalculatedFields(
    fields: any[],
    formData: Record<string, any>
  ): Record<string, any> {
    const calculatedFields = this.getCalculatedFields(fields);
    if (calculatedFields.length === 0) {
      return formData;
    }

    let updatedFormData = { ...formData };

    // Recalculate multiple times to handle dependencies between calculated fields
    // Use calculatedFields.length + 1 iterations to ensure all dependencies are resolved
    const maxIterations = calculatedFields.length + 1;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let hasChanges = false;

      for (const calcField of calculatedFields) {
        const newValue = this.calculateValue(calcField, updatedFormData, fields);
        if (newValue !== updatedFormData[calcField.id]) {
          updatedFormData[calcField.id] = newValue;
          hasChanges = true;
        }
      }

      // If no changes in this iteration, we can stop early
      if (!hasChanges) {
        break;
      }
    }

    return updatedFormData;
  }

  /**
   * Validate calculated field configuration
   */
  static validateCalculatedField(field: CalculationField): string[] {
    const errors: string[] = [];

    // Source fields aren't required for 'custom' formulas — field references
    // are embedded directly in the formula as [Field Label] and extracted there.
    if (field.calculationType !== 'custom' && (!field.sourceFields || field.sourceFields.length === 0)) {
      errors.push('Source fields are required for calculated fields');
    }

    if (field.calculationType === 'custom' && !field.customFormula) {
      errors.push('Custom formula is required for custom calculation type');
    }

    if (field.calculationType === 'percentage' && field.sourceFields.length < 2) {
      errors.push('Percentage calculation requires at least 2 source fields');
    }

    if (field.calculationType === 'divide' && field.sourceFields.length < 2) {
      errors.push('Division calculation requires at least 2 source fields');
    }

    return errors;
  }
}

export default CalculationEngine;