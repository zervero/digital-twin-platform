/**
 * useOIDCStart — V3.0.
 *
 * Returns the URL the LoginButton should navigate to when the
 * user clicks "Log in". In mock mode, this is the V2
 * `POST /api/auth/login` endpoint (the LoginButton shows a
 * form instead, but this URL is still useful for tooling).
 * In oidc mode, this is `GET /api/auth/oidc/start`, which
 * the BFF uses to generate state + PKCE and redirect to the
 * issuer's authorize endpoint.
 *
 * The composable takes its inputs via Vue's inject/provide so
 * the LoginButton doesn't have to read env vars directly.
 */

import { computed, type ComputedRef, type InjectionKey, inject } from 'vue';

export type AuthMode = 'mock' | 'oidc';

export const AuthModeKey: InjectionKey<AuthMode> = Symbol('dt:authMode');
export const BffBaseUrlKey: InjectionKey<string> = Symbol('dt:bffBaseUrl');

export interface OidcStartResult {
  loginHref: ComputedRef<string>;
  authMode: ComputedRef<AuthMode>;
}

export function useOIDCStart(): OidcStartResult {
  const authMode = inject(AuthModeKey, 'mock' as AuthMode);
  const bffBaseUrl = inject(BffBaseUrlKey, 'http://localhost:3001');
  const base = bffBaseUrl.replace(/\/$/, '');
  const loginHref = computed(() =>
    authMode === 'oidc'
      ? `${base}/api/auth/oidc/start`
      : `${base}/api/auth/login`,
  );
  return {
    loginHref,
    authMode: computed(() => authMode),
  };
}
