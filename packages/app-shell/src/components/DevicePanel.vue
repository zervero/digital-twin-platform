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
 *
 * V3.5 (Track K: i18n) — 2026-07-09:
 *   - All user-facing strings now resolve through `useI18n()`.
 *     The `aria-label="selected"` stays literal because it is
 *     an accessibility label for a non-text visual marker, not
 *     UI copy (per ADR 0018 "do not translate").
 */
import { storeToRefs } from 'pinia';

import { DtEmptyState, DtIcon, DtPanel, DtStatusBadge } from '@dt/ui-kit';
import { useI18n } from '@dt/i18n';

import { useDeviceStore } from '../stores/device-store.js';
import { useSceneStore } from '../stores/scene-store.js';

const { t } = useI18n();

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
  <DtPanel :title="t('device.title')" density="compact">
    <template v-if="loading">
      <div class="dt-inline-flex dt-items-center dt-gap-sm dt-text-secondary dt-text-sm dt-py-sm">
        <DtIcon name="Loader" size="sm" />
        {{ t('common.loading') }}
      </div>
    </template>
    <template v-else-if="error">
      <div class="dt-inline-flex dt-items-center dt-gap-sm dt-text-danger dt-text-sm dt-py-sm">
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
      <button
        v-for="device in sortedDevices"
        :key="device.id"
        type="button"
        :class="[
          'device-row',
          'dt-gap-md',
          'dt-items-center',
          'dt-py-sm',
          'dt-px-md',
          'dt-border-transparent',
          'dt-rounded-sm',
          'dt-bg-transparent',
          'dt-font-inherit',
          'dt-text-left',
          'dt-pointer',
          { 'is-selected': device.id === selectedDeviceId },
        ]"
        @click="onSelect(device.id)"
      >
        <span
          class="device-row__icon dt-inline-flex dt-items-center dt-justify-center dt-rounded-sm dt-bg-surface dt-text-secondary"
          aria-hidden="true"
        >
          <DtIcon name="Cpu" size="md" />
        </span>
        <span class="device-row__main dt-flex dt-flex-col dt-min-w-0">
          <span class="dt-font-medium dt-text-primary dt-text-sm dt-truncate">{{
            device.name
          }}</span>
          <span class="dt-font-mono dt-text-xs dt-text-muted dt-truncate">{{
            device.sceneNodeId
          }}</span>
        </span>
        <DtStatusBadge :status="device.status" />
        <span
          v-if="device.sceneNodeId === selectedNodeId"
          class="device-row__marker dt-inline-flex dt-items-center dt-justify-center"
          aria-label="selected"
        >
          <DtIcon name="Check" size="sm" />
        </span>
      </button>
    </template>
  </DtPanel>
</template>

<style scoped>
.device-row {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  color: inherit;
  transition:
    background var(--dt-duration-fast) var(--dt-ease-default),
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
  width: 24px;
  height: 24px;
}
.device-row.is-selected .device-row__icon {
  color: var(--dt-accent-primary);
  background: rgba(79, 143, 255, 0.1);
}
.device-row__main {
  gap: 2px;
}
.device-row__marker {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  color: var(--dt-accent-primary);
}
</style>
