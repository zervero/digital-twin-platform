import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router';
import { defineComponent, h } from 'vue';

import { routes } from '../routes.js';

const Stub = defineComponent({
  name: 'RouteStub',
  setup: () => () => h('div', 'stub'),
});

describe('settings appearance route', () => {
  it('registers /settings/appearance outside requiresAdmin', () => {
    const settings = routes.find((r) => r.path === '/settings/appearance');
    expect(settings).toBeDefined();
    expect(settings?.meta?.requiresAdmin).toBeUndefined();
    expect(settings?.name).toBe('settings-appearance');
  });

  it('redirects /admin/appearance to settings-appearance', async () => {
    const stubbed: RouteRecordRaw[] = routes.map((r) => {
      if (r.path === '/admin' && 'children' in r && r.children) {
        return {
          ...r,
          component: Stub,
          children: r.children.map((c) => ({
            ...c,
            ...('component' in c && c.component ? { component: Stub } : {}),
          })),
        } as RouteRecordRaw;
      }
      if (r.path === '/settings/appearance') {
        return { ...r, component: Stub } as RouteRecordRaw;
      }
      if (r.path === '/ops') {
        return { ...r, component: Stub } as RouteRecordRaw;
      }
      return r;
    });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: stubbed,
    });
    await router.push('/admin/appearance');
    await router.isReady();
    expect(router.currentRoute.value.name).toBe('settings-appearance');
    expect(router.currentRoute.value.path).toBe('/settings/appearance');
  });
});
