import { beforeEach, describe, expect, it } from 'vitest';

import { createMemoryDocumentPort } from '../memory-port.js';
import {
  listDocumentNavItems,
  matchDocumentNavId,
  resolveDocumentTitle,
} from '../nav.js';
import {
  registerDocument,
  resetDocumentRegistry,
} from '../composables/useDocumentRegistry.js';
import { sampleDefinition, sampleSeed } from './helpers/sample.js';

describe('document nav helpers', () => {
  beforeEach(() => {
    resetDocumentRegistry();
    registerDocument({
      definition: {
        ...sampleDefinition,
        titleLocales: { en: 'Sample EN', 'zh-CN': '样例' },
        navIcon: 'FileText',
        navOrder: 5,
      },
      port: createMemoryDocumentPort(sampleSeed),
    });
  });

  it('resolves localized titles', () => {
    const def = {
      ...sampleDefinition,
      titleLocales: { en: 'Sample EN', 'zh-CN': '样例' },
    };
    expect(resolveDocumentTitle(def, 'en')).toBe('Sample EN');
    expect(resolveDocumentTitle(def, 'zh-CN')).toBe('样例');
  });

  it('lists nav items from the registry', () => {
    const items = listDocumentNavItems('en');
    expect(items).toEqual([
      {
        id: 'sample-doc',
        label: 'Sample EN',
        path: '/documents/sample-doc',
        icon: 'FileText',
      },
    ]);
  });

  it('matches document paths', () => {
    expect(matchDocumentNavId('/documents/sample-doc')).toBe('sample-doc');
    expect(matchDocumentNavId('/documents/sample-doc/detail/1')).toBe('sample-doc');
    expect(matchDocumentNavId('/admin/users')).toBeUndefined();
  });
});
