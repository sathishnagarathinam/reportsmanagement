import { ArithmeticOperation, ReportField } from '../services/reportMetadataService';

const OPERATOR_SYMBOLS: Record<ArithmeticOperation['operation'], string> = {
  add: '+',
  subtract: '-',
  multiply: '×',
  divide: '÷',
  sum: '+',
  custom: 'ƒ'
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getFieldByReference = (
  reference: string,
  fields: ReportField[] = []
): ReportField | undefined => {
  const normalizedReference = reference.trim().toLowerCase();
  return fields.find(field =>
    field.id === reference ||
    field.label === reference ||
    field.id.toLowerCase() === normalizedReference ||
    field.label.toLowerCase() === normalizedReference
  );
};

const getNumericValue = (
  item: Record<string, any>,
  reference: string,
  fields: ReportField[] = []
): number => {
  const resolvedField = getFieldByReference(reference, fields);

  const rawValue =
    (resolvedField && (item[resolvedField.id] ?? item.submission_data?.[resolvedField.id])) ??
    item[reference] ??
    item.submission_data?.[reference] ??
    item[resolvedField?.label || ''];

  const numericValue = parseFloat(rawValue);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const safeEvaluate = (expression: string): number => {
  const normalizedExpression = expression.replace(/×/g, '*').replace(/÷/g, '/');
  const sanitizedExpression = normalizedExpression.replace(/[^0-9+\-*/.() ]/g, '');

  if (!sanitizedExpression.trim()) {
    return 0;
  }

  if (!/^[0-9+\-*/.() ]+$/.test(sanitizedExpression)) {
    throw new Error('Invalid expression');
  }

  const result = Function(`"use strict"; return (${sanitizedExpression});`)();
  return typeof result === 'number' && Number.isFinite(result) ? result : 0;
};

const replaceFieldReferencesInExpression = (
  expression: string,
  item: Record<string, any>,
  fields: ReportField[] = []
): string => {
  const candidates = Array.from(new Set(
    fields.flatMap(field => [field.label, field.id]).filter(Boolean)
  )).sort((a, b) => b.length - a.length);

  let resolvedExpression = expression;

  candidates.forEach(candidate => {
    const field = getFieldByReference(candidate, fields);
    if (!field) {
      return;
    }

    const value = getNumericValue(item, candidate, fields).toString();
    resolvedExpression = resolvedExpression.replace(
      new RegExp(escapeRegExp(candidate), 'g'),
      value
    );
  });

  return resolvedExpression;
};

export const evaluateCustomFormula = (
  formula: string,
  item: Record<string, any>,
  fields: ReportField[] = []
): number => {
  try {
    const normalizedFormula = formula.replace(/×/g, '*').replace(/÷/g, '/');

    const processedFormula = normalizedFormula.replace(/\[([^\]]+)\]/g, (_, inner: string) => {
      const trimmedInner = inner.trim();

      if (!trimmedInner) {
        return '0';
      }

      const directFieldMatch = getFieldByReference(trimmedInner, fields);
      if (directFieldMatch) {
        return getNumericValue(item, directFieldMatch.id, fields).toString();
      }

      const nestedExpression = replaceFieldReferencesInExpression(trimmedInner, item, fields);
      return `(${nestedExpression})`;
    });

    const resolvedFormula = replaceFieldReferencesInExpression(processedFormula, item, fields);
    return safeEvaluate(resolvedFormula);
  } catch (error) {
    console.error('Error evaluating custom report formula:', error);
    return 0;
  }
};

export const evaluateArithmeticOperation = (
  item: Record<string, any>,
  operation: ArithmeticOperation,
  fields: ReportField[] = []
): number => {
  switch (operation.operation) {
    case 'add':
      return getNumericValue(item, operation.fieldId1, fields) + getNumericValue(item, operation.fieldId2 || '', fields);
    case 'subtract':
      return getNumericValue(item, operation.fieldId1, fields) - getNumericValue(item, operation.fieldId2 || '', fields);
    case 'multiply':
      return getNumericValue(item, operation.fieldId1, fields) * getNumericValue(item, operation.fieldId2 || '', fields);
    case 'divide': {
      const divisor = getNumericValue(item, operation.fieldId2 || '', fields);
      return divisor !== 0 ? getNumericValue(item, operation.fieldId1, fields) / divisor : 0;
    }
    case 'sum':
      return operation.fieldId1
        .split(',')
        .map(fieldId => fieldId.trim())
        .filter(Boolean)
        .reduce((sum, fieldId) => sum + getNumericValue(item, fieldId, fields), 0);
    case 'custom':
      return evaluateCustomFormula(operation.customFormula || '', item, fields);
    default:
      return 0;
  }
};

const getFieldDisplayName = (reference: string, fields: ReportField[] = []): string => {
  const field = getFieldByReference(reference, fields);
  return field?.label || reference;
};

export const formatArithmeticOperation = (
  operation: ArithmeticOperation,
  fields: ReportField[] = []
): string => {
  if (operation.operation === 'custom') {
    return `${operation.customFormula || ''} = ${operation.resultFieldName}`;
  }

  if (operation.operation === 'sum') {
    const labels = operation.fieldId1
      .split(',')
      .map(fieldId => fieldId.trim())
      .filter(Boolean)
      .map(fieldId => getFieldDisplayName(fieldId, fields));

    return `${labels.join(' + ')} = ${operation.resultFieldName}`;
  }

  return `${getFieldDisplayName(operation.fieldId1, fields)} ${OPERATOR_SYMBOLS[operation.operation]} ${getFieldDisplayName(operation.fieldId2 || '', fields)} = ${operation.resultFieldName}`;
};
