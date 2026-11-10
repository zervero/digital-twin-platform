import {
  sowBreedingDefinition,
  sowDeathDefinition,
} from '@dt/document-schema';

import { registerDocument } from './composables/useDocumentRegistry.js';
import { sowBreedingSeed } from './fixtures/sow-breeding-seed.js';
import { sowDeathSeed } from './fixtures/sow-death-seed.js';
import { createMemoryDocumentPort } from './memory-port.js';

/**
 * Registers demo document definitions + memory ports.
 * Call once during app bootstrap (SPEC 0001 fixtures).
 */
export function registerSowDeathDemo(): void {
  registerDocument({
    definition: sowDeathDefinition,
    port: createMemoryDocumentPort(sowDeathSeed),
  });
}

export function registerSowBreedingDemo(): void {
  registerDocument({
    definition: sowBreedingDefinition,
    port: createMemoryDocumentPort(sowBreedingSeed),
  });
}

/** Register all built-in document demos. */
export function registerDocumentDemos(): void {
  registerSowDeathDemo();
  registerSowBreedingDemo();
}
