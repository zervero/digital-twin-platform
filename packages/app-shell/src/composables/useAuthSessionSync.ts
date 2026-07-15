/**
 * Re-apply host side effects when the auth session changes.
 *
 * Boot activates plugins once with the permissions known at
 * mount. Without this watcher, a later login/logout leaves
 * plugin panels, device/scene snapshots, and (indirectly)
 * admin chrome stuck on the previous session until a hard
 * reload — which is what users report as "page did not refresh".
 */

import { watch } from 'vue';

import { useAuthStore } from '../stores/auth-store.js';
import { useDeviceStore } from '../stores/device-store.js';
import { usePluginStore } from '../stores/plugin-store.js';
import { useSceneStore } from '../stores/scene-store.js';

export function useAuthSessionSync(): void {
  const authStore = useAuthStore();
  const pluginStore = usePluginStore();
  const deviceStore = useDeviceStore();
  const sceneStore = useSceneStore();

  watch(
    () => authStore.token,
    async (next, prev) => {
      // Skip the initial observation; boot already activated
      // plugins and OpsWorkspace loads devices/scene on mount.
      if (next === prev) return;

      try {
        await pluginStore.deactivateAll();
        await pluginStore.activateAll([...authStore.permissions]);
      } catch (err) {
        console.error('[auth-session-sync] plugin re-activation failed', err);
      }

      // Logout (and any other session drop): do not call load() —
      // /api/scene and /api/devices return 401 without a tenant,
      // and a failed load left the previous snapshot mounted in
      // SceneViewport. Clear in-memory twin state instead.
      if (!next) {
        deviceStore.clear();
        sceneStore.clear();
        return;
      }

      await Promise.allSettled([deviceStore.load(), sceneStore.load()]);
    },
  );
}
