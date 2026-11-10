import type {
  DocumentListQuery,
  DocumentListResult,
  DocumentRecord,
} from '@dt/document-schema';

/**
 * Data ports injected by the host (mock, BFF adapter, etc.).
 */
export interface DocumentDataPort {
  loadList(query: DocumentListQuery): Promise<DocumentListResult>;
  loadOne(id: string): Promise<DocumentRecord | null>;
  create(record: DocumentRecord): Promise<DocumentRecord>;
  update(id: string, record: DocumentRecord): Promise<DocumentRecord>;
  remove(ids: string[]): Promise<void>;
  audit?(ids: string[]): Promise<void>;
  listAttachments?(documentId: string): Promise<readonly { id: string; name: string }[]>;
}
