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
  padding: 24px 12px;
  color: #8b949e;
  text-align: center;
  gap: 4px;
}
.dt-empty__title {
  color: #c9d1d9;
  font-size: 13px;
  font-weight: 600;
}
.dt-empty__description {
  font-size: 12px;
  color: #6e7681;
}
</style>
