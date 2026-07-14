import { createRouter, createWebHistory, type Router } from 'vue-router';

import { adminNavigationGuard } from './guards.js';
import { routes } from './routes.js';

/**
 * Creates the app-shell router with ops/admin workspaces and the
 * admin role navigation guard installed.
 */
export function createAppRouter(): Router {
  const router = createRouter({
    history: createWebHistory(),
    routes,
  });
  router.beforeEach(adminNavigationGuard);
  return router;
}

export { adminNavigationGuard } from './guards.js';
export { routes } from './routes.js';
