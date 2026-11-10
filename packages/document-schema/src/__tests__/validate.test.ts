import { describe, expect, it } from 'vitest';

import { sowDeathDefinition } from '../fixtures/sow-death.js';
import {
  assertDocumentDefinition,
  validateDocumentRecord,
} from '../validate.js';
import type { DocumentDefinition, DocumentRecord } from '../types.js';

describe('assertDocumentDefinition', () => {
  it('accepts the sow-death fixture', () => {
    expect(() => assertDocumentDefinition(sowDeathDefinition)).not.toThrow();
  });

  it('rejects missing id', () => {
    const bad = { ...sowDeathDefinition, id: '' } as DocumentDefinition;
    expect(() => assertDocumentDefinition(bad)).toThrow(/id/);
  });
});

describe('validateDocumentRecord', () => {
  it('flags missing required header and line fields', () => {
    const record: DocumentRecord = {
      lines: [{ batch: 'p1', earTag: '', deathType: '', deathReason: '' }],
    };
    const issues = validateDocumentRecord(sowDeathDefinition, record);
    expect(issues.some((i) => i.path === 'header.deathDate')).toBe(true);
    expect(issues.some((i) => i.path.startsWith('lines.0.'))).toBe(true);
  });

  it('passes a complete record', () => {
    const record: DocumentRecord = {
      deathDate: '2022-11-20',
      docNo: '202211200003',
      lines: [
        {
          batch: 'p8001',
          earTag: 'L20224',
          deathType: '死亡',
          deathReason: '疾病',
        },
      ],
    };
    expect(validateDocumentRecord(sowDeathDefinition, record)).toEqual([]);
  });
});
