/**
 * @dt/app-shell
 *
 * Shared composition layer used by both the web and the desktop app. Owns
 * Pinia stores, the layout, and the wiring between UI panels and the engine
 * SDK. Consumers must inject an `ApiClient` via `provideApiClient(app, client)`
 * before mounting `AppShell`.
 */

import { createApp, type App } from 'vue';

import AppShell from './AppShell.vue';
import { provideApiClient } from './stores/api-store.js';

import type { ApiClient } from '@dt/api-client';

export { default as AppShell } from './AppShell.vue';
export { useDeviceStore } from './stores/device-store.js';
export { useSceneStore } from './stores/scene-store.js';
export { useAuthStore } from './stores/auth-store.js';
export { provideApiClient, ApiClientKey } from './stores/api-store.js';
export { default as DevicePanel } from './components/DevicePanel.vue';
export { default as SceneViewport } from './components/SceneViewport.vue';
export { default as TopToolbar } from './components/TopToolbar.vue';
export { useDeviceStream } from './composables/useDeviceStream.js';
export { useCurrentUser } from './composables/useCurrentUser.js';
export { usePermission } from './composables/usePermission.js';

/**
 * Bootstrap helper. Creates a Vue app, installs Pinia, provides the API
 * client, hydrates the auth store from sessionStorage + /api/auth/me,
 * and mounts `AppShell` into the given host element.
 */
export async function bootstrapAppShell(opts: {
  apiClient: ApiClient;
  host: HTMLElement;
}): Promise<App> {
  const { createPinia } = await import('pinia');
  const { useAuthStore } = await import('./stores/auth-store.js');
  const app = createApp(AppShell);
  const pinia = createPinia();
  app.use(pinia);
  provideApiClient(app, opts.apiClient);
  // Hydrate auth state from sessionStorage + /api/auth/me. Skipped
  // silently when there is no stored token.
  const authStore = useAuthStore(pinia);
  await authStore.refresh();
  app.mount(opts.host);
  return app;
}
