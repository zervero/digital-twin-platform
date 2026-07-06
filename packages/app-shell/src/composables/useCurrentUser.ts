import { computed, type ComputedRef } from 'vue';

import type { User } from '@dt/contracts';

import { useAuthStore } from '../stores/auth-store.js';

export function useCurrentUser(): ComputedRef<User | null> {
  const store = useAuthStore();
  return computed(() => {
    if (store.state.kind === 'authenticated') return store.state.session.user;
    if (store.state.kind === 'expired') return store.state.user;
    return null;
  });
}
