/**
 * @dt/plugin-runtime
 *
 * V2 plugin runtime. Provides the manifest shape, a pure
 * validator, a registry with a per-plugin state machine, and
 * the extension hooks a host app renders.
 *
 * V3.4 adds persistence contracts (`PluginStore`,
 * `InstallRecord`, `InstalledPluginVersion`, `compareSemver`)
 * so the BFF can describe what is installed without the
 * runtime knowing how it is stored. The in-memory
 * `PluginRegistry` is unchanged; it is the activation
 * envelope.
 *
 * Trust model: plugins are JS modules the host app imports
 * directly. The manifest is a contract, not a sandbox. A V3
 * ADR will revisit if/when the marketplace ships.
 */

import type { Permission } from '@dt/contracts';

export type {
  PluginManifest,
  PluginManifestError,
  ValidateResult,
} from './manifest.js';
export { validatePluginManifest } from './manifest.js';
export type {
  PluginExtension,
  PluginPanel,
  PluginMenuItem,
  PluginEventSubscriber,
} from './extensions.js';
export type {
  PluginRegistration,
  PluginRegistry,
  PluginState,
  PluginStateChange,
  PluginActivationError,
  PluginContext,
  PluginRegistryEntry,
} from './registry.js';
export { createPluginRegistry } from './registry.js';
// V3.4: persistence contracts for the marketplace. The
// runtime exports the types and the `compareSemver` helper;
// it does not ship a `PluginStore` implementation. The BFF
// wires a file-based one in V3.4 T4.
export type {
  InstallRecord,
  InstalledPluginVersion,
  PluginStore,
} from './persistence.js';
export { compareSemver } from './persistence.js';

export type PluginPermission = Permission;
