import {
  createMemoryDocumentPort,
  registerDocument,
} from '@dt/document-shell/runtime';

import { sowDeathDefinition } from './definition.js';
import { sowDeathSeed } from './seed.js';

/** Registers the sow-death demo definition + memory port. */
export function registerSowDeath(): void {
  registerDocument({
    definition: sowDeathDefinition,
    port: createMemoryDocumentPort(sowDeathSeed),
  });
}
