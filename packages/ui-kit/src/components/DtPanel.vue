<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    density?: 'compact' | 'comfortable';
  }>(),
  { density: 'compact' },
);
</script>

<template>
  <section :class="['dt-panel', `dt-panel--${density}`]">
    <header v-if="title || $slots.title" class="dt-panel__header">
      <slot name="title">{{ title }}</slot>
    </header>
    <div class="dt-panel__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.dt-panel {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.dt-panel--compact {
  font-size: 12px;
}
.dt-panel--comfortable {
  font-size: 13px;
}
.dt-panel__header {
  padding: 8px 12px;
  border-bottom: 1px solid #21262d;
  font-weight: 600;
  color: #c9d1d9;
  letter-spacing: 0.02em;
}
.dt-panel__body {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
  overflow: auto;
}
</style>
