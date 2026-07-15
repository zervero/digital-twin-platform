/**
 * Web entry point.
 *
 * Boots the shared app shell with a real ApiClient. The BFF URL comes from
 * `VITE_BFF_URL` and falls back to localhost. The auth mode comes from
 * `VITE_AUTH_MODE` (mock | oidc).
 *
 * V2.2 wires the sample `helloPlugin` into the shell so the
 * extension-point surface is exercised on every dev run. Remove
 * the `plugins:` line to ship a plugin-free web build.
 *
 * V3.0: VITE_AUTH_MODE=oidc swaps the LoginButton to a redirect
 * to /api/auth/oidc/start instead of the dev login form. The
 * auth store still rehydrates from /api/auth/me on mount so the
 * cookie set by the OIDC callback is picked up.
 */

import { createApp } from 'vue';
import '@dt/ui-kit/styles';
// V4-prep redesign: self-hosted typography (Inter + JetBrains Mono).
// ui-kit declares font tokens in tokens.css; the consumer opts in
// to the actual font files so the library stays typography-agnostic.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/400.css';

import { AppShell, createAppRouter, provideApiClient } from '@dt/app-shell';
import { createApiClient } from '@dt/api-client';
import { createPinia } from 'pinia';

import { helloPlugin } from './plugins/hello/index.js';
import { readEnv } from './env.js';

async function main(): Promise<void> {
  const { bffUrl, authMode } = readEnv();
  const apiClient = createApiClient({ baseUrl: bffUrl });

  const app = createApp(AppShell);
  const pinia = createPinia();
  app.use(pinia);
  app.use(createAppRouter());
  provideApiClient(app, apiClient);

  // V4: hydrate user accent preference and write CSS variables
  // before mount so the first paint uses the saved brand color.
  const { useAppearanceStore, applyAccent } = await import('@dt/app-shell');
  const appearanceStore = useAppearanceStore(pinia);
  appearanceStore.hydrate();
  applyAccent(appearanceStore.primary, { hover: appearanceStore.hover });

  const { useAuthStore } = await import('@dt/app-shell');
  const authStore = useAuthStore(pinia);

  // V3.0: OIDC mode wires the login button to a redirect via
  // useOIDCStart. Mock mode keeps the dev login form. The
  // auth store handles both refresh paths the same way
  // (cookie vs bearer token).
  const { BffBaseUrlKey, AuthModeKey } = await import('@dt/app-shell');
  app.provide(AuthModeKey, authMode);
  app.provide('dt:bffBaseUrl', bffUrl);
  // V3.4 T7: MarketplacePanel reads BffBaseUrlKey (Symbol).
  // Keep the legacy string key for older inject sites.
  app.provide(BffBaseUrlKey, bffUrl);

  // V3.0: detect OIDC callback errors. The BFF redirects to
  // /?oidc_error=...&oidc_error_description=... on failure;
  // we surface the description in the auth store's error
  // ref so the LoginButton can show it.
  const params = new URLSearchParams(window.location.search);
  const oidcError = params.get('oidc_error');
  if (oidcError) {
    authStore.error = params.get('oidc_error_description') ?? oidcError;
    // Strip the query so a refresh doesn't replay the error.
    const clean = window.location.pathname;
    window.history.replaceState({}, '', clean);
  }

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
  console.error('[web] boot failed', err);
  const root = document.getElementById('app');
  if (root) {
    root.textContent = `Boot failed: ${err instanceof Error ? err.message : String(err)}`;
  }
});
