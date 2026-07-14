/**
 * Navigation guards for the app-shell router.
 *
 * Admin routes declare `meta.requiresAdmin: true`. Users without the
 * `admin` role (including anonymous) are redirected to `/ops`.
 */

import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router';

import { useAuthStore } from '../stores/auth-store.js';

function isAuthenticatedAdmin(): boolean {
  const auth = useAuthStore();
  if (auth.state.kind !== 'authenticated') return false;
  return auth.state.session.user.roles.includes('admin');
}

/** Return-style guard (2-arg). Do not add a `next` param — vue-router treats 3-arg as legacy. */
export function adminNavigationGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
): boolean | RouteLocationRaw {
  const needsAdmin = to.matched.some((record) => record.meta.requiresAdmin === true);
  if (!needsAdmin) return true;
  if (!isAuthenticatedAdmin()) return { path: '/ops' };
  return true;
}
