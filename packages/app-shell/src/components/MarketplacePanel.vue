<script setup lang="ts">
/**
 * MarketplacePanel -- V3.4 T7 + V4-prep redesign (2026-07-09).
 *
 * V4-prep changes:
 *   - Install form: Download icon prefix on the primary install button.
 *   - Activate / Uninstall actions gain CheckCircle2 / Trash2 icons.
 *   - Active version row uses ShieldCheck + accent badge instead of
 *     the previous blue pill.
 *   - Loading state carries Loader icon; empty state carries PackageOpen.
 *   - Density bumped from `--dt-space-md` padding to `--dt-space-lg`
 *     so the panel reads as a product surface, not a debug list.
 *
 * V3.4 behavior unchanged: install / activate / uninstall go through
 * the BFF marketplace API; the panel owns no plugin runtime state.
 */
import { computed, inject, onMounted, ref } from 'vue';

import type { Permission } from '@dt/contracts';

import { useAuthStore } from '../stores/auth-store.js';
import {
  createFetchMarketplaceApi,
  useMarketplaceInstall,
} from '../composables/useMarketplaceInstall.js';
import { BffBaseUrlKey } from '../composables/useOIDCStart.js';
import { usePermission } from '../composables/usePermission.js';
import { DtIcon } from '@dt/ui-kit';
import { useI18n } from '@dt/i18n';

const { t } = useI18n();

const authStore = useAuthStore();
const bffBaseUrl = inject(BffBaseUrlKey, 'http://localhost:3001');

const tenantId = computed<string>(() => {
  const state = authStore.state;
  if (state.kind === 'authenticated') {
    return state.session.tenantId ?? '';
  }
  return '';
});

const api = createFetchMarketplaceApi({ baseUrl: bffBaseUrl });
const handle = useMarketplaceInstall(api, tenantId);

const installed = computed(() => handle.installed.value);
const loading = computed(() => handle.loading.value);
const errorMessage = computed(() => handle.error.value);
const activeByPlugin = computed(() => handle.activeByPlugin.value);

const canInstall = usePermission('plugin:install' as Permission);
const canPublish = usePermission('plugin:publish' as Permission);

const newPluginId = ref('');
const newVersion = ref('');

onMounted(async () => {
  if (tenantId.value) await handle.refresh();
});

async function submitInstall(): Promise<void> {
  const id = newPluginId.value.trim();
  const version = newVersion.value.trim();
  if (!id || !version) return;
  await handle.install(id, version);
  newPluginId.value = '';
  newVersion.value = '';
}

function isActive(pluginId: string, version: string): boolean {
  return activeByPlugin.value.get(pluginId) === version;
}

function canUninstall(versionCount: number): boolean {
  return versionCount > 1;
}
</script>

<template>
  <section class="marketplace-panel" :aria-label="t('marketplace.title')">
    <header class="marketplace-panel__header">
      <h2 class="marketplace-panel__title">
        <DtIcon name="Store" size="md" />
        {{ t('marketplace.title') }}
      </h2>
      <p v-if="errorMessage" class="marketplace-panel__error">
        <DtIcon name="AlertTriangle" size="sm" />
        {{ errorMessage }}
      </p>
    </header>

    <div v-if="canPublish" class="marketplace-panel__install-form">
      <label class="marketplace-panel__label">
<span>{{ t('marketplace.pluginId') }}</span>
        <input
          v-model="newPluginId"
          class="marketplace-panel__input"
          type="text"
          placeholder="hello-plugin"
        />
      </label>
      <label class="marketplace-panel__label">
