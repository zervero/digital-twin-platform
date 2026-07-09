<script setup lang="ts">
/**
 * SceneViewport -- V3 + V4-prep redesign (2026-07-09).
 *
 * V4-prep changes:
 *   - Adds a status overlay in the viewport corner that reads the
 *     scene store's loading / error / node-count state. The overlay
 *     uses lucide icons (Loader / AlertTriangle / Box) so the user
 *     has a non-3D signal that the scene is loading, errored, or
 *     live with N nodes.
 *   - The overlay stays absolutely positioned so it does not
 *     interfere with the three.js canvas beneath.
 *   - Three.js engine mount/load logic is unchanged.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { createEngine, type DigitalTwinEngine } from '@dt/engine-sdk';
import { DtIcon } from '@dt/ui-kit';

import { useSceneStore } from '../stores/scene-store.js';

const sceneStore = useSceneStore();
const container = ref<HTMLDivElement | null>(null);
let engine: DigitalTwinEngine | null = null;
let mounted = false;

onMounted(async () => {
  if (!container.value) return;
  engine = createEngine();
  engine.mount(container.value);
  mounted = true;
  if (sceneStore.snapshot) {
    await engine.loadScene(sceneStore.snapshot);
    if (sceneStore.selectedNodeId !== null) {
      engine.selectNode(sceneStore.selectedNodeId);
    }
  }
});

watch(
  () => sceneStore.snapshot,
  async (snapshot) => {
    if (!mounted || !engine || !snapshot) return;
    await engine.loadScene(snapshot);
    if (sceneStore.selectedNodeId !== null) {
      engine.selectNode(sceneStore.selectedNodeId);
    }
  },
);

watch(
  () => sceneStore.selectedNodeId,
  (id) => {
    if (!mounted || !engine) return;
    engine.selectNode(id);
  },
);

onBeforeUnmount(() => {
  engine?.dispose();
  engine = null;
  mounted = false;
});
</script>

<template>
  <div class="scene-viewport">
    <div ref="container" class="scene-viewport__canvas" />
    <div
      v-if="sceneStore.loading || sceneStore.error || sceneStore.snapshot"
      class="scene-viewport__overlay"
      aria-live="polite"
    >
      <template v-if="sceneStore.loading">
        <DtIcon name="Loader" size="sm" />
        <span>加载场景中…</span>
      </template>
      <template v-else-if="sceneStore.error">
        <DtIcon name="AlertTriangle" size="sm" />
        <span>{{ sceneStore.error }}</span>
      </template>
      <template v-else-if="sceneStore.snapshot">
        <DtIcon name="Box" size="sm" />
        <span>{{ sceneStore.nodeCount }} 节点</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.scene-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
}
.scene-viewport__canvas {
  position: absolute;
  inset: 0;
}
.scene-viewport__overlay {
  position: absolute;
  left: var(--dt-space-lg);
  bottom: var(--dt-space-lg);
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
  padding: var(--dt-space-sm) var(--dt-space-lg);
  background: var(--dt-bg-overlay);
  border: 1px solid var(--dt-border-subtle);
  border-radius: var(--dt-radius-pill);
  color: var(--dt-text-secondary);
  font-family: var(--dt-font-ui);
  font-size: var(--dt-text-xs);
  font-weight: var(--dt-weight-medium);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
</style>
