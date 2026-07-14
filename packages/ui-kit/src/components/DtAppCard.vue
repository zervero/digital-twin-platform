<script setup lang="ts">
import { useSlots } from 'vue';

import DtButton from './DtButton.vue';

withDefaults(
  defineProps<{
    title: string;
    description?: string;
    tag?: string;
    /** Label for the default primary action button (ignored when `action` slot is used). */
    actionLabel?: string;
    actionDisabled?: boolean;
  }>(),
  { actionDisabled: false },
);

const emit = defineEmits<{
  action: [];
}>();

const slots = useSlots();
</script>

<template>
  <article class="dt-app-card">
    <div class="dt-app-card__header">
      <h3 class="dt-app-card__title">{{ title }}</h3>
      <span v-if="tag" class="dt-app-card__tag">{{ tag }}</span>
    </div>
    <p v-if="description" class="dt-app-card__description">{{ description }}</p>
    <div v-if="slots.action || actionLabel" class="dt-app-card__actions">
      <slot name="action">
        <DtButton
          v-if="actionLabel"
          variant="primary"
          :disabled="actionDisabled"
          @click="emit('action')"
        >
          {{ actionLabel }}
        </DtButton>
      </slot>
    </div>
  </article>
</template>

<style scoped>
.dt-app-card {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-md);
  padding: var(--dt-space-xl);
  background: var(--dt-bg-base);
  border: 1px solid var(--dt-border-default);
  border-radius: var(--dt-radius-md);
  min-width: 0;
}
.dt-app-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dt-space-md);
}
.dt-app-card__title {
  margin: 0;
  color: var(--dt-text-primary);
  font-size: var(--dt-text-md);
  font-weight: var(--dt-weight-semi);
  line-height: var(--dt-line-tight);
}
.dt-app-card__tag {
  flex-shrink: 0;
  padding: 2px var(--dt-space-md);
  border-radius: var(--dt-radius-pill);
  border: 1px solid var(--dt-border-default);
  background: var(--dt-bg-surface);
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-xs);
  font-weight: var(--dt-weight-medium);
  line-height: var(--dt-line-tight);
}
.dt-app-card__description {
  margin: 0;
  color: var(--dt-text-muted);
  font-size: var(--dt-text-sm);
  line-height: var(--dt-line-normal);
}
.dt-app-card__actions {
  display: flex;
  align-items: center;
  gap: var(--dt-space-md);
  margin-top: var(--dt-space-xs);
}
</style>
