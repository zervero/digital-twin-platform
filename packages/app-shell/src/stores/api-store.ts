/**
 * Tiny injection helper for the API client.
 *
 * The app shell never reads a BFF URL from a global. The web app or desktop
 * app provides an `ApiClient` at bootstrap, and the store consumes it. This
 * keeps the shell environment-agnostic and test-friendly.
 */

import type { App, InjectionKey } from 'vue';

import type { ApiClient } from '@dt/api-client';

export const ApiClientKey: InjectionKey<ApiClient> = Symbol('dt:api-client');

export function provideApiClient(app: App, client: ApiClient): void {
  app.provide(ApiClientKey, client);
}
