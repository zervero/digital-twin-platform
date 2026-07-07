/**
 * Tenant registry lookup — V3.3 T4 boundary.
 *
 * Thin wrapper around the dev mock registry. Production
 * would replace this with a database lookup; the call site
 * (`requiresTenantScope`) does not change when that
 * happens because the return type is the only contract.
 *
 * V3.3 T4 scope: the registry is a single-element placeholder
 * (see `DEMO_TENANTS` in `apps/bff/src/mock/demo-data.ts`).
 * T5 expands it to a proper three-tenant registry
 * (`acme-corp` + `globex-ind` + `initech-llc`) and threads
 * the same id used by the mock store's default `tenantId`,
 * so the supersession is a no-op for callers.
 *
 * The function returns `null` on miss rather than throwing;
 * `requiresTenantScope` translates that to a 401
 * `AUTH_NO_TENANT` so a client whose token carries a
 * tenant claim that no longer exists in the registry
 * gets a clean signal instead of a 500.
 */

import type { Tenant } from '@dt/tenant';

import { DEMO_TENANTS } from '../mock/demo-data.js';

export function resolveTenant(tenantId: string): Tenant | null {
  return DEMO_TENANTS.find((t) => t.id === tenantId) ?? null;
}
