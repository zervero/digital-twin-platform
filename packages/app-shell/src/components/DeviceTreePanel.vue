<script setup lang="ts">
/**
 * Ops left-rail device tree. Replaces the flat DevicePanel list with a
 * site → (line|area) → device hierarchy built by `@dt/device-domain`.
 * Selection still drives device-store + scene-store (same wiring as
 * DevicePanel.vue).
 */
import { computed } from 'vue';
import { storeToRefs } from 'pinia';

import {
  buildDeviceTree,
  isDeviceTreeDeviceId,
  type DeviceForTree,
} from '@dt/device-domain';
import { useI18n } from '@dt/i18n';
import { DtEmptyState, DtIcon, DtPanel, DtTree } from '@dt/ui-kit';

import { useAuthStore } from '../stores/auth-store.js';
import { useDeviceStore } from '../stores/device-store.js';
import { useSceneStore } from '../stores/scene-store.js';

const { t } = useI18n();

const deviceStore = useDeviceStore();
const sceneStore = useSceneStore();
const authStore = useAuthStore();
const { sortedDevices, selectedDeviceId, loading, error } = storeToRefs(deviceStore);

const rootLabel = computed(() => {
  if (authStore.state.kind === 'authenticated' && authStore.state.session.tenantId) {
    return authStore.state.session.tenantId;
  }
  return sortedDevices.value[0]?.tenantId ?? t('device.tree.siteFallback');
});

const treeNodes = computed(() =>
  buildDeviceTree(sortedDevices.value as DeviceForTree[], {
    rootLabel: rootLabel.value,
    rootId: sortedDevices.value[0]?.tenantId ?? 'site',
  }),
);

function onSelect(nodeId: string): void {
  if (!isDeviceTreeDeviceId(nodeId)) return;
  deviceStore.selectDevice(nodeId);
  const device = deviceStore.devices.find((d) => d.id === nodeId);
  if (device) sceneStore.selectNode(device.sceneNodeId);
}
</script>

<template>
  <DtPanel :title="t('device.title')" density="compact">
    <template v-if="loading">
      <div class="muted">
        <DtIcon name="Loader" size="sm" />
        {{ t('common.loading') }}
      </div>
    </template>
    <template v-else-if="error">
      <div class="error">
        <DtIcon name="AlertTriangle" size="sm" />
        {{ error }}
      </div>
    </template>
    <template v-else-if="sortedDevices.length === 0">
      <DtEmptyState
        :title="t('device.empty')"
        :description="t('device.waitingDescription')"
      />
    </template>
    <template v-else>
      <DtTree
        :nodes="treeNodes"
        :selected-id="selectedDeviceId ?? undefined"
        @select="onSelect"
      />
    </template>
  </DtPanel>
</template>

<style scoped>
.muted {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-sm);
  padding: var(--dt-space-sm) 0;
}
.error {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
  color: var(--dt-accent-danger);
  font-size: var(--dt-text-sm);
  padding: var(--dt-space-sm) 0;
}
</style>
