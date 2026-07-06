/**
 * Plugin registry.
 *
 * Owns the per-plugin state machine and the activation flow.
 * `activateAll` runs sequentially: one plugin's failure does
 * not block the next. `deactivateAll` reverses in the
 * reverse-order they were activated (LIFO), which is what
 * plugins with a teardown expectation want.
 *
 * The activation context is a structural type. The host
 * constructs the concrete `ApiClient` and `RealtimeStream`
 * bindings; the runtime only declares the shape it needs.
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

export interface PluginRegistration {
  manifest: PluginManifest;
  activate: (ctx: PluginContext) => Promise<PluginExtension[]>;
  deactivate?: (ctx: PluginContext) => Promise<void>;
}

/**
 * Structural activation context. The runtime does not import
 * `@dt/api-client` or `@dt/realtime`; the host satisfies this
 * shape with the real implementations.
 */
export interface PluginContext {
  grantedPermissions: readonly Permission[];
  subscribe: (fn: (event: DigitalTwinEvent) => void) => () => void;
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

function missingPermissions(
  required: readonly Permission[],
  granted: readonly Permission[],
): Permission[] {
  const set = new Set<Permission>(granted);
  return required.filter((p) => !set.has(p));
}

export function createPluginRegistry(): PluginRegistry {
  const entries = new Map<string, PluginRegistryEntry & { reg: PluginRegistration }>();
  const listeners = new Set<(c: PluginStateChange) => void>();

  function emit(change: PluginStateChange): void {
    for (const fn of listeners) fn(change);
  }

  function setState(
    id: string,
    next: PluginState,
    patch: Partial<PluginRegistryEntry> = {},
  ): void {
    const cur = entries.get(id);
    if (!cur) return;
    const prev = cur.state;
    const merged = { ...cur, ...patch, state: next };
    entries.set(id, merged);
    emit({ pluginId: id, prev, next, error: merged.error });
  }

  return {
    register(reg) {
      if (entries.has(reg.manifest.id)) {
        throw new Error(`plugin already registered: ${reg.manifest.id}`);
      }
      entries.set(reg.manifest.id, {
        manifest: reg.manifest,
        state: 'inactive',
        extensions: [],
        reg,
      });
    },

    unregister(id) {
      const cur = entries.get(id);
      if (!cur) return;
      if (cur.state === 'active' || cur.state === 'activating') {
        // Best-effort: a non-awaited deactivation so unregister
        // stays synchronous. The host is expected to call
        // deactivateAll() first if it cares.
        void cur.reg.deactivate?.({
          grantedPermissions: [],
          subscribe: () => () => undefined,
        });
      }
      entries.delete(id);
    },

    async activateAll(ctx) {
      for (const [id, cur] of entries) {
        if (cur.state !== 'inactive') continue;
        const missing = missingPermissions(cur.manifest.permissions, ctx.grantedPermissions);
        if (missing.length > 0) {
          setState(id, 'errored', {
            error: {
              code: 'PERMISSION_DENIED',
              message: `plugin requires missing permission(s): ${missing.join(', ')}`,
              missingPermissions: missing,
            },
          });
          continue;
        }
        setState(id, 'activating');
        try {
          const exts = await cur.reg.activate(ctx);
          setState(id, 'active', { extensions: exts });
        } catch (err) {
          setState(id, 'errored', {
            error: {
              code: 'ACTIVATION_FAILED',
              message: err instanceof Error ? err.message : String(err),
            },
          });
        }
      }
    },

    async deactivateAll() {
      const ordered = [...entries.values()].filter(
        (e) => e.state === 'active',
      );
      // LIFO teardown.
      for (const cur of [...ordered].reverse()) {
        setState(cur.manifest.id, 'deactivating');
        try {
          await cur.reg.deactivate?.({
            grantedPermissions: [],
            subscribe: () => () => undefined,
          });
          setState(cur.manifest.id, 'inactive', { extensions: [] });
        } catch (err) {
          setState(cur.manifest.id, 'errored', {
            error: {
              code: 'ACTIVATION_FAILED',
              message: err instanceof Error ? err.message : String(err),
            },
          });
        }
      }
    },

    list() {
      return [...entries.values()].map((e) => ({
        manifest: e.manifest,
        state: e.state,
        extensions: e.extensions,
        error: e.error,
      }));
    },

    get(id) {
      const e = entries.get(id);
      if (!e) return undefined;
      return {
        manifest: e.manifest,
        state: e.state,
        extensions: e.extensions,
        error: e.error,
      };
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
