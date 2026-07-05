<script setup lang="ts">
import { computed } from 'vue';

type Variant = 'default' | 'primary' | 'danger' | 'ghost';

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }>(),
  { variant: 'default', disabled: false, type: 'button' },
);

defineEmits<{ (e: 'click', event: MouseEvent): void }>();

const classes = computed(() => ['dt-button', `dt-button--${props.variant}`]);
</script>

<template>
  <button
    :class="classes"
    :type="type"
    :disabled="disabled"
    @click="(e) => $emit('click', e)"
  >
    <slot />
  </button>
</template>

<style scoped>
.dt-button {
  appearance: none;
  border: 1px solid var(--dt-border-default);
  background: var(--dt-bg-surface);
  color: var(--dt-text-primary);
  padding: var(--dt-space-sm) var(--dt-space-xl);
  border-radius: var(--dt-radius-sm);
  font: inherit;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}
.dt-button:hover:not(:disabled) {
  background: var(--dt-bg-surface-hover);
  border-color: var(--dt-border-strong);
}
.dt-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.dt-button--primary {
  background: var(--dt-accent-primary);
  border-color: var(--dt-accent-primary);
  color: var(--dt-text-inverse);
}
.dt-button--primary:hover:not(:disabled) {
  background: var(--dt-accent-primary-hover);
  border-color: var(--dt-accent-primary-hover);
}
.dt-button--danger {
  background: var(--dt-accent-danger);
  border-color: var(--dt-accent-danger);
  color: var(--dt-text-inverse);
}
.dt-button--danger:hover:not(:disabled) {
  background: var(--dt-accent-danger-hover);
  border-color: var(--dt-accent-danger-hover);
}
.dt-button--ghost {
  background: transparent;
  border-color: transparent;
}
.dt-button--ghost:hover:not(:disabled) {
  background: var(--dt-bg-surface);
}
</style>
