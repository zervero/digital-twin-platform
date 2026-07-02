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
  gap: 6px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  line-height: 16px;
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
  color: #3fb950;
  background: rgba(63, 185, 80, 0.1);
  border-color: rgba(63, 185, 80, 0.3);
}
.dt-badge--offline {
  color: #8b949e;
  background: rgba(139, 148, 158, 0.08);
  border-color: rgba(139, 148, 158, 0.3);
}
.dt-badge--warning {
  color: #d29922;
  background: rgba(210, 153, 34, 0.1);
  border-color: rgba(210, 153, 34, 0.3);
}
.dt-badge--alarm {
  color: #f85149;
  background: rgba(248, 81, 73, 0.1);
  border-color: rgba(248, 81, 73, 0.4);
}
</style>
