import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import type { ApiClient } from '@dt/api-client';
import type { LoginResponse, MeResponse } from '@dt/contracts';

import TopToolbar from '../TopToolbar.vue';
import { ApiClientKey } from '../../stores/api-store.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { adminNavigationGuard } from '../../router/guards.js';

function fakeApiClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    getMe: async () => ({ session: null } satisfies MeResponse),
    login: (async () => ({
      session: {
        user: { id: 'u', displayName: 'u', email: 'u@x', roles: ['viewer'] },
        token: 't',
        expiresAt: '2026-12-31T00:00:00.000Z',
      },
    } satisfies LoginResponse)) as unknown as ApiClient['login'],
    logout: async () => undefined,
    setAuthToken: () => undefined,
    getHealth: async () => ({ ok: true }),
    getDevices: async () => [],
    getScene: async () => ({ id: 'x', tenantId: 'acme-corp', name: 'x', nodes: [] }),
    sendCommand: async () => ({ accepted: true as const, commandId: 'c' }),
    ...overrides,
  } as unknown as ApiClient;
}

const StubPage = defineComponent({
  name: 'StubPage',
  setup: () => () => h('div', 'stub'),
});

async function mountToolbar(opts: {
  roles?: string[];
  tenantId?: string;
  authenticated?: boolean;
  initialPath?: string;
} = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', redirect: '/ops' },
      { path: '/ops', component: StubPage },
      {
        path: '/admin',
        meta: { requiresAdmin: true },
        component: StubPage,
        children: [
          { path: '', redirect: '/admin/marketplace' },
          { path: 'marketplace', component: StubPage },
          { path: 'users', component: StubPage },
        ],
      },
    ],
  });
  router.beforeEach(adminNavigationGuard);

  const client = fakeApiClient();
  const wrapper = mount(TopToolbar, {
    global: {
      plugins: [pinia, router],
      provide: { [ApiClientKey as symbol]: client },
    },
  });

  // Auth must be hydrated before navigating to `/admin/*` so the
  // navigation guard does not bounce the initial path to `/ops`.
  if (opts.authenticated !== false && (opts.roles || opts.tenantId !== undefined)) {
    const auth = useAuthStore();
    auth.state = {
      kind: 'authenticated',
      session: {
        user: {
          id: 'u',
          displayName: 'u',
          email: 'u@x',
          roles: (opts.roles ?? ['viewer']) as (
            | 'viewer'
            | 'operator'
            | 'admin'
          )[],
        },
        token: 't',
        expiresAt: '2026-12-31T00:00:00.000Z',
        tenantId: opts.tenantId ?? 'acme-corp',
      },
    };
  }

  await router.push(opts.initialPath ?? '/ops');
  await router.isReady();
  await flushPromises();
  await nextTick();
  return { wrapper, router, pinia };
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('TopToolbar product chrome', () => {
  it('renders brand, version, and factory label from tenant context', async () => {
    const { wrapper } = await mountToolbar({
      authenticated: true,
      roles: ['viewer'],
      tenantId: 'acme-corp',
    });

    expect(wrapper.text()).toContain('Digital Twin');
    expect(wrapper.text()).toContain('4.3.0');
    expect(wrapper.text()).toContain('acme-corp');
  });

  it('places locale control immediately before the user control', async () => {
    const { wrapper } = await mountToolbar({ roles: ['viewer'] });

    const right = wrapper.find('.toolbar-right');
    const children = right.element.children;
    const localeIdx = [...children].findIndex((el) =>
      el.classList.contains('locale'),
    );
    const loginIdx = [...children].findIndex((el) =>
      el.classList.contains('auth-chrome'),
    );

    expect(localeIdx).toBeGreaterThanOrEqual(0);
    expect(loginIdx).toBe(localeIdx + 1);
  });

  it('orders right-cluster stubs before locale and user', async () => {
    const { wrapper } = await mountToolbar({ roles: ['viewer'] });

    const right = wrapper.find('.toolbar-right');
    const testIds = [...right.element.querySelectorAll('[data-testid]')].map(
      (el) => el.getAttribute('data-testid'),
    );

    expect(testIds).toEqual([
      'toolbar-search',
      'toolbar-notifications',
      'toolbar-help',
      'toolbar-locale',
      'toolbar-locale',
      'open-appearance',
      'auth-user',
      'auth-logout',
    ]);
    expect(right.find('.auth-chrome').exists()).toBe(true);
    expect(right.find('.locale + .auth-chrome').exists()).toBe(true);
  });

  it('hides the mode switch entirely for non-admin roles', async () => {
    const { wrapper } = await mountToolbar({ roles: ['operator'] });

    expect(wrapper.find('.toolbar-center').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Ops');
    expect(wrapper.text()).not.toContain('Admin');
  });

  it('hides the mode switch for viewers as well', async () => {
    const { wrapper } = await mountToolbar({ roles: ['viewer'] });

    expect(wrapper.find('.toolbar-center').exists()).toBe(false);
  });

  it('shows the ops/admin mode switch for admin roles', async () => {
    const { wrapper } = await mountToolbar({ roles: ['admin'] });

    const center = wrapper.find('.toolbar-center');
    expect(center.exists()).toBe(true);
    expect(center.text()).toContain('Ops');
    expect(center.text()).toContain('Admin');
  });

  it('navigates to /ops when selecting ops mode', async () => {
    const { wrapper, router } = await mountToolbar({
      roles: ['admin'],
      initialPath: '/admin/marketplace',
    });

    const buttons = wrapper.find('.toolbar-center').findAll('button');
    const opsBtn = buttons.find((b) => b.text() === 'Ops');
    expect(opsBtn).toBeTruthy();
    await opsBtn!.trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/ops');
  });

  it('navigates to last admin path when selecting admin mode', async () => {
    const { wrapper, router } = await mountToolbar({
      roles: ['admin'],
      initialPath: '/admin/users',
    });

    // Leave admin so mode is ops, then switch back.
    await router.push('/ops');
    await flushPromises();

    const buttons = wrapper.find('.toolbar-center').findAll('button');
    const adminBtn = buttons.find((b) => b.text() === 'Admin');
    expect(adminBtn).toBeTruthy();
    await adminBtn!.trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/admin/users');
  });

  it('falls back to /admin/marketplace when no last admin path exists', async () => {
    const { wrapper, router } = await mountToolbar({
      roles: ['admin'],
      initialPath: '/ops',
    });

    const buttons = wrapper.find('.toolbar-center').findAll('button');
    const adminBtn = buttons.find((b) => b.text() === 'Admin');
    await adminBtn!.trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/admin/marketplace');
  });
});
