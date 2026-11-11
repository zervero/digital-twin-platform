import {
  createMemoryDocumentPort,
  registerDocument,
} from '@dt/document-shell/runtime';

import { sowBreedingDefinition } from './definition.js';
import { sowBreedingSeed } from './seed.js';

/** Registers the sow-breeding demo definition + memory port. */
export function registerSowBreeding(): void {
  registerDocument({
    definition: sowBreedingDefinition,
    port: createMemoryDocumentPort(sowBreedingSeed),
  });
}
