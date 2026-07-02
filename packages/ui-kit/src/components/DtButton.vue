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
  border: 1px solid #30363d;
  background: #21262d;
  color: #c9d1d9;
  padding: 6px 12px;
  border-radius: 4px;
  font: inherit;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}
.dt-button:hover:not(:disabled) {
  background: #30363d;
  border-color: #484f58;
}
.dt-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.dt-button--primary {
  background: #1f6feb;
  border-color: #1f6feb;
  color: #ffffff;
}
.dt-button--primary:hover:not(:disabled) {
  background: #388bfd;
  border-color: #388bfd;
}
.dt-button--danger {
  background: #da3633;
  border-color: #da3633;
  color: #ffffff;
}
.dt-button--danger:hover:not(:disabled) {
  background: #f85149;
  border-color: #f85149;
}
.dt-button--ghost {
  background: transparent;
  border-color: transparent;
}
.dt-button--ghost:hover:not(:disabled) {
  background: #21262d;
}
</style>
