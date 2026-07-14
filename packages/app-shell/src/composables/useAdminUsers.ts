/**
 * Admin users directory — list + role assignment via api-client.
 */

import { inject, onMounted, ref } from 'vue';

import type { Role, User } from '@dt/contracts';

import { ApiClientKey } from '../stores/api-store.js';

export const ADMIN_ROLES: readonly Role[] = ['admin', 'operator', 'viewer'];

export interface UseAdminUsersHandle {
  users: ReturnType<typeof ref<readonly User[]>>;
  loading: ReturnType<typeof ref<boolean>>;
  error: ReturnType<typeof ref<string | null>>;
  savingUserId: ReturnType<typeof ref<string | null>>;
  refresh: () => Promise<void>;
  setRoles: (userId: string, roles: Role[]) => Promise<void>;
}

export function useAdminUsers(): UseAdminUsersHandle {
  const api = inject(ApiClientKey);
  if (!api) {
    throw new Error('[useAdminUsers] ApiClient not provided. Call provideApiClient() first.');
  }

  const users = ref<readonly User[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const savingUserId = ref<string | null>(null);

  async function refresh(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.listUsers();
      users.value = res.users;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      users.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function setRoles(userId: string, roles: Role[]): Promise<void> {
    savingUserId.value = userId;
    error.value = null;
    try {
      const res = await api.setUserRoles(userId, { roles });
      users.value = users.value.map((u) => (u.id === userId ? res.user : u));
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      savingUserId.value = null;
    }
  }

  onMounted(() => {
    void refresh();
  });

  return { users, loading, error, savingUserId, refresh, setRoles };
}
