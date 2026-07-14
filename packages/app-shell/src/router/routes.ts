/**
 * App-shell route table.
 *
 * `/ops` is the default workspace. `/admin/*` is gated by
 * `meta.requiresAdmin` (see `adminNavigationGuard`).
 */

import type { RouteRecordRaw } from 'vue-router';

import OpsWorkspace from '../workspaces/OpsWorkspace.vue';
import AdminWorkspace from '../workspaces/AdminWorkspace.vue';
import AdminMarketplacePage from '../pages/admin/AdminMarketplacePage.vue';
import AdminStubPage from '../pages/admin/AdminStubPage.vue';

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
        component: AdminStubPage,
        props: { title: 'Installed plugins' },
      },
      {
        path: 'publish',
        name: 'admin-publish',
        component: AdminStubPage,
        props: { title: 'Publish plugin' },
      },
      {
        path: 'users',
        name: 'admin-users',
        component: AdminStubPage,
        props: { title: 'Users' },
      },
      {
        path: 'audit',
        name: 'admin-audit',
        component: AdminStubPage,
        props: { title: 'Audit log' },
      },
      {
        path: 'tenant',
        name: 'admin-tenant',
        component: AdminStubPage,
        props: { title: 'Tenant' },
      },
      {
        path: 'appearance',
        name: 'admin-appearance',
        component: AdminStubPage,
        props: { title: 'Appearance' },
      },
    ],
  },
];
