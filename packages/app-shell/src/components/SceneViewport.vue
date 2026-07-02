<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { createEngine, type DigitalTwinEngine } from '@dt/engine-sdk';

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
  <div ref="container" class="viewport" />
</template>

<style scoped>
.viewport {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: #0d1117;
  overflow: hidden;
}
</style>
