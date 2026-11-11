export type { DocumentDataPort } from './ports.js';
export { createMemoryDocumentPort } from './memory-port.js';
export {
  getRegisteredDocument,
  listRegisteredDocuments,
  registerDocument,
  resetDocumentRegistry,
  type RegisteredDocument,
} from './composables/useDocumentRegistry.js';
export {
  listDocumentNavItems,
  matchDocumentNavId,
  resolveDocumentTitle,
  type DocumentNavItem,
} from './nav.js';
export { installDocumentShell } from './install.js';

export { default as DocumentListPage } from './components/DocumentListPage.vue';
export { default as DocumentDetailPage } from './components/DocumentDetailPage.vue';
export { default as DocumentWorkbenchHost } from './components/DocumentWorkbenchHost.vue';
