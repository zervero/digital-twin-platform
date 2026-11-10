import { describe, expect, it } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { defineComponent, h } from 'vue';

import { sowDeathDefinition } from '@dt/document-schema';

import DocumentListPage from '../components/DocumentListPage.vue';
import { createMemoryDocumentPort } from '../memory-port.js';
import { installDocumentShell } from '../install.js';
import { sowDeathSeed } from '../fixtures/sow-death-seed.js';

describe('DocumentListPage', () => {
  it('renders fixture title and rows', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: defineComponent({ render: () => h('div') }) },
        {
          path: '/documents/sow-death/detail/:docId?',
          component: defineComponent({ render: () => h('div') }),
        },
      ],
    });
    await router.push('/');
    await router.isReady();

    const wrapper = mount(DocumentListPage, {
      props: {
        definition: sowDeathDefinition,
        port: createMemoryDocumentPort(sowDeathSeed),
        basePath: '/documents/sow-death',
      },
      global: {
        plugins: [
          router,
          {
            install(app) {
              installDocumentShell(app);
            },
          },
        ],
      },
    });

    await flushPromises();
    expect(wrapper.get('[data-testid="document-list"]').text()).toContain('母猪死亡');
    expect(wrapper.text()).toContain('202211200003');
  });
});
