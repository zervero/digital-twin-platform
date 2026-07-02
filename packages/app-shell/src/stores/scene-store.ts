/**
 * Scene store.
 *
 * Owns the active scene snapshot and selection at the scene-node level. The
 * engine selection is the visual highlight; the scene store selection is the
 * canonical "currently focused node id" that any other UI (mini-map, command
 * toolbar) can read.
 */

import { defineStore } from 'pinia';
import { computed, inject, ref } from 'vue';

import type { ApiClient } from '@dt/api-client';
import { normalizeSceneSnapshot } from '@dt/scene-domain';
import type { SceneSnapshot } from '@dt/contracts';

import { ApiClientKey } from './api-store.js';

export const useSceneStore = defineStore('dt:scene', () => {
  const api = inject(ApiClientKey);
  if (!api) {
    throw new Error('[scene-store] ApiClient not provided. Call provideApiClient() first.');
  }
  const client: ApiClient = api;

  const snapshot = ref<SceneSnapshot | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const selectedNodeId = ref<string | null>(null);

  const nodeCount = computed(() => snapshot.value?.nodes.length ?? 0);

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const raw = await client.getScene();
      snapshot.value = normalizeSceneSnapshot(raw);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load scene';
    } finally {
      loading.value = false;
    }
  }

  function selectNode(id: string | null): void {
    selectedNodeId.value = id;
  }

  return {
    snapshot,
    nodeCount,
    selectedNodeId,
    loading,
    error,
    load,
    selectNode,
  };
});
