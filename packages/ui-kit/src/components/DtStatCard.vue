<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    hint?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendLabel?: string;
  }>(),
  {},
);
</script>

<template>
  <article class="dt-stat-card">
    <p class="dt-stat-card__label">{{ label }}</p>
    <p class="dt-stat-card__value">{{ value }}</p>
    <p v-if="hint" class="dt-stat-card__hint">{{ hint }}</p>
    <p
      v-if="trendLabel || trend"
      class="dt-stat-card__trend"
      :data-trend="trend"
    >
      {{ trendLabel }}
    </p>
  </article>
</template>

<style scoped>
.dt-stat-card {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-xs);
  padding: var(--dt-space-xl);
  background: var(--dt-bg-base);
  border: 1px solid var(--dt-border-default);
  border-radius: var(--dt-radius-md);
  min-width: 0;
}
.dt-stat-card__label {
  margin: 0;
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-xs);
  font-weight: var(--dt-weight-medium);
  line-height: var(--dt-line-tight);
}
.dt-stat-card__value {
  margin: 0;
  color: var(--dt-text-primary);
  font-size: var(--dt-text-2xl);
  font-weight: var(--dt-weight-semi);
  line-height: var(--dt-line-tight);
  font-variant-numeric: tabular-nums;
}
.dt-stat-card__hint {
  margin: 0;
  color: var(--dt-text-muted);
  font-size: var(--dt-text-xs);
  line-height: var(--dt-line-normal);
}
.dt-stat-card__trend {
  margin: 0;
  font-size: var(--dt-text-xs);
  font-weight: var(--dt-weight-medium);
  line-height: var(--dt-line-tight);
  color: var(--dt-text-secondary);
}
.dt-stat-card__trend[data-trend='up'] {
  color: var(--dt-status-online);
}
.dt-stat-card__trend[data-trend='down'] {
  color: var(--dt-accent-danger);
}
.dt-stat-card__trend[data-trend='neutral'] {
  color: var(--dt-text-muted);
}
</style>
