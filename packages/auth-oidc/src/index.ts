/**
 * @dt/auth-oidc — public surface.
 *
 * V3.0 entry point. Re-exports the verification helpers
 * (`verifyJwt`, `verifyJwtWithResolver`, `extractPermissions`)
 * and their types. The package has no runtime side effects;
 * consumers wire it up themselves (the BFF in
 * `apps/bff/src/auth/oidc-provider.ts` is the canonical example).
 */

export {
  extractPermissions,
  verifyJwt,
  verifyJwtWithResolver,
  type OidcVerifyConfig,
  type VerifiedSession,
  type VerifyResult,
} from './verify.js';
