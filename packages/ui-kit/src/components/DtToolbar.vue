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
  gap: 8px;
  padding: 6px 10px;
  background: #161b22;
  border-bottom: 1px solid #21262d;
  min-height: 36px;
}
.dt-toolbar--divided :slotted(:not(:first-child)) {
  border-left: 1px solid #21262d;
  padding-left: 8px;
  margin-left: 0;
}
</style>
