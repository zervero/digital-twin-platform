import type { DocumentDefinition } from '@dt/document-schema';
import { assertDocumentDefinition } from '@dt/document-schema';

import type { DocumentDataPort } from '../ports.js';

export interface RegisteredDocument {
  readonly definition: DocumentDefinition;
  readonly port: DocumentDataPort;
}

const registry = new Map<string, RegisteredDocument>();

export function registerDocument(entry: RegisteredDocument): void {
  assertDocumentDefinition(entry.definition);
  registry.set(entry.definition.id, entry);
}

export function getRegisteredDocument(typeId: string): RegisteredDocument | undefined {
  return registry.get(typeId);
}

export function listRegisteredDocuments(): RegisteredDocument[] {
  return [...registry.values()];
}

/** Test helper — clears in-memory registry. */
export function resetDocumentRegistry(): void {
  registry.clear();
}
