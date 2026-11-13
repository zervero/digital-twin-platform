import { describe, expect, it } from 'vitest';

import { matchListFilterCondition } from '../list-filter-match.js';

describe('list-filter-match', () => {
  it('defaults text filter to contains', () => {
    expect(
      matchListFilterCondition('Alpha', { op: 'contains', value: 'lph' }, 'text'),
    ).toBe(true);
    expect(
      matchListFilterCondition(
        'Alpha',
        { op: 'notContains', value: 'lph' },
        'text',
      ),
    ).toBe(false);
    expect(
      matchListFilterCondition(
        'Alpha',
        { op: 'startsWith', value: 'al' },
        'text',
      ),
    ).toBe(true);
  });

  it('matches legacy plain string as contains', () => {
    expect(matchListFilterCondition('Alpha', 'lph', 'text')).toBe(true);
  });

  it('matches date time between on range columns', () => {
    expect(
      matchListFilterCondition(
        '2024-06-01 10:00:00',
        { op: 'between', value: '2024-01-01', value2: '2024-12-31' },
        'dateTimeRange',
      ),
    ).toBe(true);
    expect(
      matchListFilterCondition(
        '2024-06-01 10:00:00',
        { op: 'between', value: '2025-01-01', value2: '' },
        'dateTimeRange',
      ),
    ).toBe(false);
  });

  it('treats empty condition as no filter', () => {
    expect(
      matchListFilterCondition('x', { op: 'contains', value: '' }, 'text'),
    ).toBe(true);
  });
});
