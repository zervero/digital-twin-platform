import { describe, expect, it } from 'vitest';

import {
  assertDocumentDefinition,
  validateDocumentRecord,
} from '../validate.js';
import type { DocumentDefinition, DocumentRecord } from '../types.js';

const miniDefinition: DocumentDefinition = {
  id: 'mini',
  title: 'Mini',
  list: {
    filters: [],
    columns: [{ key: 'docNo', label: 'No' }],
    rowActions: [],
    toolbar: [],
  },
  detail: {
    header: [
      { key: 'deathDate', label: 'Death date', editor: 'date', required: true },
    ],
    lines: {
      columns: [
        { key: 'earTag', label: 'Ear', editor: 'text', required: true },
        { key: 'deathType', label: 'Type', editor: 'text', required: true },
        { key: 'deathReason', label: 'Reason', editor: 'text', required: true },
      ],
    },
    toolbar: [],
  },
};

describe('assertDocumentDefinition', () => {
  it('accepts a minimal valid definition', () => {
    expect(() => assertDocumentDefinition(miniDefinition)).not.toThrow();
  });

  it('rejects missing id', () => {
    const bad = { ...miniDefinition, id: '' } as DocumentDefinition;
    expect(() => assertDocumentDefinition(bad)).toThrow(/id/);
  });
});

describe('validateDocumentRecord', () => {
  it('flags missing required header and line fields', () => {
    const record: DocumentRecord = {
      lines: [{ earTag: 'E1', deathType: '', deathReason: '' }],
    };
    const issues = validateDocumentRecord(miniDefinition, record);
    expect(issues.some((i) => i.path === 'header.deathDate')).toBe(true);
    expect(issues.some((i) => i.path.startsWith('lines.0.'))).toBe(true);
    expect(issues.find((i) => i.path === 'header.deathDate')?.code).toBe(
      'required',
    );
  });

  it('passes a complete record', () => {
    const record: DocumentRecord = {
      deathDate: '2022-11-20',
      docNo: '202211200003',
      lines: [
        {
          earTag: 'L20224',
          deathType: '死亡',
          deathReason: '疾病',
        },
      ],
    };
    expect(validateDocumentRecord(miniDefinition, record)).toEqual([]);
  });
});
