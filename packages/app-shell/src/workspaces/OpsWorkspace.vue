<script setup lang="ts">
/**
 * Ops workspace: collapsible device-tree drawer (left) + full-bleed
 * viewport (center) + collapsible device-detail drawer (right).
 * Marketplace lives under `/admin/marketplace`.
 */
import { onMounted } from 'vue';

import { useI18n } from '@dt/i18n';
import { DtButton, DtIcon } from '@dt/ui-kit';

import { useDeviceStore } from '../stores/device-store.js';
import { useSceneStore } from '../stores/scene-store.js';
import { useOpsLayoutPreference, usePluginMenu } from '../composables/index.js';
import OpsSidebar from '../components/OpsSidebar.vue';
import DeviceDetailDrawer from '../components/DeviceDetailDrawer.vue';
import SceneViewport from '../components/SceneViewport.vue';

const { t } = useI18n();
const deviceStore = useDeviceStore();
const sceneStore = useSceneStore();
const menu = usePluginMenu();
const { sidebarOpen, detailOpen } = useOpsLayoutPreference();

function expandSidebar(): void {
  sidebarOpen.value = true;
}

function expandDetail(): void {
  detailOpen.value = true;
}

onMounted(async () => {
  await Promise.all([deviceStore.load(), sceneStore.load()]);
});
</script>

<template>
  <div class="ops-workspace dt-flex dt-flex-col dt-flex-1 dt-min-h-0 dt-min-w-0">
    <div
      v-if="menu.length > 0"
      class="ops-workspace__toolbar-plugins dt-flex dt-gap-xs dt-py-xs dt-px-lg dt-border-b-subtle dt-bg-elevated"
    >
      <button
        v-for="item in menu"
        :key="item.id"
        class="ops-workspace__menu-item dt-font-inherit dt-text-sm dt-py-xs dt-px-md dt-bg-transparent dt-text-primary dt-border dt-rounded-sm dt-pointer"
        @click="item.onSelect"
      >{{ item.label }}</button>
    </div>
    <div
      class="ops-workspace__body"
      :class="{
        'is-sidebar-collapsed': !sidebarOpen,
        'is-detail-collapsed': !detailOpen,
      }"
    >
      <OpsSidebar v-model:open="sidebarOpen" />

      <main class="ops-workspace__viewport dt-min-w-0 dt-min-h-0 dt-relative dt-bg-base">
        <SceneViewport />
        <DtButton
          v-if="!sidebarOpen"
          variant="ghost"
          class="ops-workspace__rail-open ops-workspace__rail-open--left"
          data-testid="ops-sidebar-expand"
          aria-controls="ops-sidebar"
          :aria-expanded="sidebarOpen"
          :aria-label="t('shell.sidebar.expand')"
          @click="expandSidebar"
        >
          <DtIcon name="ChevronsRight" size="md" />
          <span>{{ t('shell.sidebar.expand') }}</span>
        </DtButton>
        <DtButton
          v-if="!detailOpen"
          variant="ghost"
          class="ops-workspace__rail-open ops-workspace__rail-open--right"
          data-testid="ops-detail-expand"
          aria-controls="ops-detail-drawer"
          :aria-expanded="detailOpen"
          :aria-label="t('shell.detailDrawer.expand')"
          @click="expandDetail"
        >
          <span>{{ t('shell.detailDrawer.expand') }}</span>
          <DtIcon name="ChevronsLeft" size="md" />
        </DtButton>
      </main>

      <DeviceDetailDrawer v-model:open="detailOpen" />
    </div>
  </div>
</template>

<style scoped>
/* Three-column ops grid — side columns collapse like push drawers */
.ops-workspace__body {
  --ops-sidebar-col: minmax(240px, 280px);
  --ops-detail-col: minmax(280px, 360px);
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: var(--ops-sidebar-col) minmax(0, 1fr) var(--ops-detail-col);
  min-height: 0;
  min-width: 0;
  transition: grid-template-columns var(--dt-duration-base) var(--dt-ease-default);
}

.ops-workspace__body.is-sidebar-collapsed {
  --ops-sidebar-col: 0px;
}

.ops-workspace__body.is-detail-collapsed {
  --ops-detail-col: 0px;
}

.ops-workspace__menu-item {
  transition:
    background var(--dt-duration-fast) var(--dt-ease-default),
    border-color var(--dt-duration-fast) var(--dt-ease-default);
}
.ops-workspace__menu-item:hover {
  background: var(--dt-bg-surface-hover);
  border-color: var(--dt-border-strong);
}

:deep(.ops-workspace__rail-open.dt-button) {
  position: absolute;
  bottom: var(--dt-space-lg);
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--dt-space-sm);
  height: 32px;
  padding: 0 var(--dt-space-lg);
  border: 1px solid var(--dt-border-default);
  border-radius: var(--dt-radius-sm);
  color: var(--dt-text-secondary);
  background: var(--dt-bg-elevated);
  box-shadow: var(--dt-shadow-sm);
  font-size: var(--dt-text-sm);
  font-weight: var(--dt-weight-medium);
}

:deep(.ops-workspace__rail-open.dt-button:hover:not(:disabled)) {
  background: var(--dt-bg-surface-hover);
  color: var(--dt-text-primary);
}

.ops-workspace__rail-open--left {
  left: var(--dt-space-lg);
}

.ops-workspace__rail-open--right {
  right: var(--dt-space-lg);
}
</style>
