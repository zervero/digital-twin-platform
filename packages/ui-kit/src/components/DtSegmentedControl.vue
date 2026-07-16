<script setup lang="ts">
defineProps<{
  modelValue: string;
  options: ReadonlyArray<{ value: string; label: string; disabled?: boolean }>;
}>();

const emit = defineEmits<{ 'update:modelValue': [string] }>();

function select(value: string, disabled?: boolean) {
  if (disabled) return;
  emit('update:modelValue', value);
}
</script>

<template>
  <div class="dt-segmented" role="group">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="dt-segmented__option"
      :class="{ 'dt-segmented__option--selected': option.value === modelValue }"
      :aria-pressed="option.value === modelValue ? 'true' : 'false'"
      :disabled="option.disabled"
      @click="select(option.value, option.disabled)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.dt-segmented {
  display: inline-flex;
  align-items: stretch;
  gap: 0;
  padding: 2px;
  background: var(--dt-bg-surface);
  border: 1px solid var(--dt-border-default);
  border-radius: var(--dt-radius-sm);
}
.dt-segmented__option {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--dt-text-secondary);
  padding: var(--dt-space-sm) var(--dt-space-xl);
  border-radius: calc(var(--dt-radius-sm) - 1px);
  font: inherit;
  font-size: var(--dt-text-sm);
  font-weight: var(--dt-weight-medium);
  cursor: pointer;
  transition:
    background var(--dt-duration-fast) var(--dt-ease-default),
    color var(--dt-duration-fast) var(--dt-ease-default);
}
.dt-segmented__option:hover:not(:disabled):not(.dt-segmented__option--selected) {
  background: var(--dt-bg-surface-hover);
  color: var(--dt-text-primary);
}
.dt-segmented__option--selected {
  background: var(--dt-accent-primary);
  color: var(--dt-text-inverse);
}
.dt-segmented__option:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
