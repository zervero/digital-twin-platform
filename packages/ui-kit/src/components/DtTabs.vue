<script setup lang="ts">
defineProps<{
  modelValue: string;
  tabs: ReadonlyArray<{ id: string; label: string; disabled?: boolean }>;
}>();

const emit = defineEmits<{ 'update:modelValue': [string] }>();

function select(id: string, disabled?: boolean) {
  if (disabled) return;
  emit('update:modelValue', id);
}
</script>

<template>
  <div class="dt-tabs">
    <div class="dt-tabs__list" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        class="dt-tabs__tab"
        :class="{ 'dt-tabs__tab--active': tab.id === modelValue }"
        :id="`dt-tab-${tab.id}`"
        :aria-selected="tab.id === modelValue ? 'true' : 'false'"
        :aria-controls="`dt-tabpanel-${tab.id}`"
        :tabindex="tab.id === modelValue ? 0 : -1"
        :disabled="tab.disabled"
        @click="select(tab.id, tab.disabled)"
      >
        {{ tab.label }}
      </button>
    </div>
    <div
      class="dt-tabs__panel"
      role="tabpanel"
      :id="`dt-tabpanel-${modelValue}`"
      :aria-labelledby="`dt-tab-${modelValue}`"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.dt-tabs {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.dt-tabs__list {
  display: flex;
  align-items: stretch;
  gap: var(--dt-space-xs);
  border-bottom: 1px solid var(--dt-border-subtle);
}
.dt-tabs__tab {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--dt-text-secondary);
  padding: var(--dt-space-md) var(--dt-space-xl);
  font: inherit;
  font-size: var(--dt-text-sm);
  font-weight: var(--dt-weight-medium);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition:
    color var(--dt-duration-fast) var(--dt-ease-default),
    border-color var(--dt-duration-fast) var(--dt-ease-default);
}
.dt-tabs__tab:hover:not(:disabled):not(.dt-tabs__tab--active) {
  color: var(--dt-text-primary);
}
.dt-tabs__tab--active {
  color: var(--dt-accent-primary);
  border-bottom-color: var(--dt-accent-primary);
}
.dt-tabs__tab:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.dt-tabs__panel {
  padding: var(--dt-space-xl) 0;
  min-height: 0;
  color: var(--dt-text-primary);
}
</style>
