<script setup lang="ts">
import { onMounted } from 'vue';

import { useDeviceStore } from './stores/device-store.js';
import { useSceneStore } from './stores/scene-store.js';
import { usePluginStore } from './stores/plugin-store.js';
import { usePluginPanels, usePluginMenu } from './composables/index.js';
import DevicePanel from './components/DevicePanel.vue';
import MarketplacePanel from './components/MarketplacePanel.vue';
import PluginPanelHost from './components/PluginPanelHost.vue';
import SceneViewport from './components/SceneViewport.vue';
import TopToolbar from './components/TopToolbar.vue';

const deviceStore = useDeviceStore();
const sceneStore = useSceneStore();
const pluginStore = usePluginStore();
const panels = usePluginPanels();
const menu = usePluginMenu();

onMounted(async () => {
  await Promise.all([deviceStore.load(), sceneStore.load()]);
});
</script>

<template>
  <div class="app-shell">
    <TopToolbar />
    <div v-if="menu.length > 0" class="app-shell__toolbar-plugins">
      <button
        v-for="item in menu"
        :key="item.id"
        class="app-shell__menu-item"
        @click="item.onSelect"
      >{{ item.label }}</button>
    </div>
    <div class="app-shell__body">
      <aside class="app-shell__sidebar">
        <DevicePanel />
        <div v-if="panels.length > 0 || pluginStore.entries.some((e) => e.state === 'errored')" class="app-shell__plugins">
          <PluginPanelHost
            v-for="panel in panels"
            :key="panel.id"
            :panel="panel"
          />
          <section
            v-for="entry in pluginStore.entries.filter((e) => e.state === 'errored')"
            :key="entry.manifest.id"
            class="plugin-panel plugin-panel--errored"
            :data-plugin-id="entry.manifest.id"
          >
            <header class="plugin-panel__header">{{ entry.manifest.name }} (blocked)</header>
            <div class="plugin-panel__body">
              <p>{{ entry.error?.message ?? 'plugin failed to activate' }}</p>
            </div>
          </section>
        </div>
      </aside>
      <main class="app-shell__viewport">
        <SceneViewport />
      </main>
      <aside class="app-shell__marketplace">
        <MarketplacePanel />
      </aside>
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
  grid-template-columns: 280px 1fr 320px;
  min-height: 0;
}
.app-shell__marketplace {
  border-left: 1px solid var(--dt-border-default, #30363d);
  padding: var(--dt-space-md, 12px);
  overflow-y: auto;
  min-height: 0;
}
.app-shell__sidebar {
  border-right: 1px solid #21262d;
  padding: 8px;
  overflow: auto;
}
.app-shell__viewport {
  min-width: 0;
  min-height: 0;
  position: relative;
}
.app-shell__toolbar-plugins {
  display: flex;
  gap: 4px;
  padding: 4px 8px;
  border-bottom: 1px solid #21262d;
  background: #0d1117;
}
.app-shell__menu-item {
  font: 12px/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
  padding: 4px 8px;
  background: transparent;
  color: #c9d1d9;
  border: 1px solid #30363d;
  border-radius: 4px;
  cursor: pointer;
}
.app-shell__menu-item:hover {
  background: #161b22;
}
.app-shell__plugins {
  display: flex;
  flex-direction: column;
}
.plugin-panel--errored .plugin-panel__header {
  color: #f85149;
}
</style>
