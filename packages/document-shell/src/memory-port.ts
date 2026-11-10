import type {
  DocumentListQuery,
  DocumentRecord,
} from '@dt/document-schema';
import { cloneDocument } from '@dt/document-schema';

import type { DocumentDataPort } from './ports.js';

function matchesFilters(
  row: DocumentRecord,
  filters: Readonly<Record<string, unknown>>,
): boolean {
  for (const [key, raw] of Object.entries(filters)) {
    if (raw === undefined || raw === null || raw === '') continue;
    if (key === 'deathDate' && Array.isArray(raw)) {
      const [from, to] = raw as [string?, string?];
      const value = String(row.deathDate ?? '');
      if (from && value < from) return false;
      if (to && value > to) return false;
      continue;
    }
    const cell = row[key];
    if (cell === undefined || cell === null) {
      // Flattened list rows may carry earTag on the row itself.
      if (String(row[key] ?? '') !== String(raw)) return false;
      continue;
    }
    if (!String(cell).includes(String(raw))) return false;
  }
  return true;
}

/**
 * In-memory port for demos / tests. Seed with list-shaped records that
 * already flatten the first line fields onto the row (ERP list pattern).
 */
export function createMemoryDocumentPort(
  seed: DocumentRecord[],
): DocumentDataPort {
  let rows = seed.map((r) => cloneDocument(r));
  let seq = rows.length + 1;

  return {
    async loadList(query: DocumentListQuery) {
      const filtered = rows.filter((r) => matchesFilters(r, query.filters));
      const start = (query.page - 1) * query.pageSize;
      const items = filtered.slice(start, start + query.pageSize).map(cloneDocument);
      return { items, total: filtered.length };
    },
    async loadOne(id: string) {
      const found = rows.find((r) => r.id === id);
      return found ? cloneDocument(found) : null;
    },
    async create(record: DocumentRecord) {
      const id = `doc-${Date.now()}-${seq++}`;
      const docNo =
        record.docNo && record.docNo !== '-- --'
          ? String(record.docNo)
          : `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(seq).padStart(4, '0')}`;
      const next = cloneDocument({
        ...record,
        id,
        docNo,
        audited: false,
      });
      rows = [next, ...rows];
      return cloneDocument(next);
    },
    async update(id: string, record: DocumentRecord) {
      const idx = rows.findIndex((r) => r.id === id);
      if (idx < 0) throw new Error(`Document not found: ${id}`);
      const next = cloneDocument({ ...record, id });
      rows = [...rows.slice(0, idx), next, ...rows.slice(idx + 1)];
      return cloneDocument(next);
    },
    async remove(ids: string[]) {
      const set = new Set(ids);
      rows = rows.filter((r) => !r.id || !set.has(r.id));
    },
    async audit(ids: string[]) {
      const set = new Set(ids);
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
      rows = rows.map((r) =>
        r.id && set.has(r.id)
          ? cloneDocument({
              ...r,
              audited: true,
              auditedBy: 'admin',
              auditedAt: now,
            })
          : r,
      );
    },
    async listAttachments() {
      return [];
    },
  };
}
