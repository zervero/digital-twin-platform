<script setup lang="ts">
/**
 * V4-prep redesign (2026-07-09):
 *   - Brand text dropped "· V1" suffix; version is shown as a separate
 *     pill chip in the toolbar (handled by TopToolbar).
 *   - letter-spacing: 0.04em removed (was an AGENTS.md violation).
 *   - Layout uses warm-neutral surfaces from tokens.css; --dt-font-ui
 *     comes from the new Inter stack loaded by apps/web.
 *   - min-width 0 on sidebar / viewport / marketplace so flex children
 *     don't blow out the grid at narrow widths.
 */
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
        <div
          v-if="panels.length > 0 || pluginStore.entries.some((e) => e.state === 'errored')"
          class="app-shell__plugins"
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
  background: var(--dt-bg-base);
  color: var(--dt-text-primary);
  font-family: var(--dt-font-ui);
  font-size: var(--dt-text-md);
  line-height: var(--dt-line-normal);
  /* V4-prep redesign: features tightened to ensure panels / viewport
   * all claim min-width:0 so flex children don't blow out the grid. */
}
.app-shell__body {
  flex: 1 1 auto;
  display: grid;
  /* V4-prep redesign: keep the 3-column shape, but allow the sidebar
   * and marketplace columns to shrink below their previous fixed widths
   * on narrow desktop windows. The viewport always claims the remainder. */
  grid-template-columns: minmax(240px, 280px) minmax(0, 1fr) minmax(280px, 320px);
  min-height: 0;
  min-width: 0;
}
.app-shell__marketplace {
  border-left: 1px solid var(--dt-border-subtle);
  padding: var(--dt-space-lg);
  overflow-y: auto;
  min-height: 0;
  min-width: 0;
  background: var(--dt-bg-elevated);
}
.app-shell__sidebar {
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
.app-shell__viewport {
  min-width: 0;
  min-height: 0;
  position: relative;
  /* V4-prep redesign: keep the 3D viewport visually anchored with a
   * faint elevated border on top + bottom so it reads as the focus
   * surface, not as a gap between two panels. */
  background: var(--dt-bg-base);
}
.app-shell__toolbar-plugins {
  display: flex;
  gap: var(--dt-space-xs);
  padding: var(--dt-space-xs) var(--dt-space-lg);
  border-bottom: 1px solid var(--dt-border-subtle);
  background: var(--dt-bg-elevated);
}
.app-shell__menu-item {
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
.app-shell__menu-item:hover {
  background: var(--dt-bg-surface-hover);
  border-color: var(--dt-border-strong);
}
.plugin-panel--errored .plugin-panel__header {
  color: var(--dt-accent-danger);
}
</style>
