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
  <div class="admin-marketplace-page dt-flex dt-flex-col dt-gap-lg">
    <header class="dt-flex dt-flex-col dt-gap-xs">
      <h1 class="dt-m-0 dt-text-xl dt-font-semi dt-text-primary">
        {{ t('marketplace.admin.title') }}
      </h1>
      <p class="dt-m-0 dt-text-secondary dt-text-sm">
        {{ t('marketplace.admin.subtitle') }}
      </p>
      <p
        v-if="errorMessage"
        class="dt-inline-flex dt-items-center dt-gap-xs dt-m-0 dt-text-danger dt-text-xs"
        role="alert"
      >
        <DtIcon name="AlertTriangle" size="sm" />
        {{ errorMessage }}
      </p>
    </header>

    <DtTabs v-model="filter" :tabs="tabs">
      <div
        v-if="loading"
        class="dt-inline-flex dt-items-center dt-gap-sm dt-py-xl dt-text-secondary dt-text-sm"
      >
        <DtIcon name="Loader" size="sm" />
        {{ t('marketplace.loadingInstalled') }}
      </div>

      <div v-else-if="visible.length > 0" class="admin-marketplace-page__grid dt-gap-lg dt-py-lg">
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
              <span v-else class="dt-text-secondary dt-text-sm dt-font-medium">{{
                t('marketplace.active')
              }}</span>
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
  max-width: 1100px;
}
.admin-marketplace-page__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}
</style>
