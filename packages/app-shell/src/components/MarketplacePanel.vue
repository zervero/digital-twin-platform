<script setup lang="ts">
/**
 * Legacy marketplace list panel.
 *
 * V4 Task 9 moved the product surface to AdminMarketplacePage
 * (card grid). This panel remains exported for older demos and
 * reuses the same install handle so host wiring stays valid.
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

const api = createFetchMarketplaceApi({
  baseUrl: bffBaseUrl,
  getAuthToken: () => authStore.token,
});
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
  <section
    class="marketplace-panel dt-flex dt-flex-col dt-gap-md dt-p-lg dt-border dt-rounded-md dt-bg-base dt-text-primary dt-font-ui dt-text-sm dt-leading-normal"
    :aria-label="t('marketplace.title')"
  >
    <header class="dt-flex dt-flex-col dt-gap-xs">
      <h2
        class="dt-inline-flex dt-items-center dt-gap-sm dt-m-0 dt-text-lg dt-font-semi dt-text-primary"
      >
        <DtIcon name="Store" size="md" />
        {{ t('marketplace.title') }}
      </h2>
      <p class="dt-m-0 dt-text-secondary dt-text-xs">
        {{ t('marketplace.admin.subtitle') }}
      </p>
      <p
        v-if="errorMessage"
        class="dt-inline-flex dt-items-center dt-gap-xs dt-m-0 dt-text-danger dt-text-xs"
      >
        <DtIcon name="AlertTriangle" size="sm" />
        {{ errorMessage }}
      </p>
    </header>

    <div
      v-if="canPublish"
      class="dt-flex dt-flex-col dt-gap-sm dt-p-md dt-bg-elevated dt-border-subtle dt-rounded-sm"
    >
      <label class="dt-flex dt-flex-col dt-gap-xs dt-text-xs dt-text-secondary">
        <span>{{ t('marketplace.pluginId') }}</span>
        <input
          v-model="newPluginId"
          class="marketplace-panel__input dt-appearance-none dt-bg-base dt-border dt-text-primary dt-py-sm dt-px-md dt-rounded-sm dt-font-inherit dt-text-sm"
          type="text"
          placeholder="hello-plugin"
        />
      </label>
      <label class="dt-flex dt-flex-col dt-gap-xs dt-text-xs dt-text-secondary">
        <span>{{ t('marketplace.version') }}</span>
        <input
          v-model="newVersion"
          class="marketplace-panel__input dt-appearance-none dt-bg-base dt-border dt-text-primary dt-py-sm dt-px-md dt-rounded-sm dt-font-inherit dt-text-sm"
          type="text"
          placeholder="1.0.0"
        />
      </label>
      <button
        type="button"
        class="marketplace-panel__button marketplace-panel__button--primary dt-appearance-none dt-inline-flex dt-items-center dt-justify-center dt-gap-sm dt-border dt-bg-surface dt-py-sm dt-px-lg dt-rounded-sm dt-font-inherit dt-text-sm dt-font-medium dt-pointer"
        :disabled="!newPluginId || !newVersion"
        @click="submitInstall"
      >
        <DtIcon name="Download" size="sm" />
        {{ t('marketplace.install') }}
      </button>
    </div>
    <p
      v-else
      class="dt-inline-flex dt-items-center dt-gap-xs dt-m-0 dt-text-xs dt-text-secondary"
    >
      {{ t('marketplace.installHint', { permission: 'plugin:publish' }) }}
    </p>

    <div
      v-if="loading"
      class="dt-inline-flex dt-items-center dt-gap-sm dt-m-0 dt-text-xs dt-text-secondary"
    >
      <DtIcon name="Loader" size="sm" />
      {{ t('marketplace.loadingInstalled') }}
    </div>

    <ol
      v-else-if="installed.length > 0"
      class="dt-flex dt-flex-col dt-gap-md dt-list-none"
    >
      <li
        v-for="record in installed"
        :key="record.pluginId"
        class="dt-flex dt-flex-col dt-gap-sm dt-p-md dt-border-subtle dt-rounded-sm dt-bg-elevated"
      >
        <header class="dt-flex dt-items-baseline dt-justify-between dt-gap-sm">
          <strong>{{ record.pluginId }}</strong>
          <span class="dt-font-mono dt-text-xs dt-text-secondary">
            {{ record.versions.length }}
            {{
              record.versions.length === 1
                ? t('marketplace.version')
                : t('marketplace.versions')
            }}
          </span>
        </header>
        <ul class="dt-flex dt-flex-col dt-gap-xs dt-list-none">
          <li
            v-for="version in record.versions"
            :key="version.version"
            class="marketplace-panel__version dt-flex dt-items-center dt-justify-between dt-gap-sm dt-py-sm dt-px-md dt-text-sm dt-rounded-sm"
            :data-active="isActive(record.pluginId, version.version)"
          >
            <span class="dt-inline-flex dt-items-center dt-gap-sm dt-text-primary">
              <DtIcon
                v-if="isActive(record.pluginId, version.version)"
                name="ShieldCheck"
                size="sm"
              />
              <DtIcon v-else name="Package" size="sm" />
              <span class="dt-font-mono">{{ version.version }}</span>
              <span
                v-if="isActive(record.pluginId, version.version)"
                class="marketplace-panel__badge dt-rounded-pill dt-text-inverse dt-font-mono dt-text-xs dt-font-semi"
              >{{ t('marketplace.active') }}</span>
            </span>
            <span class="dt-inline-flex dt-gap-xs">
              <button
                type="button"
                class="marketplace-panel__action dt-inline-flex dt-items-center dt-gap-xs dt-appearance-none dt-border dt-bg-transparent dt-rounded-sm dt-font-inherit dt-text-xs dt-pointer"
                :disabled="!canInstall || isActive(record.pluginId, version.version)"
                @click="handle.activate(record.pluginId, version.version)"
              >
                <DtIcon name="CheckCircle2" size="sm" />
                {{ t('marketplace.activate') }}
              </button>
              <button
                type="button"
                class="marketplace-panel__action marketplace-panel__action--danger dt-inline-flex dt-items-center dt-gap-xs dt-appearance-none dt-border dt-bg-transparent dt-rounded-sm dt-font-inherit dt-text-xs dt-pointer"
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
    <p
      v-else
      class="dt-inline-flex dt-items-center dt-gap-sm dt-m-0 dt-text-xs dt-text-secondary"
    >
      <DtIcon name="PackageOpen" size="sm" />
      {{ t('marketplace.empty') }}
    </p>
  </section>
</template>

<style scoped>
.marketplace-panel__input {
  transition: border-color var(--dt-duration-fast) var(--dt-ease-default);
}
.marketplace-panel__input:focus {
  outline: none;
  border-color: var(--dt-accent-primary);
}
.marketplace-panel__button {
  transition:
    background var(--dt-duration-fast) var(--dt-ease-default),
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
.marketplace-panel__version[data-active='true'] {
  background: var(--dt-bg-surface);
  border: 1px solid var(--dt-border-default);
}
.marketplace-panel__badge {
  padding: 1px 8px;
  background: var(--dt-accent-secondary);
  text-transform: lowercase;
}
.marketplace-panel__action {
  padding: 2px var(--dt-space-sm);
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
