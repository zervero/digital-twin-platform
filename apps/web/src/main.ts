/**
 * Web entry point.
 *
 * Boots the shared app shell with a real ApiClient. The BFF URL comes from
 * `VITE_BFF_URL` and falls back to localhost.
 *
 * V2.2 wires the sample `helloPlugin` into the shell so the
 * extension-point surface is exercised on every dev run. Remove
 * the `plugins:` line to ship a plugin-free web build.
 */

import { createApp } from 'vue';
import '@dt/ui-kit/styles';

import { AppShell, provideApiClient } from '@dt/app-shell';
import { createApiClient } from '@dt/api-client';
import { createPinia } from 'pinia';

import { helloPlugin } from './plugins/hello/index.js';
import { readEnv } from './env.js';

async function main(): Promise<void> {
  const { bffUrl } = readEnv();
  const apiClient = createApiClient({ baseUrl: bffUrl });

  // Pre-create the Vue app + pinia so the rest of the boot
  // (auth hydration, plugin activation) shares the same
  // instances. `bootstrapAppShell` mounts the same root
  // component the V1 path did.
  const app = createApp(AppShell);
  const pinia = createPinia();
  app.use(pinia);
  provideApiClient(app, apiClient);
  // Avoid the dual-pinia path: bootstrapAppShell installs its
  // own pinia when given a host. We reuse ours via direct
  // store calls here.
  const authStore = (
    await import('@dt/app-shell')
  ).useAuthStore(pinia);
  await authStore.refresh();

  const { usePluginStore } = await import('@dt/app-shell');
  const { createPluginRegistry } = await import('@dt/plugin-runtime');
  const pluginStore = usePluginStore(pinia);
  const registry = createPluginRegistry();
  registry.register(helloPlugin);
  pluginStore.setRegistry(registry);
  await pluginStore.activateAll([...authStore.permissions]);

  app.mount('#app');
}

main().catch((err) => {
  console.error('[web] bootstrap failed', err);
});
