import { beforeEach, describe, expect, it } from 'vitest';

import {
  listRegisteredDocuments,
  resetDocumentRegistry,
} from '@dt/document-shell/runtime';

import { registerAllDocumentModules } from '../catalog.js';

describe('registerAllDocumentModules', () => {
  beforeEach(() => {
    resetDocumentRegistry();
  });

  it('registers every catalogued module', () => {
    registerAllDocumentModules();
    const ids = listRegisteredDocuments().map((d) => d.definition.id).sort();
    expect(ids).toEqual(['sow-breeding', 'sow-death']);
  });
});
