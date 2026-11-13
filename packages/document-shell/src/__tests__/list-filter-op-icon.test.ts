import { describe, expect, it } from 'vitest';

import { listFilterOpIcon } from '../list-filter-op-icon.js';

describe('listFilterOpIcon', () => {
  it('maps text operators to abc icons', () => {
    expect(listFilterOpIcon('contains')).toEqual({
      kind: 'abc',
      variant: 'contains',
    });
    expect(listFilterOpIcon('startsWith')).toEqual({
      kind: 'abc',
      variant: 'startsWith',
    });
  });

  it('maps number comparison glyphs', () => {
    expect(listFilterOpIcon('lt')).toEqual({ kind: 'glyph', char: '<' });
    expect(listFilterOpIcon('gte')).toEqual({ kind: 'glyph', char: '≥' });
  });
});
