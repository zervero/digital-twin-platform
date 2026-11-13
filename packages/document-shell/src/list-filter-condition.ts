import type { ListColumnFilterEditor } from '@dt/document-schema';

export type ListFilterOp =
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'eq'
  | 'ne'
  | 'lt'
  | 'gt'
  | 'lte'
  | 'gte'
  | 'between';

export interface ListFilterCondition {
  op: ListFilterOp;
  value: string;
  value2?: string;
}

const TEXT_OPS: ListFilterOp[] = [
  'contains',
  'notContains',
  'startsWith',
  'endsWith',
  'eq',
  'ne',
];

const NUMBER_OPS: ListFilterOp[] = ['eq', 'ne', 'lt', 'gt', 'lte', 'gte'];

/** Editors that expose the operator dropdown in the grid filter row. */
export function showsFilterOperatorMenu(
  editor: ListColumnFilterEditor,
): boolean {
  return editor === 'text' || editor === 'number';
}

export function operatorsForMenu(
  editor: ListColumnFilterEditor,
): ListFilterOp[] {
  if (editor === 'text') return TEXT_OPS;
  if (editor === 'number') return NUMBER_OPS;
  return [];
}

function allowedOpsForEditor(editor: ListColumnFilterEditor): ListFilterOp[] {
  switch (editor) {
    case 'text':
      return TEXT_OPS;
    case 'number':
      return NUMBER_OPS;
    case 'date':
    case 'select':
      return ['eq'];
    case 'dateRange':
    case 'dateTimeRange':
      return ['between'];
    default:
      return TEXT_OPS;
  }
}

export function defaultFilterCondition(
  editor: ListColumnFilterEditor,
): ListFilterCondition {
  switch (editor) {
    case 'text':
      return { op: 'contains', value: '' };
    case 'number':
    case 'date':
    case 'select':
      return { op: 'eq', value: '' };
    case 'dateRange':
    case 'dateTimeRange':
      return { op: 'between', value: '', value2: '' };
    default:
      return { op: 'contains', value: '' };
  }
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

export function normalizeFilterCondition(
  raw: unknown,
  editor: ListColumnFilterEditor,
): ListFilterCondition {
  const fallback = defaultFilterCondition(editor);
  if (typeof raw === 'string') {
    return { ...fallback, value: raw };
  }
  if (Array.isArray(raw)) {
    return {
      op: 'between',
      value: String(raw[0] ?? ''),
      value2: String(raw[1] ?? ''),
    };
  }
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    const op = record.op;
    const allowed = allowedOpsForEditor(editor);
    const resolvedOp =
      typeof op === 'string' && (allowed as string[]).includes(op)
        ? (op as ListFilterOp)
        : fallback.op;
    return {
      op: resolvedOp,
      value: record.value != null ? String(record.value) : '',
      value2:
        record.value2 != null
          ? String(record.value2)
          : resolvedOp === 'between'
            ? ''
            : undefined,
    };
  }
  return { ...fallback };
}

export function isFilterConditionEmpty(
  condition: ListFilterCondition,
): boolean {
  if (condition.op === 'between') {
    return isBlank(condition.value) && isBlank(condition.value2);
  }
  return isBlank(condition.value);
}

export function isDateOnlyEditor(editor: ListColumnFilterEditor): boolean {
  return editor === 'date' || editor === 'dateRange';
}
