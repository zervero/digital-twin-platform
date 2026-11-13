import type {
  ColumnDefinition,
  DocumentDefinition,
  DocumentRecord,
  FieldDefinition,
  ListColumnFilterEditor,
  ValidationIssue,
} from './types.js';

const LIST_COLUMN_FILTER_EDITORS: readonly ListColumnFilterEditor[] = [
  'text',
  'number',
  'select',
  'date',
  'dateRange',
  'dateTimeRange',
];

function validateListColumns(columns: readonly ColumnDefinition[], docId: string): void {
  for (const col of columns) {
    const lf = col.listFilter;
    if (!lf) continue;
    if (!LIST_COLUMN_FILTER_EDITORS.includes(lf.editor)) {
      throw new Error(
        `DocumentDefinition(${docId}): list column ${col.key} listFilter.editor invalid`,
      );
    }
    if (
      lf.editor === 'select' &&
      !lf.options?.some((opt) => opt.value !== '')
    ) {
      throw new Error(
        `DocumentDefinition(${docId}): column ${col.key} listFilter select needs options`,
      );
    }
  }
}

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

export function assertDocumentDefinition(def: DocumentDefinition): void {
  if (!def.id?.trim()) throw new Error('DocumentDefinition.id is required');
  if (!def.title?.trim()) throw new Error('DocumentDefinition.title is required');
  if (!def.list?.columns?.length) {
    throw new Error(`DocumentDefinition(${def.id}): list.columns required`);
  }
  if (!def.detail?.header?.length) {
    throw new Error(`DocumentDefinition(${def.id}): detail.header required`);
  }
  if (!def.detail?.lines?.columns?.length) {
    throw new Error(`DocumentDefinition(${def.id}): detail.lines.columns required`);
  }
  validateListColumns(def.list.columns, def.id);
}

function validateFields(
  fields: readonly FieldDefinition[],
  data: Record<string, unknown>,
  pathPrefix: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const field of fields) {
    if (!field.required) continue;
    if (isBlank(data[field.key])) {
      issues.push({
        path: `${pathPrefix}${field.key}`,
        code: 'required',
        params: { label: field.label, labelKey: field.labelKey },
        message: `${field.label} is required`,
      });
    }
  }
  return issues;
}

/**
 * Validate a document record against header + line required fields.
 */
export function validateDocumentRecord(
  def: DocumentDefinition,
  record: DocumentRecord,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const headerData = record as Record<string, unknown>;
  issues.push(...validateFields(def.detail.header, headerData, 'header.'));

  const lines = record.lines ?? [];
  const minRows = def.detail.lines.minRows ?? 0;
  const filledLines = lines.filter((line) =>
    def.detail.lines.columns.some((col) => !isBlank(line[col.key])),
  );

  if (minRows > 0 && filledLines.length < minRows) {
    issues.push({
      path: 'lines',
      code: 'minLines',
      params: { min: minRows },
      message: `Enter at least ${minRows} line(s)`,
    });
  }

  filledLines.forEach((line, index) => {
    for (const col of def.detail.lines.columns) {
      if (!col.required) continue;
      if (isBlank(line[col.key])) {
        issues.push({
          path: `lines.${index}.${col.key}`,
          code: 'lineRequired',
          params: {
            label: col.label,
            labelKey: col.labelKey,
            row: index + 1,
          },
          message: `Line ${index + 1}: ${col.label} is required`,
        });
      }
    }
  });

  return issues;
}
