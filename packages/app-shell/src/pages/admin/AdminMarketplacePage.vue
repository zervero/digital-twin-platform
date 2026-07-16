<script setup lang="ts">
/**
 * Admin app marketplace — filter tabs + DtAppCard grid.
 * Install / Activate actions are gated by plugin permissions.
 */
import { computed, ref } from 'vue';

import { DtAppCard, DtButton, DtEmptyState, DtIcon, DtTabs } from '@dt/ui-kit';
import { useI18n } from '@dt/i18n';

import {
  useAdminMarketplace,
  type MarketplaceFilterId,
} from '../../composables/useAdminMarketplace.js';

const { t } = useI18n();
const market = useAdminMarketplace();

const filter = ref<MarketplaceFilterId>('all');
const errorMessage = computed(() => market.error.value);
const loading = computed(() => market.loading.value);
const canInstall = computed(() => market.canInstall.value);

const tabs = computed(() => [
  { id: 'all', label: t('marketplace.filter.all') },
  { id: 'official', label: t('marketplace.filter.official') },
  { id: 'thirdParty', label: t('marketplace.filter.thirdParty') },
  { id: 'installed', label: t('marketplace.filter.installed') },
]);

const visible = computed(() => market.filterCatalog(filter.value));

async function onInstall(pluginId: string, version: string): Promise<void> {
  await market.install(pluginId, version);
  await market.refreshAll();
}

async function onActivate(pluginId: string, version: string): Promise<void> {
  await market.activate(pluginId, version);
  await market.refreshAll();
}

function cardTag(pluginId: string, version: string | undefined): string | undefined {
  if (!version) return undefined;
  if (market.isVersionActive(pluginId, version)) return t('marketplace.active');
  if (market.isPluginInstalled(pluginId)) return t('marketplace.tagInstalled');
  return undefined;
}
</script>

<template>
  <div class="admin-marketplace-page">
    <header class="admin-marketplace-page__header">
      <h1 class="admin-marketplace-page__title">{{ t('marketplace.admin.title') }}</h1>
      <p class="admin-marketplace-page__subtitle">{{ t('marketplace.admin.subtitle') }}</p>
      <p v-if="errorMessage" class="admin-marketplace-page__error" role="alert">
        <DtIcon name="AlertTriangle" size="sm" />
        {{ errorMessage }}
      </p>
    </header>

    <DtTabs v-model="filter" :tabs="tabs">
      <div v-if="loading" class="admin-marketplace-page__loading">
        <DtIcon name="Loader" size="sm" />
        {{ t('marketplace.loadingInstalled') }}
      </div>

      <div v-else-if="visible.length > 0" class="admin-marketplace-page__grid">
        <DtAppCard
          v-for="plugin in visible"
          :key="plugin.id"
          :title="plugin.name"
          :description="plugin.description || plugin.vendor"
          :tag="cardTag(plugin.id, market.latestVersion(plugin))"
        >
          <template #action>
            <template v-if="market.latestVersion(plugin)">
              <DtButton
                v-if="!market.isPluginInstalled(plugin.id)"
                variant="primary"
                :disabled="!canInstall"
                @click="onInstall(plugin.id, market.latestVersion(plugin)!)"
              >
                {{ t('marketplace.install') }}
              </DtButton>
              <DtButton
                v-else-if="!market.isVersionActive(plugin.id, market.latestVersion(plugin)!)"
                variant="primary"
                :disabled="!canInstall"
                @click="onActivate(plugin.id, market.latestVersion(plugin)!)"
              >
                {{ t('marketplace.activate') }}
              </DtButton>
              <span
                v-else
                class="admin-marketplace-page__active-label"
              >{{ t('marketplace.active') }}</span>
            </template>
          </template>
        </DtAppCard>
      </div>

      <DtEmptyState
        v-else
        :title="t('marketplace.empty')"
        :description="t('marketplace.admin.emptyHint')"
      />
    </DtTabs>
  </div>
</template>

<style scoped>
.admin-marketplace-page {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-lg);
  max-width: 1100px;
}
.admin-marketplace-page__header {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-xs);
}
.admin-marketplace-page__title {
  margin: 0;
  font-size: var(--dt-text-xl);
  font-weight: var(--dt-weight-semibold);
  color: var(--dt-text-primary);
}
.admin-marketplace-page__subtitle {
  margin: 0;
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-sm);
}
.admin-marketplace-page__error {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-xs);
  margin: 0;
  color: var(--dt-accent-danger);
  font-size: var(--dt-text-xs);
}
.admin-marketplace-page__loading {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
  padding: var(--dt-space-xl) 0;
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-sm);
}
.admin-marketplace-page__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--dt-space-lg);
  padding: var(--dt-space-lg) 0;
}
.admin-marketplace-page__active-label {
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-sm);
  font-weight: var(--dt-weight-medium);
}
</style>
