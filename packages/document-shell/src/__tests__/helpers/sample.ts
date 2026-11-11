import type { DocumentDefinition, DocumentRecord } from '@dt/document-schema';
import { assertDocumentDefinition } from '@dt/document-schema';

/** Minimal definition for shell unit tests (not a product module). */
export const sampleDefinition: DocumentDefinition = {
  id: 'sample-doc',
  title: 'Sample',
  idField: 'id',
  docNoField: 'docNo',
  status: { supportsAudit: true },
  list: {
    filters: [{ key: 'name', label: 'Name', editor: 'text' }],
    columns: [
      { key: 'docNo', label: 'No', minWidth: 100 },
      { key: 'name', label: 'Name', minWidth: 100, link: true },
    ],
    rowActions: [
      { id: 'edit', label: 'Edit' },
      { id: 'delete', label: 'Delete', requiresExisting: true },
    ],
    toolbar: [
      { id: 'create', label: 'Create' },
      { id: 'delete', label: 'Delete', requiresSelection: true },
    ],
    defaultPageSize: 20,
  },
  detail: {
    header: [
      { key: 'name', label: 'Name', editor: 'text', required: true },
      { key: 'docNo', label: 'No', editor: 'readonly' },
    ],
    lines: {
      minRows: 1,
      columns: [
        { key: 'item', label: 'Item', editor: 'text', required: true, minWidth: 100 },
      ],
    },
    footer: { remark: true },
    toolbar: [
      { id: 'save', label: 'Save', requiresDirty: true },
      { id: 'discard', label: 'Discard', requiresDirty: true },
      { id: 'addLine', label: 'Add' },
      { id: 'removeLine', label: 'Remove' },
    ],
  },
};

assertDocumentDefinition(sampleDefinition);

export const sampleSeed: DocumentRecord[] = [
  {
    id: 'sample-1',
    docNo: 'S-001',
    name: 'Alpha',
    audited: false,
    remark: '',
    lines: [{ item: 'line-a' }],
  },
];
