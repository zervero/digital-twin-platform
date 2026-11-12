import type { DocumentDefinition } from '@dt/document-schema';

export type ListColumnSortKind = 'string' | 'number' | 'date';

const DATE_KEY_PATTERN =
  /(?:^|_)(?:date|time|at|on)(?:$|_)|Date$|Time$|At$/i;

/**
 * Resolve how list values for a column should be compared when sorting.
 */
export function resolveListColumnSortKind(
  columnKey: string,
  definition: DocumentDefinition,
): ListColumnSortKind {
  const listCol = definition.list.columns.find((c) => c.key === columnKey);
  const headerField = definition.detail.header.find((f) => f.key === columnKey);
  const editor = listCol?.editor ?? headerField?.editor;

  if (editor === 'number') return 'number';
  if (editor === 'date' || editor === 'dateRange') return 'date';
  if (DATE_KEY_PATTERN.test(columnKey)) return 'date';
  return 'string';
}

export function compareListCellValues(
  a: unknown,
  b: unknown,
  kind: ListColumnSortKind,
  locale = 'zh-CN',
): number {
  const emptyA = a === undefined || a === null || a === '';
  const emptyB = b === undefined || b === null || b === '';
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;

  if (kind === 'number') {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a).localeCompare(String(b), locale, { numeric: true });
  }

  if (kind === 'date') {
    const ta = Date.parse(String(a));
    const tb = Date.parse(String(b));
    if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta - tb;
    return String(a).localeCompare(String(b), locale);
  }

  return String(a).localeCompare(String(b), locale, {
    numeric: true,
    sensitivity: 'base',
  });
}
