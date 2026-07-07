/**
 * @dt/tenant — public surface.
 *
 * V3.3 entry point. Re-exports the tenant types and the
 * `getTenantIdFromClaims` helper. The package has no
 * runtime side effects; consumers wire it up themselves
 * (the BFF in `apps/bff/src/middleware/requires-tenant.ts`
 * is the canonical example, added in T4).
 */

export {
  getTenantIdFromClaims,
  TENANT_ID_CLAIM,
  type Tenant,
  type TenantContext,
  type TenantPlan,
} from './tenant.js';
