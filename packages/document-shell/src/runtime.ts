/**
 * Non-Vue framework surface for document modules / hosts that only need
 * registry + ports (avoids pulling SFC types into plain `tsc` packages).
 */
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
