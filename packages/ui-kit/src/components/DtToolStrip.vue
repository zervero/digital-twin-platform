<script setup lang="ts">
import type * as Icons from 'lucide-vue-next';

import DtIcon from './DtIcon.vue';

export type DtToolStripItem = {
  id: string;
  icon: keyof typeof Icons;
  /** Accessible name — required; icon-only buttons must not rely on visual affordance alone. */
  ariaLabel: string;
  disabled?: boolean;
};

defineProps<{
  items: ReadonlyArray<DtToolStripItem>;
  activeId?: string;
  /** Accessible name for the toolbar landmark (consumer-owned copy; no i18n here). */
  ariaLabel?: string;
}>();

const emit = defineEmits<{
  select: [string];
}>();

function onSelect(id: string, disabled?: boolean) {
  if (disabled) return;
  emit('select', id);
}
</script>

<template>
  <div
    class="dt-tool-strip"
    role="toolbar"
    :aria-label="ariaLabel ?? 'Tool strip'"
  >
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      class="dt-tool-strip__btn"
      :class="{ 'dt-tool-strip__btn--active': item.id === activeId }"
      :aria-label="item.ariaLabel"
      :aria-pressed="item.id === activeId ? 'true' : 'false'"
      :disabled="item.disabled"
      @click="onSelect(item.id, item.disabled)"
    >
      <DtIcon :name="item.icon" size="md" />
    </button>
  </div>
</template>

<style scoped>
.dt-tool-strip {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-xs);
  padding: var(--dt-space-xs);
  background: var(--dt-bg-elevated);
  border: 1px solid var(--dt-border-default);
  border-radius: var(--dt-radius-md);
}
.dt-tool-strip__btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--dt-text-secondary);
  border-radius: var(--dt-radius-sm);
  cursor: pointer;
  transition:
    background var(--dt-duration-fast) var(--dt-ease-default),
    color var(--dt-duration-fast) var(--dt-ease-default);
}
.dt-tool-strip__btn:hover:not(:disabled):not(.dt-tool-strip__btn--active) {
  background: var(--dt-bg-surface-hover);
  color: var(--dt-text-primary);
}
.dt-tool-strip__btn--active {
  background: var(--dt-accent-primary);
  color: var(--dt-text-inverse);
}
.dt-tool-strip__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
