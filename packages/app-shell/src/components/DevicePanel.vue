<script setup lang="ts">
/**
 * V4-prep redesign (2026-07-09):
 *   - Each device row now carries a Cpu icon (lucide) so the row
 *     reads as a device, not a plain text button. The icon stays
 *     the same across all devices for V4-prep; per-kind device
 *     icons (server / sensor / gateway) are a V4 follow-up that
 *     needs a device-kind field in the contract.
 *   - Selection marker (the unicode `●`) replaced with an icon
 *     check (Check) inside a circular slot.
 *   - Hover/selected states use the new token system; hex literals
 *     removed.
 *   - Density kept at compact for V4-prep; comfortable density
 *     becomes the default in the V3.4.x follow-up after more
 *     real-device data flows in.
 */
import { storeToRefs } from 'pinia';

import { DtEmptyState, DtIcon, DtPanel, DtStatusBadge } from '@dt/ui-kit';

import { useDeviceStore } from '../stores/device-store.js';
import { useSceneStore } from '../stores/scene-store.js';

const deviceStore = useDeviceStore();
const sceneStore = useSceneStore();
const { sortedDevices, selectedDeviceId, loading, error } = storeToRefs(deviceStore);
const { selectedNodeId } = storeToRefs(sceneStore);

function onSelect(id: string): void {
  deviceStore.selectDevice(id);
  const device = deviceStore.devices.find((d) => d.id === id);
  if (device) sceneStore.selectNode(device.sceneNodeId);
}
</script>

<template>
  <DtPanel title="设备" density="compact">
    <template v-if="loading">
      <div class="muted">
        <DtIcon name="Loader" size="sm" />
        加载中…
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
        title="暂无设备"
        description="等待 BFF 推送设备数据"
      />
    </template>
    <template v-else>
      <button
        v-for="device in sortedDevices"
        :key="device.id"
        type="button"
        :class="['device-row', { 'is-selected': device.id === selectedDeviceId }]"
        @click="onSelect(device.id)"
      >
        <span class="device-row__icon" aria-hidden="true">
          <DtIcon name="Cpu" size="md" />
        </span>
        <span class="device-row__main">
          <span class="device-row__name">{{ device.name }}</span>
          <span class="device-row__id">{{ device.sceneNodeId }}</span>
        </span>
        <DtStatusBadge :status="device.status" />
        <span
          v-if="device.sceneNodeId === selectedNodeId"
          class="device-row__marker"
          aria-label="selected"
        >
          <DtIcon name="Check" size="sm" />
        </span>
      </button>
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
.device-row {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: var(--dt-space-md);
  align-items: center;
  padding: var(--dt-space-sm) var(--dt-space-md);
  border: 1px solid transparent;
  border-radius: var(--dt-radius-sm);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--dt-duration-fast) var(--dt-ease-default),
    border-color var(--dt-duration-fast) var(--dt-ease-default);
}
.device-row:hover {
  background: var(--dt-bg-surface-hover);
}
.device-row.is-selected {
  background: var(--dt-bg-surface);
  border-color: var(--dt-accent-primary);
}
.device-row__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--dt-radius-sm);
  background: var(--dt-bg-surface);
  color: var(--dt-text-secondary);
}
.device-row.is-selected .device-row__icon {
  color: var(--dt-accent-primary);
  background: rgba(79, 143, 255, 0.10);
}
.device-row__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.device-row__name {
  font-weight: var(--dt-weight-medium);
  color: var(--dt-text-primary);
  font-size: var(--dt-text-sm);
  /* truncate overflow */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.device-row__id {
  font-family: var(--dt-font-mono);
  font-size: var(--dt-text-xs);
  color: var(--dt-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.device-row__marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  color: var(--dt-accent-primary);
}
</style>
