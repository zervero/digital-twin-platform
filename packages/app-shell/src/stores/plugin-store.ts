/**
 * usePluginStore — Pinia store wrapping the plugin registry.
 *
 * The registry is held as a `ShallowRef`; the entries, panels,
 * and menu items are derived `ComputedRef`s that re-run when
 * the registry's `subscribe` callback fires.
 *
 * The activation context's `subscribe` is wired to the
 * realtime stream by `attachRealtime` (added in T4). Without
 * it, `event-subscriber` extensions never receive events,
 * but `ui-panel` and `menu-item` extensions still work
 * because they don't need a stream.
 */

import { defineStore } from 'pinia';
import { computed, inject, ref, shallowRef } from 'vue';

import type { Permission } from '@dt/contracts';
import {
  type PluginContext,
  type PluginRegistry,
  type PluginRegistryEntry,
  type PluginPanel,
  type PluginMenuItem,
  createPluginRegistry,
} from '@dt/plugin-runtime';

import { ApiClientKey } from './api-store.js';

export const usePluginStore = defineStore('dt:plugins', () => {
  // The host injects the api client at bootstrap. The store
  // reads it lazily so the registry's `activate` callbacks
  // can call `api.getDevices()` etc. T4 wires this through
  // the activation context, but the store already checks for
  // it here so `activateAll` fails fast with a clear message
  // if the host forgot `provideApiClient`.
  const api = inject(ApiClientKey);

  const registry = shallowRef<PluginRegistry>(createPluginRegistry());
  const entriesRaw = ref<PluginRegistryEntry[]>([]);
  // Subscription handle on the current registry, so a
  // `setRegistry` swap detaches the old one.
  let unsubscribe: (() => void) | null = null;

  function track(): void {
    unsubscribe?.();
    unsubscribe = registry.value.subscribe(() => {
      entriesRaw.value = [...registry.value.list()];
    });
  }
  track();

  function setRegistry(r: PluginRegistry): void {
    registry.value = r;
    entriesRaw.value = [...r.list()];
    track();
  }

  const entries = computed(() => entriesRaw.value);

  const panels = computed<PluginPanel[]>(() => {
    const out: PluginPanel[] = [];
    for (const e of entriesRaw.value) {
      if (e.state !== 'active') continue;
      for (const ext of e.extensions) {
        if (ext.kind === 'ui-panel') out.push(ext.panel);
      }
    }
    return out;
  });

  const menuItems = computed<PluginMenuItem[]>(() => {
    const out: PluginMenuItem[] = [];
    for (const e of entriesRaw.value) {
      if (e.state !== 'active') continue;
      for (const ext of e.extensions) {
        if (ext.kind === 'menu-item') out.push(ext.item);
      }
    }
    return out;
  });

  async function activateAll(granted: readonly Permission[]): Promise<void> {
    if (!api) {
      throw new Error('[plugin-store] ApiClient not provided. Call provideApiClient() first.');
    }
    const ctx: PluginContext = {
      grantedPermissions: granted,
      // No-op until T4 wires the realtime stream via
      // `attachRealtime`. Plugins that subscribe to events
      // need to wait for T4 (or run on a host that calls
      // attachRealtime); V2.2 ui-panel / menu-item plugins
      // don't need this.
      subscribe: () => () => undefined,
    };
    await registry.value.activateAll(ctx);
    entriesRaw.value = [...registry.value.list()];
  }

  async function deactivateAll(): Promise<void> {
    await registry.value.deactivateAll();
    entriesRaw.value = [...registry.value.list()];
  }

  return {
    entries,
    panels,
    menuItems,
    setRegistry,
    activateAll,
    deactivateAll,
  };
});
