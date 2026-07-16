<script setup lang="ts">
/**
 * Presentational modal dialog. Esc / backdrop click close via `update:open`.
 * Title and body are slots; no i18n inside ui-kit.
 */
import { nextTick, onBeforeUnmount, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    /** Accessible name when title slot/prop is empty. */
    ariaLabel?: string;
    /** Accessible label for the close control. */
    closeLabel?: string;
  }>(),
  {
    title: undefined,
    ariaLabel: undefined,
    closeLabel: 'Close',
  },
);

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

function close(): void {
  emit('update:open', false);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.open) {
    event.preventDefault();
    close();
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (typeof document === 'undefined') return;
    if (isOpen) {
      document.addEventListener('keydown', onKeydown);
      await nextTick();
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', onKeydown);
      document.body.style.overflow = '';
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return;
  document.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="dt-dialog-root"
      role="presentation"
    >
      <div
        class="dt-dialog__backdrop"
        data-testid="dt-dialog-backdrop"
        @click="close"
      />
      <div
        class="dt-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="ariaLabel ?? title"
        :aria-labelledby="title || $slots.title ? 'dt-dialog-title' : undefined"
      >
        <header class="dt-dialog__header">
          <h2
            v-if="title || $slots.title"
            id="dt-dialog-title"
            class="dt-dialog__title"
          >
            <slot name="title">{{ title }}</slot>
          </h2>
          <button
            type="button"
            class="dt-dialog__close"
            data-testid="dt-dialog-close"
            :aria-label="closeLabel"
            @click="close"
          >
            ×
          </button>
        </header>
        <div class="dt-dialog__body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="dt-dialog__footer">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.dt-dialog-root {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--dt-space-xl);
}
.dt-dialog__backdrop {
  position: absolute;
  inset: 0;
  background: var(--dt-bg-overlay);
}
.dt-dialog {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: min(520px, 100%);
  max-height: min(90vh, 720px);
  background: var(--dt-bg-elevated);
  border: 1px solid var(--dt-border-default);
  border-radius: var(--dt-radius-md);
  box-shadow: var(--dt-shadow-lg);
  color: var(--dt-text-primary);
}
.dt-dialog__header {
  display: flex;
  align-items: center;
  gap: var(--dt-space-md);
  padding: var(--dt-space-lg) var(--dt-space-xl);
  border-bottom: 1px solid var(--dt-border-subtle);
}
.dt-dialog__title {
  margin: 0;
  flex: 1 1 auto;
  font-size: var(--dt-text-lg);
  font-weight: var(--dt-weight-semi);
  color: var(--dt-text-primary);
}
.dt-dialog__close {
  appearance: none;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: var(--dt-radius-sm);
  background: transparent;
  color: var(--dt-text-secondary);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
}
.dt-dialog__close:hover {
  background: var(--dt-bg-surface-hover);
  color: var(--dt-text-primary);
}
.dt-dialog__body {
  padding: var(--dt-space-xl);
  overflow: auto;
  min-height: 0;
}
.dt-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--dt-space-md);
  padding: var(--dt-space-md) var(--dt-space-xl);
  border-top: 1px solid var(--dt-border-subtle);
}
</style>
