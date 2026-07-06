/**
 * usePluginStore — Pinia store wrapping the plugin registry.
 *
 * The registry is held as a `ShallowRef`; the entries, panels,
 * and menu items are derived `ComputedRef`s that re-run when
 * the registry's `subscribe` callback fires.
 *
 * The realtime stream is wired by `attachRealtime` (called
 * from `bootstrapAppShell`). Without it, `event-subscriber`
 * extensions never receive events; `ui-panel` and
 * `menu-item` extensions work fine because they don't need
 * a stream.
 *
 * The activation context's `subscribe` returns the host's
 * realtime subscription when a stream is attached, or a
 * no-op otherwise. This lets a plugin call
 * `ctx.subscribe(handler)` in its `activate` and get either
 * a working subscription or a clean teardown, with no
 * special-casing at the call site.
 */

import { defineStore } from 'pinia';
import { computed, inject, markRaw, ref, shallowRef, toRaw } from 'vue';

import type { Permission } from '@dt/contracts';
import type { RealtimeStream } from '@dt/realtime';
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
  // can call `api.getDevices()` etc. activateAll fails fast
  // with a clear message if the host forgot provideApiClient.
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

  // Realtime wiring. `realtimeUnsub` is the store-level
  // subscription that fans events out to active
  // `event-subscriber` extensions; `stream` is the per-plugin
  // source that `ctx.subscribe` reads from.
  const stream = shallowRef<RealtimeStream | undefined>(undefined);
  let realtimeUnsub: (() => void) | null = null;

  function attachRealtime(s: RealtimeStream | undefined): void {
    realtimeUnsub?.();
    stream.value = s;
    if (!s) return;
    realtimeUnsub = s.subscribe((event) => {
      for (const e of entriesRaw.value) {
        if (e.state !== 'active') continue;
        for (const ext of e.extensions) {
          if (ext.kind !== 'event-subscriber') continue;
          const sub = ext.subscriber;
          if (sub.eventTypes && !sub.eventTypes.includes(event.type)) continue;
          void sub.handle(event);
        }
      }
    });
  }

  const entries = computed(() => entriesRaw.value);

  const panels = computed<PluginPanel[]>(() => {
    const out: PluginPanel[] = [];
    for (const e of entriesRaw.value) {
      if (e.state !== 'active') continue;
      for (const ext of e.extensions) {
        if (ext.kind === 'ui-panel') { out.push({ ...toRaw(ext.panel), component: markRaw(toRaw(ext.panel.component)) }); }
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
      // Forward to the host's realtime stream if attached.
      // No-op otherwise; plugins that don't need events work
      // either way.
      subscribe: (fn) => {
        const s = stream.value;
        if (!s) return () => undefined;
        return s.subscribe(fn);
      },
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
    attachRealtime,
    activateAll,
    deactivateAll,
  };
});
