import { describe, expect, it } from 'vitest';

import { compareListCellValues, resolveListColumnSortKind } from '../list-sort.js';
import { sampleDefinition } from './helpers/sample.js';

describe('list-sort', () => {
  it('resolves sort kind from header editor and column key', () => {
    expect(resolveListColumnSortKind('name', sampleDefinition)).toBe('string');
    expect(resolveListColumnSortKind('deathDate', {
      ...sampleDefinition,
      list: {
        ...sampleDefinition.list,
        columns: [{ key: 'deathDate', label: 'Death date' }],
      },
      detail: {
        ...sampleDefinition.detail,
        header: [
          { key: 'deathDate', label: 'Death date', editor: 'date' },
        ],
      },
    })).toBe('date');
  });

  it('compares numbers, dates, and strings', () => {
    expect(compareListCellValues(2, 10, 'number')).toBeLessThan(0);
    expect(
      compareListCellValues('2024-01-02', '2024-01-10', 'date'),
    ).toBeLessThan(0);
    expect(compareListCellValues('b', 'a', 'string')).toBeGreaterThan(0);
    expect(compareListCellValues(null, 'a', 'string')).toBeGreaterThan(0);
  });
});
