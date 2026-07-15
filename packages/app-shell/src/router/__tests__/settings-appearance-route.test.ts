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

  it('keeps /admin/appearance as an admin child route (dialog opener)', () => {
    const admin = routes.find((r) => r.path === '/admin');
    expect(admin && 'children' in admin).toBe(true);
    const child = admin && 'children' in admin
      ? admin.children?.find((c) => c.name === 'admin-appearance')
      : undefined;
    expect(child).toBeDefined();
    expect(child?.path).toBe('appearance');
  });

  it('can navigate to /admin/appearance under the admin layout', async () => {
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
    expect(router.currentRoute.value.name).toBe('admin-appearance');
    expect(router.currentRoute.value.path).toBe('/admin/appearance');
  });
});
