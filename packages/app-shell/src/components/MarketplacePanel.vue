<script setup lang="ts">
/**
 * MarketplacePanel -- V3.4 T7.
 *
 * Renders the marketplace surface in the app shell:
 *   - "Install new version" form (pluginId + version)
 *   - Per-record list of installed versions, each with
 *     Activate / Uninstall buttons. The active version
 *     is highlighted with the `dt-status-badge` look
 *     and its Activate button is disabled.
 *   - Loading and error states
 *
 * The component owns the wiring: it builds a
 * `MarketplaceApi` from `BffBaseUrlKey`, derives
 * `tenantId` from the auth store's session, and
 * hands both to `useMarketplaceInstall`. The
 * composable is the host-side glue; this component
 * is the only place that knows about Vue's
 * reactivity and the DOM.
 *
 * No dynamic JS imports happen here. Each
 * installed version becomes a registration in
 * the plugin store via `replaceMarketplaceRegistrations`,
 * and the active version surfaces in the panels view
 * (the host's `PluginPanelHost` renders it). For
 * V3.4, the marketplace slice is a no-op stub; the
 * store still shows the manifest id + version in the
 * entries list, which is enough to demonstrate the
 * end-to-end path during dev.
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

// Re-expose the composable's refs as computed refs so
// vue-tsc's template type-check unwraps them at the
// use-site. The composable itself keeps the readonly
// Ref<readonly T[]> contract for tests; the panel is
// the only Vue consumer that hits the vue-tsc quirk.
const installed = computed(() => handle.installed.value);
const loading = computed(() => handle.loading.value);
const errorMessage = computed(() => handle.error.value);
const activeByPlugin = computed(() => handle.activeByPlugin.value);

const canInstall = usePermission('plugin:install' as Permission);
const canPublish = usePermission('plugin:publish' as Permission);

// Install form state. The marketplace requires the
// plugin to be already published (`canPublish`) before
// the install form makes sense; for V3.4 dev the
// install form is open to anyone with `plugin:install`
// since the BFF does not yet gate the publish side.
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
  // A plugin with a single installed version cannot
  // be uninstalled without first installing a new
  // one -- the marketplace guarantees the plugin
  // remains usable for the tenant.
  return versionCount > 1;
}
</script>

<template>
  <section class="marketplace-panel" aria-label="Plugin marketplace">
    <header class="marketplace-panel__header">
      <h2>Plugin marketplace</h2>
      <p v-if="errorMessage" class="marketplace-panel__error">
        {{ errorMessage }}
      </p>
    </header>

    <div v-if="canPublish" class="marketplace-panel__install-form">
      <label class="marketplace-panel__label">
        Plugin id
        <input
          v-model="newPluginId"
          class="marketplace-panel__input"
          type="text"
          placeholder="hello-plugin"
        />
      </label>
      <label class="marketplace-panel__label">
        Version
        <input
          v-model="newVersion"
          class="marketplace-panel__input"
          type="text"
          placeholder="1.0.0"
        />
      </label>
      <button
        type="button"
        class="marketplace-panel__button"
        :disabled="!newPluginId || !newVersion"
        @click="submitInstall"
      >
        Install
      </button>
    </div>
    <p v-else class="marketplace-panel__hint">
      Publishing requires the <code>plugin:publish</code> permission.
    </p>

    <div v-if="loading" class="marketplace-panel__loading">
      Loading installed plugins...
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
            {{ record.versions.length }} version{{ record.versions.length === 1 ? '' : 's' }}
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
              {{ version.version }}
              <span
                v-if="isActive(record.pluginId, version.version)"
                class="marketplace-panel__badge"
              >active</span>
            </span>
            <span class="marketplace-panel__actions">
              <button
                type="button"
                class="marketplace-panel__button"
                :disabled="!canInstall || isActive(record.pluginId, version.version)"
                @click="handle.activate(record.pluginId, version.version)"
              >Activate</button>
              <button
                type="button"
                class="marketplace-panel__button marketplace-panel__button--danger"
                :disabled="!canInstall || !canUninstall(record.versions.length)"
                @click="handle.uninstall(record.pluginId, version.version)"
              >Uninstall</button>
            </span>
          </li>
        </ul>
      </li>
    </ol>
    <p v-else class="marketplace-panel__empty">No installed plugins yet.</p>
  </section>
</template>

<style scoped>
.marketplace-panel {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-sm, 8px);
  padding: var(--dt-space-md, 12px);
  border: 1px solid var(--dt-border-default, #30363d);
  border-radius: var(--dt-radius-sm, 4px);
  background: var(--dt-bg-surface, #0d1117);
  color: var(--dt-text-primary, #c9d1d9);
  font: 13px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.marketplace-panel__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.marketplace-panel__header h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.marketplace-panel__error {
  margin: 0;
  color: var(--dt-color-danger, #f85149);
  font-size: 12px;
}
.marketplace-panel__install-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.marketplace-panel__label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}
.marketplace-panel__input {
  appearance: none;
  background: var(--dt-bg-base, #010409);
  border: 1px solid var(--dt-border-default, #30363d);
  color: inherit;
  padding: 4px 6px;
  border-radius: var(--dt-radius-sm, 4px);
  font: inherit;
}
.marketplace-panel__button {
  appearance: none;
  border: 1px solid var(--dt-border-default, #30363d);
  background: var(--dt-bg-surface-hover, #161b22);
  color: inherit;
  padding: 4px 10px;
  border-radius: var(--dt-radius-sm, 4px);
  font: inherit;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}
.marketplace-panel__button:hover:not(:disabled) {
  border-color: var(--dt-border-strong, #8b949e);
}
.marketplace-panel__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.marketplace-panel__button--danger {
  color: var(--dt-color-danger, #f85149);
}
.marketplace-panel__hint {
  margin: 0;
  font-size: 12px;
  color: var(--dt-text-secondary, #8b949e);
}
.marketplace-panel__loading,
.marketplace-panel__empty {
  margin: 0;
  font-size: 12px;
  color: var(--dt-text-secondary, #8b949e);
}
.marketplace-panel__list {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-sm, 8px);
  list-style: none;
  margin: 0;
  padding: 0;
}
.marketplace-panel__record {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border: 1px solid var(--dt-border-default, #30363d);
  border-radius: var(--dt-radius-sm, 4px);
}
.marketplace-panel__record-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.marketplace-panel__record-count {
  font-size: 11px;
  color: var(--dt-text-secondary, #8b949e);
}
.marketplace-panel__versions {
  display: flex;
  flex-direction: column;
  gap: 2px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.marketplace-panel__version {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 4px;
  font-size: 12px;
}
.marketplace-panel__version[data-active='true'] {
  background: var(--dt-bg-surface-hover, #161b22);
  border-radius: var(--dt-radius-sm, 4px);
}
.marketplace-panel__version-id {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.marketplace-panel__badge {
  display: inline-block;
  padding: 1px 6px;
  background: var(--dt-color-accent, #1f6feb);
  color: #fff;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.marketplace-panel__actions {
  display: inline-flex;
  gap: 4px;
}
</style>
