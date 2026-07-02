<script setup lang="ts">
import { onMounted } from 'vue';

import { useDeviceStore } from './stores/device-store.js';
import { useSceneStore } from './stores/scene-store.js';
import DevicePanel from './components/DevicePanel.vue';
import SceneViewport from './components/SceneViewport.vue';
import TopToolbar from './components/TopToolbar.vue';

const deviceStore = useDeviceStore();
const sceneStore = useSceneStore();

onMounted(async () => {
  await Promise.all([deviceStore.load(), sceneStore.load()]);
});
</script>

<template>
  <div class="app-shell">
    <TopToolbar />
    <div class="app-shell__body">
      <aside class="app-shell__sidebar">
        <DevicePanel />
      </aside>
      <main class="app-shell__viewport">
        <SceneViewport />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: #010409;
  color: #c9d1d9;
  font: 13px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
}
.app-shell__body {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: 280px 1fr;
  min-height: 0;
}
.app-shell__sidebar {
  border-right: 1px solid #21262d;
  padding: 8px;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.app-shell__viewport {
  position: relative;
  min-height: 0;
}
</style>
