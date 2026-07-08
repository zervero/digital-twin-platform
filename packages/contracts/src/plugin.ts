/**
 * Plugin manifest contract.
 *
 * V3.4: moved from `@dt/plugin-runtime` to `@dt/contracts`
 * so the marketplace DTOs in `plugins.ts` can type the
 * `manifest` field against the same shape the runtime
 * validates, without `@dt/contracts` importing
 * `@dt/plugin-runtime` (forbidden by `workspace.md`).
 *
 * V2.2 consumers that imported `PluginManifest` from
 * `@dt/plugin-runtime` keep working because the runtime
 * re-exports this type from `manifest.ts`. The runtime
 * owns the validator; the contract owns the shape.
 *
 * Mirrors V2.1's `Permission` move: types that are
 * shared across packages live in `@dt/contracts`; the
 * packages that produce / consume them depend on the
 * contract.
 */

import type { Permission } from './auth.js';

export interface PluginManifest {
  /** Lowercase, dash-separated id; validated by `validatePluginManifest`. */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Semver version string (e.g. "1.2.3" or "1.0.0-beta.1"). */
  version: string;
  /** Vendor / author name. */
  vendor: string;
  /** Optional short description. */
  description?: string;
  /** Optional entry-point hint (interpreted by the host). */
  entry?: string;
  /** Permissions the plugin needs from the `Permission` union. */
  permissions: readonly Permission[];
}
