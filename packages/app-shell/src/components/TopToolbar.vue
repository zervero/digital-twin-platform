<script setup lang="ts">
/**
 * Product chrome top bar:
 *   Left   — brand, version chip, factory/tenant label
 *   Right  — Search · Notifications · Help · [EN | 中文] · User
 *
 * Ops/Admin mode switching lives on the signed-in user hover menu
 * in `LoginButton` (admin-only Admin entry). Locale sits immediately
 * before the user control.
 */
import { computed } from 'vue';
import { storeToRefs } from 'pinia';

import { DtButton, DtIcon, DtToolbar } from '@dt/ui-kit';
import { useI18n, useLocaleStore } from '@dt/i18n';

import LoginButton from './LoginButton.vue';
import { useAuthStore } from '../stores/auth-store.js';

const { t, setLocale } = useI18n();
const localeStore = useLocaleStore();

const authStore = useAuthStore();
const { state } = storeToRefs(authStore);

const APP_VERSION = '4.3.0';

const tenantLabel = computed(() => {
  if (state.value.kind === 'authenticated' && state.value.session.tenantId) {
    return state.value.session.tenantId;
  }
  return t('shell.tenant.unknown');
});

const localeOptions = [
  { value: 'en' as const, label: 'EN' },
  { value: 'zh-CN' as const, label: '中文' },
];

/** Active locale chip: prefer explicit choice; fall back to resolved. */
const activeLocale = computed(() =>
  localeStore.choice === 'system' ? localeStore.resolved : localeStore.choice,
);
</script>

<template>
  <DtToolbar class="top-toolbar" :divided="false">
    <div
      class="dt-inline-flex dt-items-center dt-flex-1 dt-min-w-0 dt-h-control dt-gap-xl toolbar-left"
    >
      <div class="dt-inline-flex dt-items-center dt-gap-md dt-h-control dt-font-ui">
        <span
          class="brand__mark dt-inline-flex dt-items-center dt-justify-center dt-size-mark dt-rounded-sm dt-text-inverse dt-flex-shrink-0"
          aria-hidden="true"
        >
          <DtIcon name="Boxes" size="md" />
        </span>
        <span class="dt-text-lg dt-font-semi dt-leading-1 dt-text-primary">
          Digital Twin
        </span>
        <span
          class="dt-inline-flex dt-items-center dt-px-md dt-font-mono dt-text-xs dt-font-medium dt-leading-1 dt-text-secondary dt-bg-surface dt-border-subtle dt-rounded-pill brand__version"
        >
          {{ APP_VERSION }}
        </span>
      </div>

      <span class="dt-shrink-rule" aria-hidden="true" />

      <button
        type="button"
        class="tenant dt-appearance-none dt-inline-flex dt-items-center dt-gap-sm dt-h-control dt-px-lg dt-border dt-rounded-sm dt-bg-surface dt-text-secondary dt-text-sm dt-leading-1 dt-cursor-default"
        :aria-label="t('shell.tenant.ariaLabel')"
        disabled
      >
        <DtIcon name="Building2" size="md" />
        <span class="dt-truncate tenant__label">{{ tenantLabel }}</span>
        <DtIcon name="ChevronDown" size="sm" />
      </button>
    </div>

    <div
      class="dt-inline-flex dt-items-center dt-flex-1 dt-min-w-0 dt-h-control dt-justify-end dt-gap-xl toolbar-right"
    >
      <div class="dt-inline-flex dt-items-center dt-gap-xs">
        <DtButton
          variant="ghost"
          class="toolbar-icon-btn"
          :aria-label="t('shell.actions.search')"
          data-testid="toolbar-search"
          disabled
        >
          <DtIcon name="Search" size="md" />
        </DtButton>
        <DtButton
          variant="ghost"
          class="toolbar-icon-btn"
          :aria-label="t('shell.actions.notifications')"
          data-testid="toolbar-notifications"
          disabled
        >
          <DtIcon name="Bell" size="md" />
        </DtButton>
        <DtButton
          variant="ghost"
          class="toolbar-icon-btn"
          :aria-label="t('shell.actions.help')"
          data-testid="toolbar-help"
          disabled
        >
          <DtIcon name="CircleHelp" size="md" />
        </DtButton>
      </div>

      <span class="dt-shrink-rule" aria-hidden="true" />

      <div
        class="locale dt-inline-flex dt-items-center dt-h-control dt-bg-surface dt-border dt-rounded-pill dt-box-border"
        role="group"
        :aria-label="t('shell.language')"
      >
        <button
          v-for="opt in localeOptions"
          :key="opt.value"
          type="button"
          :class="[
            'locale__opt',
            'dt-appearance-none',
            'dt-inline-flex',
            'dt-items-center',
            'dt-justify-center',
            'dt-border-0',
            'dt-bg-transparent',
            'dt-text-secondary',
            'dt-px-md',
            'dt-rounded-pill',
            'dt-text-xs',
            'dt-font-medium',
            'dt-leading-1',
            'dt-pointer',
            { 'is-active': activeLocale === opt.value },
          ]"
          :aria-pressed="activeLocale === opt.value"
          data-testid="toolbar-locale"
          @click="setLocale(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>

      <LoginButton />
    </div>
  </DtToolbar>
</template>

<style scoped>
:deep(.dt-toolbar.top-toolbar) {
  position: relative;
  align-items: center;
  min-height: 48px;
  padding: 0 var(--dt-space-2xl);
  gap: 0;
}

.toolbar-left {
  padding-right: var(--dt-space-2xl);
}

.toolbar-right {
  padding-left: var(--dt-space-2xl);
}

.brand__mark {
  background: linear-gradient(
    135deg,
    var(--dt-accent-primary),
    var(--dt-accent-secondary)
  );
}

.brand__version {
  height: 22px;
}

.tenant:disabled {
  opacity: 1;
}

.tenant__label {
  max-width: 12rem;
}

:deep(.toolbar-icon-btn.dt-button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--dt-radius-sm);
  color: var(--dt-text-secondary);
}

:deep(.toolbar-icon-btn.dt-button:hover:not(:disabled)) {
  background: var(--dt-bg-surface-hover);
  border-color: var(--dt-border-default);
  color: var(--dt-text-primary);
}

.locale {
  gap: 2px;
  padding: 2px;
}

.locale__opt {
  height: 100%;
  min-width: 3rem;
  transition:
    background var(--dt-duration-fast) var(--dt-ease-default),
    color var(--dt-duration-fast) var(--dt-ease-default);
}

.locale__opt:hover:not(.is-active) {
  color: var(--dt-text-primary);
  background: var(--dt-bg-surface-hover);
}

.locale__opt.is-active {
  background: var(--dt-accent-primary);
  color: var(--dt-text-inverse);
}
</style>
