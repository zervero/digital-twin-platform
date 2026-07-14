<script setup lang="ts">
/**
 * Ops workspace: device tree (left) + full-bleed viewport (center) +
 * device context drawer (right). Marketplace lives under `/admin/marketplace`.
 * PluginPanelHost mounts under the left rail; errored plugins use a muted
 * empty state (no raw permission strings as the hero copy).
 */
import { computed, onMounted } from 'vue';

import { useI18n } from '@dt/i18n';
import { DtEmptyState } from '@dt/ui-kit';
import type { PluginRegistryEntry } from '@dt/plugin-runtime';

import { useDeviceStore } from '../stores/device-store.js';
import { useSceneStore } from '../stores/scene-store.js';
import { usePluginStore } from '../stores/plugin-store.js';
import { usePluginPanels, usePluginMenu } from '../composables/index.js';
import DeviceTreePanel from '../components/DeviceTreePanel.vue';
import DeviceDetailDrawer from '../components/DeviceDetailDrawer.vue';
import PluginPanelHost from '../components/PluginPanelHost.vue';
import SceneViewport from '../components/SceneViewport.vue';

const { t } = useI18n();
const deviceStore = useDeviceStore();
const sceneStore = useSceneStore();
const pluginStore = usePluginStore();
const panels = usePluginPanels();
const menu = usePluginMenu();

const erroredPlugins = computed(() =>
  pluginStore.entries.filter((e) => e.state === 'errored'),
);

function pluginErrorDescription(entry: PluginRegistryEntry): string {
  if (entry.error?.code === 'PERMISSION_DENIED') {
    return t('plugin.error.permissionDenied');
  }
  return t('plugin.error.activationFailed');
}

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
          v-if="panels.length > 0 || erroredPlugins.length > 0"
          class="ops-workspace__plugins"
        >
          <PluginPanelHost
            v-for="panel in panels"
            :key="panel.id"
            :panel="panel"
          />
          <div
            v-for="entry in erroredPlugins"
            :key="entry.manifest.id"
            class="plugin-alert"
            role="status"
            :data-plugin-id="entry.manifest.id"
          >
            <DtEmptyState
              :title="t('plugin.error.blockedTitle', { name: entry.manifest.name })"
              :description="pluginErrorDescription(entry)"
            />
          </div>
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
.plugin-alert {
  margin-top: var(--dt-space-md);
  border: 1px solid var(--dt-border-subtle);
  border-radius: var(--dt-radius-sm);
  background: var(--dt-bg-surface);
}
.plugin-alert :deep(.dt-empty) {
  align-items: flex-start;
  text-align: left;
  padding: var(--dt-space-lg) var(--dt-space-md);
  gap: var(--dt-space-xs);
}
.plugin-alert :deep(.dt-empty__title) {
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-sm);
  font-weight: var(--dt-weight-medium);
}
.plugin-alert :deep(.dt-empty__description) {
  color: var(--dt-text-muted);
  font-size: var(--dt-text-xs);
}
</style>