<span>{{ t('marketplace.version') }}</span>
        <input
          v-model="newVersion"
          class="marketplace-panel__input"
          type="text"
          placeholder="1.0.0"
        />
      </label>
      <button
        type="button"
        class="marketplace-panel__button marketplace-panel__button--primary"
        :disabled="!newPluginId || !newVersion"
        @click="submitInstall"
      >
        <DtIcon name="Download" size="sm" />
        {{ t('marketplace.install') }}
      </button>
    </div>
    <p v-else class="marketplace-panel__hint">
      {{ t('marketplace.installHint', { permission: 'plugin:publish' }) }}
    </p>

    <div v-if="loading" class="marketplace-panel__loading">
      <DtIcon name="Loader" size="sm" />
      {{ t('marketplace.loadingInstalled') }}
    </div>

    <ol v-else-if="installed.length > 0" class="marketplace-panel__list">
      <li
        v-for="record in installed"
        :key="record.pluginId"
        class="marketplace-panel__record"
      >
        <header class="marketplace-panel__record-header">
          <strong>{{ record.pluginId }}</strong>
          <span class="marketplace-panel__record-count">
            {{ record.versions.length }} {{ record.versions.length === 1 ? t('marketplace.version') : t('marketplace.versions') }}
          </span>
        </header>
        <ul class="marketplace-panel__versions">
          <li
            v-for="version in record.versions"
            :key="version.version"
            class="marketplace-panel__version"
            :data-active="isActive(record.pluginId, version.version)"
          >
            <span class="marketplace-panel__version-id">
              <DtIcon
                v-if="isActive(record.pluginId, version.version)"
                name="ShieldCheck"
                size="sm"
              />
              <DtIcon v-else name="Package" size="sm" />
              <span class="marketplace-panel__version-num">{{ version.version }}</span>
              <span
                v-if="isActive(record.pluginId, version.version)"
                class="marketplace-panel__badge"
              >{{ t('marketplace.active') }}</span>
            </span>
            <span class="marketplace-panel__actions">
              <button
                type="button"
                class="marketplace-panel__action"
                :disabled="!canInstall || isActive(record.pluginId, version.version)"
                @click="handle.activate(record.pluginId, version.version)"
              >
                <DtIcon name="CheckCircle2" size="sm" />
                {{ t('marketplace.activate') }}
              </button>
              <button
                type="button"
                class="marketplace-panel__action marketplace-panel__action--danger"
                :disabled="!canInstall || !canUninstall(record.versions.length)"
                @click="handle.uninstall(record.pluginId, version.version)"
              >
                <DtIcon name="Trash2" size="sm" />
                {{ t('marketplace.uninstall') }}
              </button>
            </span>
          </li>
        </ul>
      </li>
    </ol>
    <p v-else class="marketplace-panel__empty">
      <DtIcon name="PackageOpen" size="sm" />
      {{ t('marketplace.empty') }}
    </p>
  </section>
</template>

