import type { ListFilterOp } from './list-filter-condition.js';

export type ListFilterAbcVariant =
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith';

/** Lucide PascalCase names accepted by `@dt/ui-kit` `DtIcon`. */
export type ListFilterOpLucideName = 'Equal' | 'EqualNot';

export type ListFilterOpIconSpec =
  | { kind: 'abc'; variant: ListFilterAbcVariant }
  | { kind: 'lucide'; name: ListFilterOpLucideName }
  | { kind: 'glyph'; char: string };

/** Grid filter operator menu + prepend trigger (text/number editors). */
export function listFilterOpIcon(op: ListFilterOp): ListFilterOpIconSpec {
  switch (op) {
    case 'contains':
      return { kind: 'abc', variant: 'contains' };
    case 'notContains':
      return { kind: 'abc', variant: 'notContains' };
    case 'startsWith':
      return { kind: 'abc', variant: 'startsWith' };
    case 'endsWith':
      return { kind: 'abc', variant: 'endsWith' };
    case 'eq':
      return { kind: 'lucide', name: 'Equal' };
    case 'ne':
      return { kind: 'lucide', name: 'EqualNot' };
    case 'lt':
      return { kind: 'glyph', char: '<' };
    case 'gt':
      return { kind: 'glyph', char: '>' };
    case 'lte':
      return { kind: 'glyph', char: '≤' };
    case 'gte':
      return { kind: 'glyph', char: '≥' };
    case 'between':
      return { kind: 'lucide', name: 'Equal' };
    default:
      return { kind: 'abc', variant: 'contains' };
  }
}
