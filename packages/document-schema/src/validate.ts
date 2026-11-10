import type {
  DocumentDefinition,
  DocumentRecord,
  FieldDefinition,
  ValidationIssue,
} from './types.js';

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
        message: `${field.label}为必填项`,
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
      message: `至少填写 ${minRows} 行明细`,
    });
  }

  filledLines.forEach((line, index) => {
    for (const col of def.detail.lines.columns) {
      if (!col.required) continue;
      if (isBlank(line[col.key])) {
        issues.push({
          path: `lines.${index}.${col.key}`,
          message: `第 ${index + 1} 行：${col.label}为必填项`,
        });
      }
    }
  });

  return issues;
}