<style scoped>
.marketplace-panel {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-md);
  padding: var(--dt-space-lg);
  border: 1px solid var(--dt-border-default);
  border-radius: var(--dt-radius-md);
  background: var(--dt-bg-base);
  color: var(--dt-text-primary);
  font-family: var(--dt-font-ui);
  font-size: var(--dt-text-sm);
  line-height: var(--dt-line-normal);
}
.marketplace-panel__header {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-xs);
}
.marketplace-panel__title {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
  margin: 0;
  font-size: var(--dt-text-lg);
  font-weight: var(--dt-weight-semi);
  color: var(--dt-text-primary);
  letter-spacing: 0;
}
.marketplace-panel__error {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-xs);
  margin: 0;
  color: var(--dt-accent-danger);
  font-size: var(--dt-text-xs);
}
.marketplace-panel__install-form {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-sm);
  padding: var(--dt-space-md);
  background: var(--dt-bg-elevated);
  border: 1px solid var(--dt-border-subtle);
  border-radius: var(--dt-radius-sm);
}
.marketplace-panel__label {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-xs);
  font-size: var(--dt-text-xs);
  color: var(--dt-text-secondary);
}
.marketplace-panel__input {
  appearance: none;
  background: var(--dt-bg-base);
  border: 1px solid var(--dt-border-default);
  color: var(--dt-text-primary);
  padding: var(--dt-space-sm) var(--dt-space-md);
  border-radius: var(--dt-radius-sm);
  font: inherit;
  font-size: var(--dt-text-sm);
  transition: border-color var(--dt-duration-fast) var(--dt-ease-default);
}
.marketplace-panel__input:focus {
  outline: none;
  border-color: var(--dt-accent-primary);
}
.marketplace-panel__button {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--dt-space-sm);
  border: 1px solid var(--dt-border-default);
  background: var(--dt-bg-surface);
  color: inherit;
  padding: var(--dt-space-sm) var(--dt-space-lg);
  border-radius: var(--dt-radius-sm);
  font: inherit;
  font-size: var(--dt-text-sm);
  font-weight: var(--dt-weight-medium);
  cursor: pointer;
  transition: background var(--dt-duration-fast) var(--dt-ease-default),
    border-color var(--dt-duration-fast) var(--dt-ease-default);
}
.marketplace-panel__button:hover:not(:disabled) {
  border-color: var(--dt-border-strong);
  background: var(--dt-bg-surface-hover);
}
.marketplace-panel__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.marketplace-panel__button--primary {
  background: var(--dt-accent-primary);
  border-color: var(--dt-accent-primary);
  color: var(--dt-text-inverse);
}
.marketplace-panel__button--primary:hover:not(:disabled) {
  background: var(--dt-accent-primary-hover);
  border-color: var(--dt-accent-primary-hover);
}
.marketplace-panel__hint {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-xs);
  margin: 0;
  font-size: var(--dt-text-xs);
  color: var(--dt-text-secondary);
}
.marketplace-panel__hint code {
  font-family: var(--dt-font-mono);
  font-size: var(--dt-text-xs);
  background: var(--dt-bg-surface);
  border: 1px solid var(--dt-border-subtle);
  padding: 1px 4px;
  border-radius: var(--dt-radius-sm);
}
.marketplace-panel__loading,
.marketplace-panel__empty {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
  margin: 0;
  font-size: var(--dt-text-xs);
  color: var(--dt-text-secondary);
}
.marketplace-panel__list {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-md);
  list-style: none;
  margin: 0;
  padding: 0;
}
.marketplace-panel__record {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-sm);
  padding: var(--dt-space-md);
  border: 1px solid var(--dt-border-subtle);
  border-radius: var(--dt-radius-sm);
  background: var(--dt-bg-elevated);
}
.marketplace-panel__record-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--dt-space-sm);
}
.marketplace-panel__record-count {
  font-family: var(--dt-font-mono);
  font-size: var(--dt-text-xs);
  color: var(--dt-text-secondary);
}
.marketplace-panel__versions {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-xs);
  list-style: none;
  margin: 0;
  padding: 0;
}
.marketplace-panel__version {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dt-space-sm);
  padding: var(--dt-space-sm) var(--dt-space-md);
  font-size: var(--dt-text-sm);
  border-radius: var(--dt-radius-sm);
}
.marketplace-panel__version[data-active='true'] {
  background: rgba(45, 212, 191, 0.08);
  border: 1px solid rgba(45, 212, 191, 0.25);
}
.marketplace-panel__version-id {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
  color: var(--dt-text-primary);
}
.marketplace-panel__version-num {
  font-family: var(--dt-font-mono);
}
.marketplace-panel__badge {
  display: inline-block;
  padding: 1px 8px;
  background: var(--dt-accent-secondary);
  color: #0F1115;
  border-radius: var(--dt-radius-pill);
  font-family: var(--dt-font-mono);
  font-size: var(--dt-text-xs);
  font-weight: var(--dt-weight-semi);
  letter-spacing: 0;
  text-transform: lowercase;
}
.marketplace-panel__actions {
  display: inline-flex;
  gap: var(--dt-space-xs);
}
.marketplace-panel__action {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-xs);
  appearance: none;
  border: 1px solid var(--dt-border-default);
  background: transparent;
  color: inherit;
  padding: 2px var(--dt-space-sm);
  border-radius: var(--dt-radius-sm);
  font: inherit;
  font-size: var(--dt-text-xs);
  cursor: pointer;
  transition: background var(--dt-duration-fast) var(--dt-ease-default);
}
.marketplace-panel__action:hover:not(:disabled) {
  background: var(--dt-bg-surface);
  border-color: var(--dt-border-strong);
}
.marketplace-panel__action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.marketplace-panel__action--danger {
  color: var(--dt-accent-danger);
}
.marketplace-panel__action--danger:hover:not(:disabled) {
  background: var(--dt-status-alarm-bg);
  border-color: var(--dt-status-alarm-border);
}
</style>
