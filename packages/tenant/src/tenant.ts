/**
 * @dt/tenant — multi-tenant identity primitives.
 *
 * V3.3 boundary. Pure types and a tiny claim-extraction
 * helper; no I/O, no Vue, no BFF coupling. The package
 * exists so the OIDC claim name, the `Tenant` shape, and
 * the `TenantContext` that the BFF puts on its request
 * context are all defined in one place.
 *
 * Consumers:
 *
 *   - `@dt/auth-oidc` (Track F) reads `TENANT_ID_CLAIM`
 *     when it surfaces `VerifiedSession.tenantId` in T3.
 *   - The BFF (T4) calls `getTenantIdFromClaims` after a
 *     JWT verify, then puts the resolved `Tenant` on
 *     `c.var.tenant`.
 *
 * The package deliberately does NOT depend on `@dt/auth-oidc`
 * (no upward dependency); the BFF composes the two at the
 * route layer.
 */

/**
 * Canonical OIDC claim name that carries the tenant
 * identifier. Namespaced per OIDC convention (Auth0,
 * Keycloak, Okta all support namespaced claims).
 *
 * Override at runtime by setting the `OIDC_TENANT_CLAIM`
 * env var to a different claim name. The default is
 * `https://api.digital-twin-platform.local/tenant_id`;
 * a deployment that uses Auth0 might prefer
 * `https://your-app.auth0.com/tenant_id`.
 *
 * The constant is exported so a future env-var override
 * (per V3.3 plan T2) only needs to change one place: the
 * BFF reads `OIDC_TENANT_CLAIM` once at startup and passes
 * it to `getTenantIdFromClaims` as the second argument.
 */
export const TENANT_ID_CLAIM =
  'https://api.digital-twin-platform.local/tenant_id';

/**
 * Billing tier placeholder for V3.3. Real billing
 * integration is V4+.
 */
export type TenantPlan = 'free' | 'pro' | 'enterprise';

/**
 * Canonical tenant record. Resolved from the OIDC claim
 * by the BFF's tenant registry (T5) and passed to route
 * handlers on `c.var.tenant.tenant`. The shape is stable
 * enough that route handlers can read `plan` /
 * `createdAt` without a separate lookup, while staying
 * decoupled from any particular persistence layer.
 */
export interface Tenant {
  /** Unique opaque tenant ID (e.g. `acme-corp`). */
  id: string;
  /** Human-readable name (e.g. `Acme Corporation`). */
  name: string;
  /**
   * URL-safe slug. In V3.3 this is the same value as
   * `id`; the field exists so a future release can
   * rename the public slug without breaking the
   * identifier that JWT claims carry.
   */
  slug: string;
  /** Billing tier. V3.3 placeholder; real billing is V4+. */
  plan: TenantPlan;
  /** ISO-8601 timestamp. */
  createdAt: string;
}

/**
 * What the BFF puts on `c.var.tenant` after
 * `requiresTenantScope` runs. Carries the full Tenant
 * record so route handlers can read `plan`, `name`, etc.
 * without a separate lookup.
 */
export interface TenantContext {
  tenant: Tenant;
}

/**
 * Extract the tenant ID from a verified JWT's claims.
 * Returns `null` if the claim is missing or not a
 * non-empty string. The BFF treats `null` as a 401
 * `AUTH_NO_TENANT` response.
 *
 * The `claimName` parameter defaults to `TENANT_ID_CLAIM`.
 * A deployment that overrides the env var should pass the
 * resolved claim name explicitly so the helper stays a
 * pure function (no hidden env-var reads).
 */
export function getTenantIdFromClaims(
  claims: Record<string, unknown>,
  claimName: string = TENANT_ID_CLAIM,
): string | null {
  const value = claims[claimName];
  if (typeof value !== 'string') return null;
  if (value.length === 0) return null;
  return value;
}
