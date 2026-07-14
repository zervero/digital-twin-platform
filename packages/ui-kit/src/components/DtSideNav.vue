<script setup lang="ts">
import { computed } from 'vue';

import * as Icons from 'lucide-vue-next';

import DtIcon from './DtIcon.vue';

type SideNavItem = {
  id: string;
  label: string;
  icon?: keyof typeof Icons;
};

const props = withDefaults(
  defineProps<{
    items: ReadonlyArray<SideNavItem>;
    /** Selected item id (v-model). */
    modelValue?: string;
    /** Alias for modelValue when the consumer prefers an activeId name. */
    activeId?: string;
    /** Accessible name for the nav landmark (consumer-owned copy; no i18n here). */
    ariaLabel?: string;
  }>(),
  { ariaLabel: 'Side navigation' },
);

const emit = defineEmits<{
  'update:modelValue': [string];
  select: [string];
}>();

const selectedId = computed(() => props.modelValue ?? props.activeId);

function onSelect(id: string) {
  emit('update:modelValue', id);
  emit('select', id);
}
</script>

<template>
  <nav class="dt-side-nav" :aria-label="ariaLabel">
    <ul class="dt-side-nav__list">
      <li v-for="item in items" :key="item.id" class="dt-side-nav__item">
        <button
          type="button"
          class="dt-side-nav__link"
          :class="{ 'dt-side-nav__link--active': item.id === selectedId }"
          :aria-current="item.id === selectedId ? 'page' : undefined"
          @click="onSelect(item.id)"
        >
          <DtIcon
            v-if="item.icon"
            class="dt-side-nav__icon"
            :name="item.icon"
            size="md"
          />
          <span class="dt-side-nav__label">{{ item.label }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.dt-side-nav {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--dt-bg-elevated);
  border-right: 1px solid var(--dt-border-subtle);
}
.dt-side-nav__list {
  list-style: none;
  margin: 0;
  padding: var(--dt-space-md);
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-xs);
}
.dt-side-nav__item {
  margin: 0;
}
.dt-side-nav__link {
  appearance: none;
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--dt-space-md);
  border: none;
  background: transparent;
  color: var(--dt-text-secondary);
  padding: var(--dt-space-md) var(--dt-space-xl);
  border-radius: var(--dt-radius-sm);
  font: inherit;
  font-size: var(--dt-text-sm);
  font-weight: var(--dt-weight-medium);
  text-align: left;
  cursor: pointer;
  transition:
    background var(--dt-duration-fast) var(--dt-ease-default),
    color var(--dt-duration-fast) var(--dt-ease-default);
}
.dt-side-nav__link:hover:not(.dt-side-nav__link--active) {
  background: var(--dt-bg-surface-hover);
  color: var(--dt-text-primary);
}
.dt-side-nav__link--active {
  background: var(--dt-accent-primary);
  color: var(--dt-text-inverse);
}
.dt-side-nav__icon {
  flex-shrink: 0;
}
.dt-side-nav__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
