<script setup lang="ts">
import { computed } from 'vue';

import { STATUS_LABELS_ZH, type DeviceStatus } from '@dt/contracts';

const props = defineProps<{ status: DeviceStatus }>();

const label = computed(() => STATUS_LABELS_ZH[props.status]);
</script>

<template>
  <span :class="['dt-badge', `dt-badge--${status}`]">
    <span class="dt-badge__dot" aria-hidden="true" />
    {{ label }}
  </span>
</template>

<style scoped>
.dt-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
  padding: 2px var(--dt-space-md);
  border-radius: var(--dt-radius-pill);
  font-size: var(--dt-text-xs);
  line-height: var(--dt-line-tight);
  border: 1px solid transparent;
  font-weight: 500;
}
.dt-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.dt-badge--online {
  color: var(--dt-status-online);
  background: var(--dt-status-online-bg);
  border-color: var(--dt-status-online-border);
}
.dt-badge--offline {
  color: var(--dt-status-offline);
  background: var(--dt-status-offline-bg);
  border-color: var(--dt-status-offline-border);
}
.dt-badge--warning {
  color: var(--dt-status-warning);
  background: var(--dt-status-warning-bg);
  border-color: var(--dt-status-warning-border);
}
.dt-badge--alarm {
  color: var(--dt-status-alarm);
  background: var(--dt-status-alarm-bg);
  border-color: var(--dt-status-alarm-border);
}
</style>
