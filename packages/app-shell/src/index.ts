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
import type { RealtimeStream } from '@dt/realtime';
import type { PluginRegistration } from '@dt/plugin-runtime';

export { default as AppShell } from './AppShell.vue';
export { useDeviceStore } from './stores/device-store.js';
export { useSceneStore } from './stores/scene-store.js';
export { useAuthStore } from './stores/auth-store.js';
export { usePluginStore } from './stores/plugin-store.js';
export { provideApiClient, ApiClientKey } from './stores/api-store.js';
export { default as DevicePanel } from './components/DevicePanel.vue';
export { default as SceneViewport } from './components/SceneViewport.vue';
export { default as TopToolbar } from './components/TopToolbar.vue';
export { default as PluginPanelHost } from './components/PluginPanelHost.vue';
export { useDeviceStream } from './composables/useDeviceStream.js';
export { useCurrentUser } from './composables/useCurrentUser.js';
export { useOIDCStart, AuthModeKey, BffBaseUrlKey } from './composables/useOIDCStart.js';
export type { AuthMode } from './composables/useOIDCStart.js';
export { usePermission } from './composables/usePermission.js';
export { usePluginPanels } from './composables/usePluginPanels.js';
export { usePluginMenu } from './composables/usePluginMenu.js';
export { default as LoginButton } from './components/LoginButton.vue';

/**
 * Bootstrap helper. Creates a Vue app, installs Pinia, provides the API
 * client, hydrates the auth store from sessionStorage + /api/auth/me,
 * activates any registered plugins, and mounts `AppShell` into the
 * given host element.
 *
 * Activation order matters: auth hydration must finish before plugin
 * activation so the permission gate has current-user state. The
 * realtime stream is attached before activation too, so plugins that
 * `ctx.subscribe` during `activate` receive a working subscription.
 */
export async function bootstrapAppShell(opts: {
  apiClient: ApiClient;
  host: HTMLElement;
  plugins?: readonly PluginRegistration[];
  realtime?: RealtimeStream;
}): Promise<App> {
  const { createPinia } = await import('pinia');
  const { useAuthStore } = await import('./stores/auth-store.js');
  const { usePluginStore } = await import('./stores/plugin-store.js');
  const { createPluginRegistry } = await import('@dt/plugin-runtime');

  const app = createApp(AppShell);
  const pinia = createPinia();
  app.use(pinia);
  provideApiClient(app, opts.apiClient);

  // 1. Hydrate auth from sessionStorage + /api/auth/me.
  const authStore = useAuthStore(pinia);
  await authStore.refresh();

  // 2. Build the plugin registry, attach the realtime stream,
  //    then activate. Permissions gate the activation; missing
  //    permissions send a plugin to `errored` rather than
  //    blocking the host.
  const pluginStore = usePluginStore(pinia);
  const registry = createPluginRegistry();
  for (const reg of opts.plugins ?? []) registry.register(reg);
  pluginStore.setRegistry(registry);
  pluginStore.attachRealtime(opts.realtime);
  await pluginStore.activateAll([...authStore.permissions]);

  app.mount(opts.host);
  return app;
}
