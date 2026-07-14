<script setup lang="ts">
/**
 * Admin audit page — list events filtered by type.
 */
import { computed } from 'vue';

import { DtEmptyState, DtIcon, DtTabs } from '@dt/ui-kit';
import { useI18n } from '@dt/i18n';

import {
  AUDIT_TYPE_FILTERS,
  useAdminAudit,
  type AuditTypeFilter,
} from '../../composables/useAdminAudit.js';

const { t } = useI18n();
const { items, total, typeFilter, loading, error, refresh } = useAdminAudit();

const errorMessage = computed(() => error.value);
const isLoading = computed(() => loading.value);
const rows = computed(() => items.value);

const tabs = computed(() =>
  AUDIT_TYPE_FILTERS.map((id) => ({
    id,
    label: t(`admin.audit.types.${id}`),
  })),
);

function onTab(id: string): void {
  typeFilter.value = id as AuditTypeFilter;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
</script>

<template>
  <div class="admin-audit-page">
    <header class="admin-audit-page__header">
      <div>
        <h1 class="admin-audit-page__title">{{ t('admin.audit.title') }}</h1>
        <p class="admin-audit-page__subtitle">{{ t('admin.audit.subtitle') }}</p>
      </div>
      <button type="button" class="admin-audit-page__refresh" :disabled="isLoading" @click="refresh">
        <DtIcon name="RefreshCw" size="sm" />
        {{ t('admin.audit.refresh') }}
      </button>
    </header>

    <p v-if="errorMessage" class="admin-audit-page__error" role="alert">
      <DtIcon name="AlertTriangle" size="sm" />
      {{ errorMessage }}
    </p>

    <DtTabs :model-value="typeFilter" :tabs="tabs" @update:model-value="onTab">
      <div v-if="isLoading" class="admin-audit-page__loading">
        <DtIcon name="Loader" size="sm" />
        {{ t('admin.audit.loading') }}
      </div>

      <div v-else-if="rows.length > 0" class="admin-audit-page__table-wrap">
        <p class="admin-audit-page__total">
          {{ t('admin.audit.total', { count: total }) }}
        </p>
        <table class="admin-audit-page__table">
          <thead>
            <tr>
              <th>{{ t('admin.audit.columns.time') }}</th>
              <th>{{ t('admin.audit.columns.type') }}</th>
              <th>{{ t('admin.audit.columns.actor') }}</th>
              <th>{{ t('admin.audit.columns.summary') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="event in rows" :key="event.id">
              <td>{{ formatTime(event.createdAt) }}</td>
              <td>
                <code class="admin-audit-page__type">{{ event.type }}</code>
              </td>
              <td>{{ event.actorEmail }}</td>
              <td>{{ event.summary }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <DtEmptyState
        v-else
        :title="t('admin.audit.empty')"
        :description="t('admin.audit.emptyHint')"
      />
    </DtTabs>
  </div>
</template>

<style scoped>
.admin-audit-page {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-lg);
  max-width: 1100px;
}
.admin-audit-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dt-space-md);
}
.admin-audit-page__title {
  margin: 0;
  font-size: var(--dt-text-xl);
  font-weight: var(--dt-weight-semibold);
  color: var(--dt-text-primary);
}
.admin-audit-page__subtitle {
  margin: var(--dt-space-xs) 0 0;
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-sm);
}
.admin-audit-page__refresh {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-xs);
  border: 1px solid var(--dt-border-default);
  background: var(--dt-bg-surface);
  color: var(--dt-text-primary);
  padding: var(--dt-space-sm) var(--dt-space-md);
  border-radius: var(--dt-radius-sm);
  font: inherit;
  font-size: var(--dt-text-sm);
  cursor: pointer;
}
.admin-audit-page__refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.admin-audit-page__error {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-xs);
  margin: 0;
  color: var(--dt-accent-danger);
  font-size: var(--dt-text-xs);
}
.admin-audit-page__loading {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
  padding: var(--dt-space-lg) 0;
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-sm);
}
.admin-audit-page__total {
  margin: 0 0 var(--dt-space-sm);
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-xs);
}
.admin-audit-page__table-wrap {
  overflow: auto;
  border: 1px solid var(--dt-border-default);
  border-radius: var(--dt-radius-md);
  background: var(--dt-bg-elevated);
  padding: var(--dt-space-md);
}
.admin-audit-page__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--dt-text-sm);
}
.admin-audit-page__table th,
.admin-audit-page__table td {
  padding: var(--dt-space-md) var(--dt-space-lg);
  text-align: left;
  border-bottom: 1px solid var(--dt-border-subtle);
  color: var(--dt-text-primary);
  vertical-align: top;
}
.admin-audit-page__table th {
  color: var(--dt-text-secondary);
  font-weight: var(--dt-weight-medium);
  font-size: var(--dt-text-xs);
}
.admin-audit-page__table tr:last-child td {
  border-bottom: none;
}
.admin-audit-page__type {
  font-family: var(--dt-font-mono);
  font-size: var(--dt-text-xs);
  color: var(--dt-text-secondary);
}
</style>
