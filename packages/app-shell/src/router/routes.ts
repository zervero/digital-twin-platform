/**
 * App-shell route table.
 *
 * `/ops` is the default workspace. `/admin/*` is gated by
 * `meta.requiresAdmin` (see `adminNavigationGuard`).
 * `/settings/appearance` is personal chrome for all roles.
 */

import type { RouteRecordRaw } from 'vue-router';

import OpsWorkspace from '../workspaces/OpsWorkspace.vue';
import AdminWorkspace from '../workspaces/AdminWorkspace.vue';
import AdminMarketplacePage from '../pages/admin/AdminMarketplacePage.vue';
import AdminInstalledPage from '../pages/admin/AdminInstalledPage.vue';
import AdminPublishPage from '../pages/admin/AdminPublishPage.vue';
import AdminUsersPage from '../pages/admin/AdminUsersPage.vue';
import AdminAuditPage from '../pages/admin/AdminAuditPage.vue';
import AdminTenantPage from '../pages/admin/AdminTenantPage.vue';
import AdminAppearanceRedirect from '../pages/admin/AdminAppearanceRedirect.vue';
import AppearanceSettingsPage from '../pages/settings/AppearanceSettingsPage.vue';

declare module 'vue-router' {
  interface RouteMeta {
    /** When true, only authenticated users with the `admin` role may enter. */
    requiresAdmin?: boolean;
  }
}

export const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/ops' },
  {
    path: '/ops',
    name: 'ops',
    component: OpsWorkspace,
  },
  {
    path: '/settings/appearance',
    name: 'settings-appearance',
    component: AppearanceSettingsPage,
  },
  {
    path: '/admin',
    component: AdminWorkspace,
    meta: { requiresAdmin: true },
    children: [
      { path: '', redirect: { name: 'admin-marketplace' } },
      {
        path: 'marketplace',
        name: 'admin-marketplace',
        component: AdminMarketplacePage,
      },
      {
        path: 'installed',
        name: 'admin-installed',
        component: AdminInstalledPage,
      },
      {
        path: 'publish',
        name: 'admin-publish',
        component: AdminPublishPage,
      },
      {
        path: 'users',
        name: 'admin-users',
        component: AdminUsersPage,
      },
      {
        path: 'audit',
        name: 'admin-audit',
        component: AdminAuditPage,
      },
      {
        path: 'tenant',
        name: 'admin-tenant',
        component: AdminTenantPage,
      },
      {
        path: 'appearance',
        name: 'admin-appearance',
        component: AdminAppearanceRedirect,
      },
    ],
  },
];
