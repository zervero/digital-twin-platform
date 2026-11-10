import type { DocumentRecord } from './types.js';

/**
 * Stable JSON snapshot for dirty checking (sort object keys shallowly
 * via JSON.stringify insertion order of a normalized clone).
 */
export function snapshotDocument(record: DocumentRecord): string {
  return JSON.stringify(normalize(record));
}

export function isDocumentDirty(
  baselineSnapshot: string,
  current: DocumentRecord,
): boolean {
  return snapshotDocument(current) !== baselineSnapshot;
}

export function cloneDocument(record: DocumentRecord): DocumentRecord {
  return structuredClone(normalize(record)) as DocumentRecord;
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(input).sort()) {
      // Ignore grid runtime keys (e.g. vxe `_X_ROW_*`).
      if (key.startsWith('_')) continue;
      const v = input[key];
      if (v === undefined) continue;
      out[key] = normalize(v);
    }
    return out;
  }
  return value;
}
