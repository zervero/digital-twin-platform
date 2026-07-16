/**
 * Device store.
 *
 * Loads the device list from the injected API client, sorts by priority, and
 * exposes selection state. The selected device id is the source of truth for
 * the 3D viewport; the engine subscribes to changes via `watch`.
 *
 * V2 adds `setDevices` and `upsertDevice` so the realtime stream
 * composable (`useDeviceStream`) can mirror server-pushed updates
 * without going back through the API.
 */

import { defineStore } from 'pinia';
import { computed, inject, ref } from 'vue';

import type { ApiClient } from '@dt/api-client';
import type { Device } from '@dt/contracts';

import { sortDevicesByPriority } from '@dt/device-domain';

import { ApiClientKey } from './api-store.js';

export const useDeviceStore = defineStore('dt:devices', () => {
  const api = inject(ApiClientKey);
  if (!api) {
    throw new Error('[device-store] ApiClient not provided. Call provideApiClient() first.');
  }
  const client: ApiClient = api;

  const devices = ref<Device[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const selectedDeviceId = ref<string | null>(null);

  const sortedDevices = computed(() => sortDevicesByPriority(devices.value));
  const selectedDevice = computed(() =>
    selectedDeviceId.value
      ? devices.value.find((d) => d.id === selectedDeviceId.value) ?? null
      : null,
  );

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      devices.value = await client.getDevices();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load devices';
    } finally {
      loading.value = false;
    }
  }

  /** Drop the in-memory device list (logout / tenant loss). Does not touch the API. */
  function clear(): void {
    devices.value = [];
    selectedDeviceId.value = null;
    error.value = null;
    loading.value = false;
  }

  function selectDevice(id: string | null): void {
    selectedDeviceId.value = id;
  }

  /** Replace the entire device list. Used by the realtime stream on
   *  `device:list-updated`. */
  function setDevices(next: Device[]): void {
    devices.value = next;
  }

  /** Upsert one device by id. Used by the realtime stream on
   *  `device:updated`. */
  function upsertDevice(next: Device): void {
    const idx = devices.value.findIndex((d) => d.id === next.id);
    if (idx >= 0) {
      const copy = devices.value.slice();
      copy[idx] = next;
      devices.value = copy;
    } else {
      devices.value = [...devices.value, next];
    }
  }

  return {
    devices,
    sortedDevices,
    selectedDeviceId,
    selectedDevice,
    loading,
    error,
    load,
    clear,
    selectDevice,
    setDevices,
    upsertDevice,
  };
});
