import { describe, expect, it } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { defineComponent, h } from 'vue';

import DocumentDetailPage from '../components/DocumentDetailPage.vue';
import { createMemoryDocumentPort } from '../memory-port.js';
import { installDocumentShell } from '../install.js';
import { sampleDefinition, sampleSeed } from './helpers/sample.js';

describe('DocumentDetailPage', () => {
  it('enables save after dirty edit in create mode', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: defineComponent({ render: () => h('div') }) },
        {
          path: '/documents/sample-doc/detail/:docId?',
          name: 'document-detail',
          component: defineComponent({ render: () => h('div') }),
        },
        {
          path: '/documents/sample-doc',
          component: defineComponent({ render: () => h('div') }),
        },
      ],
    });
    await router.push('/documents/sample-doc/detail');
    await router.isReady();

    const port = createMemoryDocumentPort(sampleSeed);
    const wrapper = mount(DocumentDetailPage, {
      props: {
        definition: sampleDefinition,
        port,
        basePath: '/documents/sample-doc',
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
    await wrapper.vm.$nextTick();
    expect(wrapper.get('[data-testid="document-detail"]').attributes('data-dirty')).toBe(
      '0',
    );
    expect(
      (wrapper.get('[data-testid="doc-save"]').element as HTMLButtonElement).disabled,
    ).toBe(true);

    const nameInput = wrapper.get('[data-testid="header-name"]');
    await nameInput.setValue('Beta');
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-testid="document-detail"]').attributes('data-dirty')).toBe(
      '1',
    );
    expect(
      (wrapper.get('[data-testid="doc-save"]').element as HTMLButtonElement).disabled,
    ).toBe(false);
  });
});
