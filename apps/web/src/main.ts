/**
 * Web entry point.
 *
 * Boots the shared app shell with a real ApiClient. The BFF URL comes from
 * `VITE_BFF_URL` and falls back to localhost.
 */

import { createApp } from 'vue';

import { AppShell, provideApiClient } from '@dt/app-shell';
import { createApiClient } from '@dt/api-client';
import { createPinia } from 'pinia';

import { readEnv } from './env.js';

function main(): void {
  const { bffUrl } = readEnv();
  const apiClient = createApiClient({ baseUrl: bffUrl });

  const app = createApp(AppShell);
  app.use(createPinia());
  provideApiClient(app, apiClient);
  app.mount('#app');
}

main();
