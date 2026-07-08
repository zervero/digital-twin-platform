/**
 * Marketplace request / response DTOs.
 *
 * V3.4 T3: the route handlers in
 * `apps/bff/src/routes/marketplace.ts` use these; the
 * app-shell uses these too (for the install UI in T7).
 *
 * The DTOs are kept in `@dt/contracts` so the boundary
 * is the same as the device / scene / command DTOs:
 * shared contract, host-agnostic. The marketplace
 * `Permission` extension (`plugin:read` /
 * `plugin:install` / `plugin:publish`) lives in
 * `auth.ts`; the runtime's `validatePluginManifest`
 * still owns manifest shape enforcement -- the
 * `manifest` field here is typed so a TS caller gets
 * autocomplete and a smoke can construct one without
 * casting through `unknown`.
 */

import type { Permission } from './auth.js';
import type { PluginManifest } from './plugin.js';

export interface PublishPluginRequest {
  manifest: PluginManifest;
  /** Base64-encoded artifact body (the tarball / signed bytes). */
  artifact: string;
}

export interface PublishedPluginVersion {
  pluginId: string;
  version: string;
  /** ISO-8601 timestamp; set when the artifact was published. */
  publishedAt: string;
  /** Path the BFF wrote the artifact to; opaque to clients. */
  artifactPath: string;
  /** Path the BFF wrote the signature to; opaque to clients. */
  signaturePath: string;
}

export interface InstallPluginRequest {
  pluginId: string;
  version: string;
}

export interface InstalledPluginResponse {
  tenantId: string;
  pluginId: string;
  version: string;
  /** ISO-8601 timestamp; set when the install succeeded. */
  installedAt: string;
  /** True if this version is the active one for the tenant. */
  active: boolean;
}

export interface ActivatePluginRequest {
  pluginId: string;
  version: string;
}

export interface UninstallPluginParams {
  pluginId: string;
  version: string;
}

export type MarketplaceErrorCode =
  | 'PLUGIN_NOT_FOUND'
  | 'PLUGIN_VERSION_NOT_FOUND'
  | 'PLUGIN_ALREADY_INSTALLED'
  | 'PLUGIN_SIGNATURE_INVALID'
  | 'PLUGIN_DOWNGRADE_FORBIDDEN'
  | 'PLUGIN_PERMISSION_DENIED'
  | 'PLUGIN_VERSION_MISMATCH'
  | 'PLUGIN_MANIFEST_INVALID';

/**
 * V3.4 permission extension: marketplace-specific
 * permissions, additive on top of the V3.3 union. They
 * are typed here so the BFF's `canInstallForTenant` /
 * `canPublish` policy (T6) references the exact same
 * strings as `ALL_PERMISSIONS` in `auth.ts`.
 */
export type PluginPermission = Extract<
  Permission,
  'plugin:read' | 'plugin:install' | 'plugin:publish'
>;
