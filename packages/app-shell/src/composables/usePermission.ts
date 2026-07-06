import { computed, type ComputedRef } from 'vue';

import type { Permission } from '@dt/contracts';

import { useAuthStore } from '../stores/auth-store.js';

export function usePermission(perm: Permission): ComputedRef<boolean> {
  const store = useAuthStore();
  return computed(() => store.permissions.includes(perm));
}
