import type { ListColumnFilterEditor } from '@dt/document-schema';

import type { ListFilterCondition } from './list-filter-condition.js';
import {
  isDateOnlyEditor,
  isFilterConditionEmpty,
  normalizeFilterCondition,
} from './list-filter-condition.js';

function parseInstant(value: string, dateOnly: boolean): number | null {
  const raw = value.trim();
  if (!raw) return null;
  const normalized = dateOnly && raw.length >= 10 ? raw.slice(0, 10) : raw;
  const instant = Date.parse(
    dateOnly && normalized.length === 10
      ? `${normalized}T00:00:00`
      : normalized,
  );
  return Number.isNaN(instant) ? null : instant;
}

function parseCellInstant(cell: unknown, dateOnly: boolean): number | null {
  return parseInstant(String(cell ?? ''), dateOnly);
}

function matchText(cell: string, condition: ListFilterCondition): boolean {
  const needle = condition.value;
  const c = cell.toLowerCase();
  const n = needle.toLowerCase();
  switch (condition.op) {
    case 'contains':
      return c.includes(n);
    case 'notContains':
      return !c.includes(n);
    case 'startsWith':
      return c.startsWith(n);
    case 'endsWith':
      return c.endsWith(n);
    case 'eq':
      return c === n;
    case 'ne':
      return c !== n;
    default:
      return c.includes(n);
  }
}

function matchNumber(cell: unknown, condition: ListFilterCondition): boolean {
  const cellNum = Number(cell);
  const valueNum = Number(condition.value);
  const hasCell = Number.isFinite(cellNum);
  const hasValue = Number.isFinite(valueNum);
  switch (condition.op) {
    case 'eq':
      return hasCell && hasValue && cellNum === valueNum;
    case 'ne':
      return hasCell && hasValue && cellNum !== valueNum;
    case 'lt':
      return hasCell && hasValue && cellNum < valueNum;
    case 'gt':
      return hasCell && hasValue && cellNum > valueNum;
    case 'lte':
      return hasCell && hasValue && cellNum <= valueNum;
    case 'gte':
      return hasCell && hasValue && cellNum >= valueNum;
    case 'between': {
      const to = Number(condition.value2);
      const from = valueNum;
      if (!hasCell) return false;
      if (Number.isFinite(from) && cellNum < from) return false;
      if (Number.isFinite(to) && cellNum > to) return false;
      return true;
    }
    default:
      return String(cell).includes(condition.value);
  }
}

function matchDate(
  cell: unknown,
  condition: ListFilterCondition,
  dateOnly: boolean,
): boolean {
  const instant = parseCellInstant(cell, dateOnly);
  if (instant === null) return false;
  const valueInstant = parseInstant(condition.value, dateOnly);
  const value2Instant = parseInstant(String(condition.value2 ?? ''), dateOnly);

  switch (condition.op) {
    case 'eq':
      return valueInstant !== null && instant === valueInstant;
    case 'ne':
      return valueInstant !== null && instant !== valueInstant;
    case 'lt':
      return valueInstant !== null && instant < valueInstant;
    case 'gt':
      return valueInstant !== null && instant > valueInstant;
    case 'lte':
      return valueInstant !== null && instant <= valueInstant;
    case 'gte':
      return valueInstant !== null && instant >= valueInstant;
    case 'between': {
      if (valueInstant !== null && instant < valueInstant) return false;
      if (value2Instant !== null) {
        const toInclusive = dateOnly
          ? value2Instant + 86_400_000 - 1
          : value2Instant;
        if (instant > toInclusive) return false;
      }
      return true;
    }
    default:
      return String(cell).includes(condition.value.slice(0, 10));
  }
}

export function matchListFilterCondition(
  cell: unknown,
  raw: unknown,
  editor: ListColumnFilterEditor,
): boolean {
  const condition = normalizeFilterCondition(raw, editor);
  if (isFilterConditionEmpty(condition)) return true;

  if (editor === 'text') {
    return matchText(String(cell ?? ''), condition);
  }
  if (editor === 'number') {
    return matchNumber(cell, condition);
  }
  if (editor === 'select') {
    const cellStr = String(cell ?? '');
    const pick = condition.value;
    if (condition.op === 'ne') return cellStr !== pick;
    return cellStr === pick;
  }
  if (
    editor === 'date' ||
    editor === 'dateRange' ||
    editor === 'dateTimeRange'
  ) {
    return matchDate(cell, condition, isDateOnlyEditor(editor));
  }
  return matchText(String(cell ?? ''), condition);
}
