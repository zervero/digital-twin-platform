/**
 * Web app environment.
 *
 * Reads Vite env vars at build time. Defaults to a localhost
 * BFF so the dev server works without configuration.
 *
 * V3.0: VITE_AUTH_MODE picks between the mock auth provider
 * (the V1 / V2 dev loop) and the OIDC redirect flow. The BFF
 * also reads AUTH_PROVIDER, but the SPA needs to know which
 * login button to render before the first request lands.
 */

export type AuthMode = 'mock' | 'oidc';

export interface WebEnv {
  bffUrl: string;
  authMode: AuthMode;
}

function readAuthMode(): AuthMode {
  const raw = import.meta.env.VITE_AUTH_MODE;
  if (raw === 'oidc') return 'oidc';
  return 'mock';
}

export function readEnv(): WebEnv {
  const env = import.meta.env;
  const bffUrl = typeof env.VITE_BFF_URL === 'string' ? env.VITE_BFF_URL : 'http://localhost:3001';
  return { bffUrl, authMode: readAuthMode() };
}
