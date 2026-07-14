<script setup lang="ts">
/**
 * Ops workspace: device tree (left) + full-bleed viewport (center) +
 * device context drawer (right). Marketplace lives under `/admin/marketplace`.
 * PluginPanelHost stays under the left rail (Task 8 polishes error UX).
 */
import { onMounted } from 'vue';

import { useDeviceStore } from '../stores/device-store.js';
import { useSceneStore } from '../stores/scene-store.js';
import { usePluginStore } from '../stores/plugin-store.js';
import { usePluginPanels, usePluginMenu } from '../composables/index.js';
import DeviceTreePanel from '../components/DeviceTreePanel.vue';
import DeviceDetailDrawer from '../components/DeviceDetailDrawer.vue';
import PluginPanelHost from '../components/PluginPanelHost.vue';
import SceneViewport from '../components/SceneViewport.vue';

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
  <div class="ops-workspace">
    <div v-if="menu.length > 0" class="ops-workspace__toolbar-plugins">
      <button
        v-for="item in menu"
        :key="item.id"
        class="ops-workspace__menu-item"
        @click="item.onSelect"
      >{{ item.label }}</button>
    </div>
    <div class="ops-workspace__body">
      <aside class="ops-workspace__sidebar">
        <DeviceTreePanel />
        <div
          v-if="panels.length > 0 || pluginStore.entries.some((e) => e.state === 'errored')"
          class="ops-workspace__plugins"
        >
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
      <main class="ops-workspace__viewport">
        <SceneViewport />
      </main>
      <DeviceDetailDrawer />
    </div>
  </div>
</template>

<style scoped>
.ops-workspace {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
}
.ops-workspace__body {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: minmax(240px, 280px) minmax(0, 1fr) minmax(280px, 360px);
  min-height: 0;
  min-width: 0;
}
.ops-workspace__sidebar {
  border-right: 1px solid var(--dt-border-subtle);
  padding: var(--dt-space-md);
  overflow: auto;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-md);
  background: var(--dt-bg-elevated);
}
.ops-workspace__viewport {
  min-width: 0;
  min-height: 0;
  position: relative;
  background: var(--dt-bg-base);
}
.ops-workspace__toolbar-plugins {
  display: flex;
  gap: var(--dt-space-xs);
  padding: var(--dt-space-xs) var(--dt-space-lg);
  border-bottom: 1px solid var(--dt-border-subtle);
  background: var(--dt-bg-elevated);
}
.ops-workspace__menu-item {
  font: inherit;
  font-size: var(--dt-text-sm);
  padding: var(--dt-space-xs) var(--dt-space-md);
  background: transparent;
  color: var(--dt-text-primary);
  border: 1px solid var(--dt-border-default);
  border-radius: var(--dt-radius-sm);
  cursor: pointer;
  transition: background var(--dt-duration-fast) var(--dt-ease-default),
    border-color var(--dt-duration-fast) var(--dt-ease-default);
}
.ops-workspace__menu-item:hover {
  background: var(--dt-bg-surface-hover);
  border-color: var(--dt-border-strong);
}
.plugin-panel--errored .plugin-panel__header {
  color: var(--dt-accent-danger);
}
</style>
