import { describe, expect, it } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { defineComponent, h } from 'vue';

import DocumentListPage from '../components/DocumentListPage.vue';
import { createMemoryDocumentPort } from '../memory-port.js';
import { installDocumentShell } from '../install.js';
import { sampleDefinition, sampleSeed } from './helpers/sample.js';

describe('DocumentListPage', () => {
  it('renders fixture title and rows', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: defineComponent({ render: () => h('div') }) },
        {
          path: '/documents/sample-doc/detail/:docId?',
          component: defineComponent({ render: () => h('div') }),
        },
      ],
    });
    await router.push('/');
    await router.isReady();

    const wrapper = mount(DocumentListPage, {
      props: {
        definition: sampleDefinition,
        port: createMemoryDocumentPort(sampleSeed),
        basePath: '/documents/sample-doc',
      },
      global: {
        plugins: [
          createPinia(),
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
    expect(wrapper.get('[data-testid="document-list"]').text()).toContain('Sample');
    expect(wrapper.text()).toContain('S-001');
  });
});
