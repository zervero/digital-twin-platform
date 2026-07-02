/**
 * Web app environment.
 *
 * Reads Vite env vars at build time. Defaults to a localhost BFF so the dev
 * server works without configuration.
 */

export interface WebEnv {
  bffUrl: string;
}

export function readEnv(): WebEnv {
  const env = import.meta.env;
  const bffUrl = typeof env.VITE_BFF_URL === 'string' ? env.VITE_BFF_URL : 'http://localhost:3001';
  return { bffUrl };
}
