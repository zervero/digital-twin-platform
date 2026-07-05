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
  background: var(--dt-bg-base);
  border: 1px solid var(--dt-border-default);
  border-radius: var(--dt-radius-md);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.dt-panel--compact {
  font-size: var(--dt-text-sm);
}
.dt-panel--comfortable {
  font-size: var(--dt-text-md);
}
.dt-panel__header {
  padding: var(--dt-space-md) var(--dt-space-xl);
  border-bottom: 1px solid var(--dt-border-subtle);
  font-weight: 600;
  color: var(--dt-text-primary);
  letter-spacing: 0.02em;
}
.dt-panel__body {
  padding: var(--dt-space-md) var(--dt-space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-xs);
  min-height: 0;
  overflow: auto;
}
</style>
