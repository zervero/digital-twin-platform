<script setup lang="ts">
withDefaults(defineProps<{ divided?: boolean }>(), { divided: true });
</script>

<template>
  <div :class="['dt-toolbar', divided ? 'dt-toolbar--divided' : '']">
    <slot />
  </div>
</template>

<style scoped>
.dt-toolbar {
  display: flex;
  align-items: center;
  gap: var(--dt-space-md);
  padding: var(--dt-space-sm) var(--dt-space-lg);
  background: var(--dt-bg-elevated);
  border-bottom: 1px solid var(--dt-border-subtle);
  min-height: 36px;
}
.dt-toolbar--divided :slotted(:not(:first-child)) {
  border-left: 1px solid var(--dt-border-subtle);
  padding-left: var(--dt-space-md);
  margin-left: 0;
}
</style>
