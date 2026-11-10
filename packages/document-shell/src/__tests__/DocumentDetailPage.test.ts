import { beforeEach, describe, expect, it } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { defineComponent, h } from 'vue';

import { sowDeathDefinition } from '@dt/document-schema';

import DocumentDetailPage from '../components/DocumentDetailPage.vue';
import { createMemoryDocumentPort } from '../memory-port.js';
import { installDocumentShell } from '../install.js';
import { sowDeathSeed } from '../fixtures/sow-death-seed.js';

describe('DocumentDetailPage', () => {
  beforeEach(() => {
    // ensure plugins can install per mount
  });

  it('enables save after dirty edit in create mode', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: defineComponent({ render: () => h('div') }) },
        {
          path: '/documents/sow-death/detail/:docId?',
          name: 'document-detail',
          component: defineComponent({ render: () => h('div') }),
        },
        {
          path: '/documents/sow-death',
          component: defineComponent({ render: () => h('div') }),
        },
      ],
    });
    await router.push('/documents/sow-death/detail');
    await router.isReady();

    const port = createMemoryDocumentPort(sowDeathSeed);
    const wrapper = mount(DocumentDetailPage, {
      props: {
        definition: sowDeathDefinition,
        port,
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
    await wrapper.vm.$nextTick();
    // Wait until create baseline is captured (data-dirty=0).
    expect(wrapper.get('[data-testid="document-detail"]').attributes('data-dirty')).toBe(
      '0',
    );
    expect(
      (wrapper.get('[data-testid="doc-save"]').element as HTMLButtonElement).disabled,
    ).toBe(true);

    const dateInput = wrapper.get('[data-testid="header-deathDate"]');
    await dateInput.setValue('2026-01-01');
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
