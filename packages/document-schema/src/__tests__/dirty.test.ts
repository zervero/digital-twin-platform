import { describe, expect, it } from 'vitest';

import {
  cloneDocument,
  isDocumentDirty,
  snapshotDocument,
} from '../dirty.js';
import type { DocumentRecord } from '../types.js';

const base: DocumentRecord = {
  id: '1',
  deathDate: '2022-11-20',
  remark: '',
  lines: [{ earTag: 'L20224', weightKg: 0 }],
};

describe('document dirty helpers', () => {
  it('treats identical snapshots as clean', () => {
    const snap = snapshotDocument(base);
    expect(isDocumentDirty(snap, cloneDocument(base))).toBe(false);
  });

  it('detects header edits', () => {
    const snap = snapshotDocument(base);
    const next = cloneDocument(base);
    (next as { remark?: string }).remark = 'note';
    expect(isDocumentDirty(snap, next)).toBe(true);
  });

  it('detects line edits regardless of key insertion order', () => {
    const snap = snapshotDocument(base);
    const next: DocumentRecord = {
      remark: '',
      deathDate: '2022-11-20',
      id: '1',
      lines: [{ weightKg: 10, earTag: 'L20224' }],
    };
    expect(isDocumentDirty(snap, next)).toBe(true);
  });
});
