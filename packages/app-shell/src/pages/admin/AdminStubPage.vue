<script setup lang="ts">
/**
 * Placeholder admin child pages until dedicated UIs land.
 */
withDefaults(
  defineProps<{
    title?: string;
  }>(),
  { title: 'Admin' },
);
</script>

<template>
  <div class="admin-stub-page">
    <h1 class="admin-stub-page__title">{{ title }}</h1>
    <p class="admin-stub-page__hint">This section is not implemented yet.</p>
  </div>
</template>

<style scoped>
.admin-stub-page {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-sm);
}
.admin-stub-page__title {
  margin: 0;
  font-size: var(--dt-text-xl);
  font-weight: var(--dt-weight-semibold);
  color: var(--dt-text-primary);
}
.admin-stub-page__hint {
  margin: 0;
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-sm);
}
</style>
