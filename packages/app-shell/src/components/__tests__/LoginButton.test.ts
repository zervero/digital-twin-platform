import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';

import type { ApiClient } from '@dt/api-client';
import type { LoginResponse, MeResponse } from '@dt/contracts';

import LoginButton from '../LoginButton.vue';
import { ApiClientKey } from '../../stores/api-store.js';
import { AuthModeKey, BffBaseUrlKey } from '../../composables/useOIDCStart.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { useAppearanceStore } from '../../stores/appearance-store.js';

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

function mountLogin(authMode: 'mock' | 'oidc' = 'mock') {
  const pinia = createPinia();
  setActivePinia(pinia);
  const client = fakeApiClient();
  const wrapper = mount(LoginButton, {
    global: {
      plugins: [pinia],
      provide: {
        [ApiClientKey as symbol]: client,
        [AuthModeKey as symbol]: authMode,
        [BffBaseUrlKey as symbol]: 'http://localhost:3001',
      },
    },
    attachTo: document.body,
  });
  return { wrapper, pinia, client };
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('LoginButton', () => {
  it('shows appearance for anonymous users and opens login dialog', async () => {
    const { wrapper } = mountLogin('mock');
    expect(wrapper.find('[data-testid="open-appearance"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="login-mock-open"]').exists()).toBe(true);

    await wrapper.get('[data-testid="login-mock-open"]').trigger('click');
    await nextTick();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="login-mock-form"]')).not.toBeNull();
    wrapper.unmount();
  });

  it('opens appearance dialog while anonymous', async () => {
    const { wrapper, pinia } = mountLogin('mock');
    setActivePinia(pinia);
    await wrapper.get('[data-testid="open-appearance"]').trigger('click');
    expect(useAppearanceStore().dialogOpen).toBe(true);
    wrapper.unmount();
  });

  it('submits mock login from the dialog and closes it', async () => {
    const { wrapper, pinia } = mountLogin('mock');
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
    const { wrapper } = mountLogin('oidc');
    await wrapper.get('[data-testid="login-redirect"]').trigger('click');
    await nextTick();
    const link = document.querySelector<HTMLAnchorElement>('[data-testid="login-oidc-continue"]');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toContain('/api/auth/oidc/start');
    wrapper.unmount();
  });
});
