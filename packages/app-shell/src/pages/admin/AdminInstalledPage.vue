<script setup lang="ts">
/**
 * Admin installed plugins — versions with Activate / Uninstall.
 */
import { computed } from 'vue';

import { DtAppCard, DtButton, DtEmptyState, DtIcon } from '@dt/ui-kit';
import { useI18n } from '@dt/i18n';

import { useAdminMarketplace } from '../../composables/useAdminMarketplace.js';

const { t } = useI18n();
const market = useAdminMarketplace();

const errorMessage = computed(() => market.error.value);
const loading = computed(() => market.loading.value);
const canInstall = computed(() => market.canInstall.value);

const cards = computed(() =>
  market.installed.value.flatMap((record) =>
    record.versions.map((version) => ({
      pluginId: record.pluginId,
      version: version.version,
      active: version.active,
      versionCount: record.versions.length,
    })),
  ),
);

function canUninstall(versionCount: number): boolean {
  return versionCount > 1;
}

async function onActivate(pluginId: string, version: string): Promise<void> {
  await market.activate(pluginId, version);
  await market.refreshAll();
}

async function onUninstall(pluginId: string, version: string): Promise<void> {
  await market.uninstall(pluginId, version);
  await market.refreshAll();
}
</script>

<template>
  <div class="admin-installed-page">
    <header class="admin-installed-page__header">
      <h1 class="admin-installed-page__title">{{ t('marketplace.installed.title') }}</h1>
      <p class="admin-installed-page__subtitle">{{ t('marketplace.installed.subtitle') }}</p>
      <p v-if="errorMessage" class="admin-installed-page__error" role="alert">
        <DtIcon name="AlertTriangle" size="sm" />
        {{ errorMessage }}
      </p>
    </header>

    <div v-if="loading" class="admin-installed-page__loading">
      <DtIcon name="Loader" size="sm" />
      {{ t('marketplace.loadingInstalled') }}
    </div>

    <div v-else-if="cards.length > 0" class="admin-installed-page__grid">
      <DtAppCard
        v-for="card in cards"
        :key="`${card.pluginId}@${card.version}`"
        :title="card.pluginId"
        :description="`${t('marketplace.version')} ${card.version}`"
        :tag="card.active ? t('marketplace.active') : undefined"
      >
        <template #action>
          <DtButton
            variant="primary"
            :disabled="!canInstall || card.active"
            @click="onActivate(card.pluginId, card.version)"
          >
            {{ t('marketplace.activate') }}
          </DtButton>
          <DtButton
            variant="danger"
            :disabled="!canInstall || !canUninstall(card.versionCount)"
            @click="onUninstall(card.pluginId, card.version)"
          >
            {{ t('marketplace.uninstall') }}
          </DtButton>
        </template>
      </DtAppCard>
    </div>

    <DtEmptyState
      v-else
      :title="t('marketplace.empty')"
      :description="t('marketplace.installed.emptyHint')"
    />
  </div>
</template>

<style scoped>
.admin-installed-page {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-lg);
  max-width: 1100px;
}
.admin-installed-page__header {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-xs);
}
.admin-installed-page__title {
  margin: 0;
  font-size: var(--dt-text-xl);
  font-weight: var(--dt-weight-semibold);
  color: var(--dt-text-primary);
}
.admin-installed-page__subtitle {
  margin: 0;
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-sm);
}
.admin-installed-page__error {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-xs);
  margin: 0;
  color: var(--dt-accent-danger);
  font-size: var(--dt-text-xs);
}
.admin-installed-page__loading {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-sm);
}
.admin-installed-page__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--dt-space-lg);
}
</style>
