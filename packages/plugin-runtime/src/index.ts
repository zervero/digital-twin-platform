/**
 * @dt/plugin-runtime
 *
 * V2 plugin runtime. Provides the manifest shape, a pure
 * validator, a registry with a per-plugin state machine, and
 * the extension hooks a host app renders.
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
export type { PluginExtension, PluginPanel, PluginMenuItem, PluginEventSubscriber } from './extensions.js';
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

export type PluginPermission = Permission;
