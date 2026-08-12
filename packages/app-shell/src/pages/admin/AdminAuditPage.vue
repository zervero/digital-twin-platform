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
  <div class="admin-audit-page dt-flex dt-flex-col dt-gap-lg">
    <header class="dt-flex dt-items-start dt-justify-between dt-gap-md">
      <div>
        <h1 class="dt-m-0 dt-text-xl dt-font-semi dt-text-primary">
          {{ t('admin.audit.title') }}
        </h1>
        <p class="dt-m-0 dt-mt-xs dt-text-secondary dt-text-sm">
          {{ t('admin.audit.subtitle') }}
        </p>
      </div>
      <button
        type="button"
        class="admin-audit-page__refresh dt-appearance-none dt-inline-flex dt-items-center dt-gap-xs dt-border dt-bg-surface dt-text-primary dt-py-sm dt-px-md dt-rounded-sm dt-font-inherit dt-text-sm dt-pointer"
        :disabled="isLoading"
        @click="refresh"
      >
        <DtIcon name="RefreshCw" size="sm" />
        {{ t('admin.audit.refresh') }}
      </button>
    </header>

    <p
      v-if="errorMessage"
      class="dt-inline-flex dt-items-center dt-gap-xs dt-m-0 dt-text-danger dt-text-xs"
      role="alert"
    >
      <DtIcon name="AlertTriangle" size="sm" />
      {{ errorMessage }}
    </p>

    <DtTabs :model-value="typeFilter" :tabs="tabs" @update:model-value="onTab">
      <div
        v-if="isLoading"
        class="dt-inline-flex dt-items-center dt-gap-sm dt-py-lg dt-text-secondary dt-text-sm"
      >
        <DtIcon name="Loader" size="sm" />
        {{ t('admin.audit.loading') }}
      </div>

      <div
        v-else-if="rows.length > 0"
        class="dt-overflow-auto dt-border dt-rounded-md dt-bg-elevated dt-p-md"
      >
        <p class="dt-mt-0 dt-mb-sm dt-ml-0 dt-text-secondary dt-text-xs">
          {{ t('admin.audit.total', { count: total }) }}
        </p>
        <table class="admin-audit-page__table dt-w-full dt-text-sm">
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
                <code class="dt-font-mono dt-text-xs dt-text-secondary">{{ event.type }}</code>
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
  max-width: 1100px;
}
.admin-audit-page__refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.admin-audit-page__table {
  border-collapse: collapse;
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
</style>
