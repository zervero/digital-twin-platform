import { sowDeathDefinition } from '@dt/document-schema';

import { registerDocument } from './composables/useDocumentRegistry.js';
import { sowDeathSeed } from './fixtures/sow-death-seed.js';
import { createMemoryDocumentPort } from './memory-port.js';

/**
 * Registers the sow-death demo definition + memory port.
 * Call once during app bootstrap (SPEC 0001 fixture).
 */
export function registerSowDeathDemo(): void {
  registerDocument({
    definition: sowDeathDefinition,
    port: createMemoryDocumentPort(sowDeathSeed),
  });
}
