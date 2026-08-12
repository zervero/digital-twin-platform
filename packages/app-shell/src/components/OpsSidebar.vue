<script setup lang="ts">
/**
 * Ops left push-drawer: device tree + plugin panels. Open state is owned
 * by the workspace via `v-model:open` so the grid column can collapse.
 * Collapse control sits in a bottom footer (content-first chrome).
 */
import { computed } from 'vue';

import { useI18n } from '@dt/i18n';
import { DtButton, DtEmptyState, DtIcon } from '@dt/ui-kit';
import type { PluginRegistryEntry } from '@dt/plugin-runtime';

import { usePluginStore } from '../stores/plugin-store.js';
import { usePluginPanels } from '../composables/index.js';
import DeviceTreePanel from './DeviceTreePanel.vue';
import PluginPanelHost from './PluginPanelHost.vue';

const open = defineModel<boolean>('open', { default: true });

const { t } = useI18n();
const pluginStore = usePluginStore();
const panels = usePluginPanels();

const erroredPlugins = computed(() =>
  pluginStore.entries.filter((e) => e.state === 'errored'),
);

function pluginErrorDescription(entry: PluginRegistryEntry): string {
  if (entry.error?.code === 'PERMISSION_DENIED') {
    return t('plugin.error.permissionDenied');
  }
  return t('plugin.error.activationFailed');
}

function collapse(): void {
  open.value = false;
}
</script>

<template>
  <aside
    id="ops-sidebar"
    class="ops-sidebar dt-border-r-subtle dt-bg-elevated dt-min-h-0 dt-min-w-0 dt-flex dt-flex-col"
    :class="{ 'is-collapsed': !open }"
    :aria-label="t('shell.sidebar.ariaLabel')"
    :aria-hidden="!open"
  >
    <div
      class="ops-sidebar__body dt-flex dt-flex-col dt-gap-md dt-p-md dt-overflow-auto dt-min-h-0 dt-flex-1"
    >
      <DeviceTreePanel />
      <div
        v-if="panels.length > 0 || erroredPlugins.length > 0"
        class="ops-sidebar__plugins"
      >
        <PluginPanelHost
          v-for="panel in panels"
          :key="panel.id"
          :panel="panel"
        />
        <div
          v-for="entry in erroredPlugins"
          :key="entry.manifest.id"
          class="plugin-alert dt-mt-md dt-border-subtle dt-rounded-sm dt-bg-surface"
          role="status"
          :data-plugin-id="entry.manifest.id"
        >
          <DtEmptyState
            :title="t('plugin.error.blockedTitle', { name: entry.manifest.name })"
            :description="pluginErrorDescription(entry)"
          />
        </div>
      </div>
    </div>

    <div class="ops-sidebar__footer dt-flex-shrink-0 dt-border-t-subtle dt-p-md">
      <DtButton
        variant="ghost"
        class="ops-sidebar__toggle"
        data-testid="ops-sidebar-collapse"
        aria-controls="ops-sidebar"
        :aria-expanded="open"
        :aria-label="t('shell.sidebar.collapse')"
        @click="collapse"
      >
        <span>{{ t('shell.sidebar.collapse') }}</span>
        <DtIcon name="ChevronsLeft" size="md" />
      </DtButton>
    </div>
  </aside>
</template>

<style scoped>
.ops-sidebar {
  overflow: hidden;
  transition:
    opacity var(--dt-duration-base) var(--dt-ease-default),
    border-color var(--dt-duration-base) var(--dt-ease-default);
}

.ops-sidebar.is-collapsed {
  opacity: 0;
  border-right-color: transparent;
  pointer-events: none;
}

:deep(.ops-sidebar__toggle.dt-button) {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 32px;
  padding: 0 var(--dt-space-md);
  gap: var(--dt-space-sm);
  border: 1px solid transparent;
  border-radius: var(--dt-radius-sm);
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-sm);
  font-weight: var(--dt-weight-medium);
}

:deep(.ops-sidebar__toggle.dt-button:hover:not(:disabled)) {
  background: var(--dt-bg-surface-hover);
  border-color: var(--dt-border-default);
  color: var(--dt-text-primary);
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
