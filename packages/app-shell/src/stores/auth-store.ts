/**
 * useAuthStore — Pinia store for the V2.1 auth contract.
 *
 * State machine:
 *   anonymous -> authenticated  (on login / refresh with valid token)
 *   authenticated -> anonymous (on logout)
 *   authenticated -> expired    (on refresh returning 401)
 *
 * The token is persisted to sessionStorage so a page reload keeps
 * the session alive within the tab. Closing the tab clears it.
 */

import { defineStore } from 'pinia';
import { computed, inject, ref, watch } from 'vue';

import type { ApiClient } from '@dt/api-client';
import {
  type AuthState,
  type Permission,
  permissionsFor,
} from '@dt/contracts';

import { ApiClientKey } from './api-store.js';

const TOKEN_KEY = 'dt:auth:token';

export const useAuthStore = defineStore('dt:auth', () => {
  const api = inject(ApiClientKey);
  if (!api) {
    throw new Error('[auth-store] ApiClient not provided. Call provideApiClient() first.');
  }
  const client: ApiClient = api;

  const state = ref<AuthState>({ kind: 'anonymous' });
  const loading = ref(false);
  const error = ref<string | null>(null);
  const permissions = ref<Permission[]>([]);

  // Keep `permissions` in sync with `state`. The store's
  // reactivity is automatic, but permissions is a derived list
  // that consumers want as a flat ref.
  watch(
    state,
    (next) => {
      permissions.value = next.kind === 'authenticated'
        ? permissionsFor(next.session.user.roles)
        : [];
    },
    { immediate: true },
  );

  async function login(email: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const res = await client.login({ email });
      sessionStorage.setItem(TOKEN_KEY, res.session.token);
      client.setAuthToken(res.session.token);
      state.value = { kind: 'authenticated', session: res.session };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Login failed';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function logout(): Promise<void> {
    try {
      await client.logout();
    } finally {
      sessionStorage.removeItem(TOKEN_KEY);
      client.setAuthToken(null);
      state.value = { kind: 'anonymous' };
    }
  }

  /** Rehydrate from sessionStorage + /api/auth/me. Called on mount. */
  async function refresh(): Promise<void> {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return;
    client.setAuthToken(token);
    loading.value = true;
    try {
      const me = await client.getMe();
      if (me.session) {
        state.value = { kind: 'authenticated', session: me.session };
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
        client.setAuthToken(null);
        const previous = state.value;
        const priorUser =
          previous.kind === 'authenticated'
            ? previous.session.user
            : previous.kind === 'expired'
              ? previous.user
              : { id: '', displayName: '', email: '', roles: [] };
        state.value = { kind: 'expired', user: priorUser };
      }
    } catch {
      sessionStorage.removeItem(TOKEN_KEY);
      client.setAuthToken(null);
      state.value = { kind: 'anonymous' };
    } finally {
      loading.value = false;
    }
  }

  const isAuthenticated = computed(() => state.value.kind === 'authenticated');

  return { state, loading, error, permissions, isAuthenticated, login, logout, refresh };
});
