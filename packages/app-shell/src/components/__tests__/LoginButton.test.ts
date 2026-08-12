import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import type { ApiClient } from '@dt/api-client';
import type { LoginResponse, MeResponse } from '@dt/contracts';

import LoginButton from '../LoginButton.vue';
import { ApiClientKey } from '../../stores/api-store.js';
import { AuthModeKey, BffBaseUrlKey } from '../../composables/useOIDCStart.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { useAppearanceStore } from '../../stores/appearance-store.js';
import { adminNavigationGuard } from '../../router/guards.js';

function fakeApiClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    getMe: async () => ({ session: null } satisfies MeResponse),
    login: (async () => ({
      session: {
        user: { id: 'u', displayName: 'u', email: 'dev@x.test', roles: ['viewer'] },
        token: 't',
        expiresAt: '2026-12-31T00:00:00.000Z',
        tenantId: 'acme-corp',
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

async function mountLogin(
  authMode: 'mock' | 'oidc' = 'mock',
  opts: { roles?: Array<'viewer' | 'operator' | 'admin'>; initialPath?: string } = {},
) {
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
  const wrapper = mount(LoginButton, {
    global: {
      plugins: [pinia, router],
      provide: {
        [ApiClientKey as symbol]: client,
        [AuthModeKey as symbol]: authMode,
        [BffBaseUrlKey as symbol]: 'http://localhost:3001',
      },
    },
    attachTo: document.body,
  });

  if (opts.roles) {
    const auth = useAuthStore();
    auth.state = {
      kind: 'authenticated',
      session: {
        user: {
          id: 'u',
          displayName: 'u',
          email: 'dev@x.test',
          roles: opts.roles,
        },
        token: 't',
        expiresAt: '2026-12-31T00:00:00.000Z',
        tenantId: 'acme-corp',
      },
    };
  }

  await router.push(opts.initialPath ?? '/ops');
  await router.isReady();
  await flushPromises();
  await nextTick();
  return { wrapper, pinia, client, router };
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('LoginButton', () => {
  it('shows appearance for anonymous users and opens login dialog', async () => {
    const { wrapper } = await mountLogin('mock');
    expect(wrapper.find('[data-testid="open-appearance"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="login-mock-open"]').exists()).toBe(true);

    await wrapper.get('[data-testid="login-mock-open"]').trigger('click');
    await nextTick();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="login-mock-form"]')).not.toBeNull();
    wrapper.unmount();
  });

  it('opens appearance dialog while anonymous', async () => {
    const { wrapper, pinia } = await mountLogin('mock');
    setActivePinia(pinia);
    await wrapper.get('[data-testid="open-appearance"]').trigger('click');
    expect(useAppearanceStore().dialogOpen).toBe(true);
    wrapper.unmount();
  });

  it('submits mock login from the dialog and closes it', async () => {
    const { wrapper, pinia } = await mountLogin('mock');
    setActivePinia(pinia);
    await wrapper.get('[data-testid="login-mock-open"]').trigger('click');
    await nextTick();

    const input = document.querySelector<HTMLInputElement>('[data-testid="login-email"]');
    expect(input).not.toBeNull();
    input!.value = 'dev@x.test';
    input!.dispatchEvent(new Event('input', { bubbles: true }));

    const form = document.querySelector<HTMLFormElement>('[data-testid="login-mock-form"]');
    form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();
    await nextTick();

    expect(useAuthStore().isAuthenticated).toBe(true);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    wrapper.unmount();
  });

  it('renders OIDC continue link inside the dialog', async () => {
    const { wrapper } = await mountLogin('oidc');
    await wrapper.get('[data-testid="login-redirect"]').trigger('click');
    await nextTick();
    const link = document.querySelector<HTMLAnchorElement>('[data-testid="login-oidc-continue"]');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toContain('/api/auth/oidc/start');
    wrapper.unmount();
  });

  it('shows ops + logout on hover for non-admin, without admin entry', async () => {
    const { wrapper } = await mountLogin('mock', { roles: ['operator'] });
    await wrapper.get('[data-testid="auth-user-menu"]').trigger('mouseenter');
    await nextTick();

    expect(wrapper.find('[data-testid="auth-menu-ops"]').isVisible()).toBe(true);
    expect(wrapper.find('[data-testid="auth-logout"]').isVisible()).toBe(true);
    expect(wrapper.find('[data-testid="auth-menu-admin"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('shows admin entry for admin roles and navigates to last admin path', async () => {
    const { wrapper, router } = await mountLogin('mock', {
      roles: ['admin'],
      initialPath: '/admin/users',
    });
    await router.push('/ops');
    await flushPromises();

    await wrapper.get('[data-testid="auth-user-menu"]').trigger('mouseenter');
    await nextTick();
    expect(wrapper.find('[data-testid="auth-menu-admin"]').exists()).toBe(true);

    await wrapper.get('[data-testid="auth-menu-admin"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/admin/users');
    wrapper.unmount();
  });

  it('navigates to /ops from the hover menu', async () => {
    const { wrapper, router } = await mountLogin('mock', {
      roles: ['admin'],
      initialPath: '/admin/marketplace',
    });

    await wrapper.get('[data-testid="auth-user-menu"]').trigger('mouseenter');
    await wrapper.get('[data-testid="auth-menu-ops"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/ops');
    wrapper.unmount();
  });

  it('logs out from the hover menu', async () => {
    const { wrapper, pinia } = await mountLogin('mock', { roles: ['viewer'] });
    setActivePinia(pinia);
    const logout = vi.spyOn(useAuthStore(), 'logout').mockResolvedValue();

    await wrapper.get('[data-testid="auth-user-menu"]').trigger('mouseenter');
    await wrapper.get('[data-testid="auth-logout"]').trigger('click');
    await flushPromises();

    expect(logout).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
});
