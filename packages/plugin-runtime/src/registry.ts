/**
 * Plugin registry (stub for T1).
 *
 * The full implementation lands in T2. The stub exists so
 * `index.ts` can re-export `createPluginRegistry` without
 * consumers that import the factory (and call it
 * unconditionally) breaking the typecheck before the registry
 * is fully wired.
 */

import type { DigitalTwinEvent, Permission } from '@dt/contracts';

import type { PluginExtension } from './extensions.js';
import type { PluginManifest } from './manifest.js';

export type PluginState =
  | 'inactive'
  | 'activating'
  | 'active'
  | 'deactivating'
  | 'errored';

export interface PluginActivationError {
  code: 'PERMISSION_DENIED' | 'ACTIVATION_FAILED';
  message: string;
  missingPermissions?: readonly Permission[];
}

export interface PluginContext {
  grantedPermissions: readonly Permission[];
  subscribe: (fn: (event: DigitalTwinEvent) => void) => () => void;
}

export interface PluginRegistration {
  manifest: PluginManifest;
  activate: (ctx: PluginContext) => Promise<PluginExtension[]>;
  deactivate?: (ctx: PluginContext) => Promise<void>;
}

export interface PluginStateChange {
  pluginId: string;
  prev: PluginState;
  next: PluginState;
  error?: PluginActivationError;
}

export interface PluginRegistryEntry {
  manifest: PluginManifest;
  state: PluginState;
  extensions: readonly PluginExtension[];
  error?: PluginActivationError;
}

export interface PluginRegistry {
  register(reg: PluginRegistration): void;
  unregister(id: string): void;
  activateAll(ctx: PluginContext): Promise<void>;
  deactivateAll(): Promise<void>;
  list(): readonly PluginRegistryEntry[];
  get(id: string): PluginRegistryEntry | undefined;
  subscribe(fn: (change: PluginStateChange) => void): () => void;
}

export function createPluginRegistry(): PluginRegistry {
  throw new Error('createPluginRegistry: not implemented (lands in T2)');
}
