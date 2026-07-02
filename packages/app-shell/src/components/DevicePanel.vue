<script setup lang="ts">
import { storeToRefs } from 'pinia';

import { DtEmptyState, DtPanel, DtStatusBadge } from '@dt/ui-kit';

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
      <div class="muted">加载中…</div>
    </template>
    <template v-else-if="error">
      <div class="error">{{ error }}</div>
    </template>
    <template v-else-if="sortedDevices.length === 0">
      <DtEmptyState title="暂无设备" description="等待 BFF 推送设备数据" />
    </template>
    <template v-else>
      <button
        v-for="device in sortedDevices"
        :key="device.id"
        type="button"
        :class="['device-row', { 'is-selected': device.id === selectedDeviceId }]"
        @click="onSelect(device.id)"
      >
        <span class="device-row__name">{{ device.name }}</span>
        <span class="device-row__id">{{ device.sceneNodeId }}</span>
        <DtStatusBadge :status="device.status" />
        <span v-if="device.sceneNodeId === selectedNodeId" class="device-row__marker">●</span>
      </button>
    </template>
  </DtPanel>
</template>

<style scoped>
.muted {
  color: #8b949e;
  font-size: 12px;
  padding: 8px 0;
}
.error {
  color: #f85149;
  font-size: 12px;
  padding: 8px 0;
}
.device-row {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.device-row:hover {
  background: #161b22;
}
.device-row.is-selected {
  background: #1f2937;
  border-color: #1f6feb;
}
.device-row__name {
  font-weight: 500;
  color: #c9d1d9;
}
.device-row__id {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 11px;
  color: #6e7681;
}
.device-row__marker {
  color: #58a6ff;
  font-size: 10px;
}
</style>
