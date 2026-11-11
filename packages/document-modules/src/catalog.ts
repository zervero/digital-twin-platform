/**
 * Built-in document module catalog.
 *
 * Adding a单据: create `src/<type-id>/` (definition + seed + register),
 * then append its registrar here. This file is the only shared hotspot.
 */
import { registerSowBreeding } from './sow-breeding/index.js';
import { registerSowDeath } from './sow-death/index.js';

const DOCUMENT_MODULE_REGISTRARS: readonly (() => void)[] = [
  registerSowDeath,
  registerSowBreeding,
];

/** Registers every catalogued document module once. */
export function registerAllDocumentModules(): void {
  for (const register of DOCUMENT_MODULE_REGISTRARS) {
    register();
  }
}
