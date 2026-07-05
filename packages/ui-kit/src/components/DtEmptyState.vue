<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
  }>(),
  {
    title: 'No data',
    description: '',
  },
);
</script>

<template>
  <div class="dt-empty">
    <div class="dt-empty__title">{{ title }}</div>
    <div v-if="description" class="dt-empty__description">{{ description }}</div>
    <slot />
  </div>
</template>

<style scoped>
.dt-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--dt-space-3xl) var(--dt-space-xl);
  color: var(--dt-text-secondary);
  text-align: center;
  gap: var(--dt-space-xs);
}
.dt-empty__title {
  color: var(--dt-text-primary);
  font-size: var(--dt-text-md);
  font-weight: 600;
}
.dt-empty__description {
  font-size: var(--dt-text-sm);
  color: var(--dt-text-muted);
}
</style>
