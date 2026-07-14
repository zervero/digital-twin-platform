<script setup lang="ts">
/**
 * Product chrome top bar (V4 Task 5):
 *   Left   — brand, version chip, factory/tenant label
 *   Center — ops / admin mode switch (`DtSegmentedControl`)
 *   Right  — Search · Notifications · Help · [EN | 中文] · User
 *
 * Locale control sits immediately before the user control
 * (design requirement). Admin mode option is hidden for
 * non-admin roles. Last `/admin/*` path is restored via
 * `useLastAdminPath`.
 */
import { computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';

import { DtButton, DtIcon, DtSegmentedControl, DtToolbar } from '@dt/ui-kit';
import { useI18n, useLocaleStore } from '@dt/i18n';

import LoginButton from './LoginButton.vue';
import { useAuthStore } from '../stores/auth-store.js';
import { useLastAdminPath } from '../composables/useLastAdminPath.js';

const { t, setLocale } = useI18n();
const localeStore = useLocaleStore();

const authStore = useAuthStore();
const { state } = storeToRefs(authStore);

const route = useRoute();
const router = useRouter();
const lastAdminPath = useLastAdminPath();

const APP_VERSION = '4.3.0';

const isAdmin = computed(() => {
  if (state.value.kind !== 'authenticated') return false;
  return state.value.session.user.roles.includes('admin');
});

const tenantLabel = computed(() => {
  if (state.value.kind === 'authenticated' && state.value.session.tenantId) {
    return state.value.session.tenantId;
  }
  return t('shell.tenant.unknown');
});

const mode = computed<'ops' | 'admin'>(() =>
  route.path.startsWith('/admin') ? 'admin' : 'ops',
);

const modeOptions = computed(() => {
  const ops = { value: 'ops', label: t('shell.mode.ops') };
  if (!isAdmin.value) return [ops];
  return [ops, { value: 'admin', label: t('shell.mode.admin') }];
});

watch(
  () => route.fullPath,
  (path) => {
    lastAdminPath.remember(path);
  },
  { immediate: true },
);

function onModeChange(next: string): void {
  if (next === 'ops') {
    void router.push('/ops');
    return;
  }
  if (next === 'admin') {
    void router.push(lastAdminPath.get());
  }
}

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
  <DtToolbar>
    <div class="toolbar-left">
      <div class="brand">
        <span class="brand__mark">
          <DtIcon name="Boxes" size="lg" />
        </span>
        <span class="brand__name">Digital Twin</span>
        <span class="brand__version">{{ APP_VERSION }}</span>
      </div>

      <button
        type="button"
        class="tenant"
        :aria-label="t('shell.tenant.ariaLabel')"
        disabled
      >
        <DtIcon name="Building2" size="sm" />
        <span class="tenant__label">{{ tenantLabel }}</span>
        <DtIcon name="ChevronDown" size="sm" />
      </button>
    </div>

    <div class="toolbar-center" :aria-label="t('shell.mode.ariaLabel')">
      <DtSegmentedControl
        :model-value="mode"
        :options="modeOptions"
        @update:model-value="onModeChange"
      />
    </div>

    <div class="toolbar-right">
      <DtButton
        variant="ghost"
        :aria-label="t('shell.actions.search')"
        data-testid="toolbar-search"
        disabled
      >
        <DtIcon name="Search" size="sm" />
      </DtButton>
      <DtButton
        variant="ghost"
        :aria-label="t('shell.actions.notifications')"
        data-testid="toolbar-notifications"
        disabled
      >
        <DtIcon name="Bell" size="sm" />
      </DtButton>
      <DtButton
        variant="ghost"
        :aria-label="t('shell.actions.help')"
        data-testid="toolbar-help"
        disabled
      >
        <DtIcon name="CircleHelp" size="sm" />
      </DtButton>

      <div class="locale" role="group" :aria-label="t('shell.language')">
        <button
          v-for="opt in localeOptions"
          :key="opt.value"
          type="button"
          :class="['locale__opt', { 'is-active': activeLocale === opt.value }]"
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
.toolbar-left {
  flex: 1;
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-md);
  min-width: 0;
}
.toolbar-center {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}
.toolbar-right {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--dt-space-sm);
  min-width: 0;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-md);
  font-family: var(--dt-font-ui);
  letter-spacing: 0;
}
.brand__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--dt-radius-sm);
  background: linear-gradient(
    135deg,
    var(--dt-accent-primary),
    var(--dt-accent-secondary)
  );
  color: var(--dt-text-inverse);
}
.brand__name {
  font-size: var(--dt-text-lg);
  font-weight: var(--dt-weight-semi);
  color: var(--dt-text-primary);
}
.brand__version {
  font-family: var(--dt-font-mono);
  font-size: var(--dt-text-xs);
  font-weight: var(--dt-weight-medium);
  color: var(--dt-text-secondary);
  background: var(--dt-bg-surface);
  border: 1px solid var(--dt-border-subtle);
  padding: 1px 6px;
  border-radius: var(--dt-radius-pill);
}
.tenant {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-xs);
  padding: 2px var(--dt-space-sm);
  border: 1px solid var(--dt-border-subtle);
  border-radius: var(--dt-radius-sm);
  background: var(--dt-bg-surface);
  color: var(--dt-text-secondary);
  font: inherit;
  font-size: var(--dt-text-sm);
  cursor: default;
}
.tenant:disabled {
  opacity: 1;
}
.tenant__label {
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.locale {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  padding: 2px;
  background: var(--dt-bg-surface);
  border: 1px solid var(--dt-border-subtle);
  border-radius: var(--dt-radius-pill);
}
.locale__opt {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--dt-text-secondary);
  padding: 2px var(--dt-space-sm);
  border-radius: var(--dt-radius-pill);
  font: inherit;
  font-size: var(--dt-text-xs);
  font-weight: var(--dt-weight-medium);
  cursor: pointer;
  transition: background var(--dt-duration-fast) var(--dt-ease-default),
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
