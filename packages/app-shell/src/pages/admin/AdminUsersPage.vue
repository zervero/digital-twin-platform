<script setup lang="ts">
/**
 * Admin users page — list tenants users and change roles.
 */
import { computed, reactive, watch } from 'vue';

import type { Role } from '@dt/contracts';
import { DtButton, DtEmptyState, DtIcon } from '@dt/ui-kit';
import { useI18n } from '@dt/i18n';

import { ADMIN_ROLES, useAdminUsers } from '../../composables/useAdminUsers.js';

const { t } = useI18n();
const { users, loading, error, savingUserId, setRoles, refresh } = useAdminUsers();

const draftRoles = reactive<Record<string, Role>>({});

watch(
  users,
  (list) => {
    if (!list) return;
    for (const user of list) {
      draftRoles[user.id] = user.roles[0] ?? 'viewer';
    }
  },
  { immediate: true },
);

const errorMessage = computed(() => error.value);
const isLoading = computed(() => loading.value);

async function onSave(userId: string): Promise<void> {
  const role = draftRoles[userId];
  if (!role) return;
  await setRoles(userId, [role]);
}

function roleLabel(role: Role): string {
  return t(`admin.users.roles.${role}`);
}
</script>

<template>
  <div class="admin-users-page">
    <header class="admin-users-page__header">
      <div>
        <h1 class="admin-users-page__title">{{ t('admin.users.title') }}</h1>
        <p class="admin-users-page__subtitle">{{ t('admin.users.subtitle') }}</p>
      </div>
      <DtButton variant="ghost" :disabled="isLoading" @click="refresh">
        <DtIcon name="RefreshCw" size="sm" />
        {{ t('admin.users.refresh') }}
      </DtButton>
    </header>

    <p v-if="errorMessage" class="admin-users-page__error" role="alert">
      <DtIcon name="AlertTriangle" size="sm" />
      {{ errorMessage }}
    </p>

    <div v-if="isLoading" class="admin-users-page__loading">
      <DtIcon name="Loader" size="sm" />
      {{ t('admin.users.loading') }}
    </div>

    <div v-else-if="users && users.length > 0" class="admin-users-page__table-wrap">
      <table class="admin-users-page__table">
        <thead>
          <tr>
            <th>{{ t('admin.users.columns.name') }}</th>
            <th>{{ t('admin.users.columns.email') }}</th>
            <th>{{ t('admin.users.columns.role') }}</th>
            <th>{{ t('admin.users.columns.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.displayName }}</td>
            <td>{{ user.email }}</td>
            <td>
              <select
                v-model="draftRoles[user.id]"
                class="admin-users-page__select"
                :aria-label="t('admin.users.columns.role')"
              >
                <option v-for="role in ADMIN_ROLES" :key="role" :value="role">
                  {{ roleLabel(role) }}
                </option>
              </select>
            </td>
            <td>
              <DtButton
                variant="primary"
                :disabled="savingUserId === user.id || draftRoles[user.id] === user.roles[0]"
                @click="onSave(user.id)"
              >
                {{ t('admin.users.saveRole') }}
              </DtButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <DtEmptyState
      v-else
      :title="t('admin.users.empty')"
      :description="t('admin.users.emptyHint')"
    />
  </div>
</template>

<style scoped>
.admin-users-page {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-lg);
  max-width: 960px;
}
.admin-users-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dt-space-md);
}
.admin-users-page__title {
  margin: 0;
  font-size: var(--dt-text-xl);
  font-weight: var(--dt-weight-semibold);
  color: var(--dt-text-primary);
}
.admin-users-page__subtitle {
  margin: var(--dt-space-xs) 0 0;
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-sm);
}
.admin-users-page__error {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-xs);
  margin: 0;
  color: var(--dt-accent-danger);
  font-size: var(--dt-text-xs);
}
.admin-users-page__loading {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-sm);
}
.admin-users-page__table-wrap {
  overflow: auto;
  border: 1px solid var(--dt-border-default);
  border-radius: var(--dt-radius-md);
  background: var(--dt-bg-elevated);
}
.admin-users-page__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--dt-text-sm);
}
.admin-users-page__table th,
.admin-users-page__table td {
  padding: var(--dt-space-md) var(--dt-space-lg);
  text-align: left;
  border-bottom: 1px solid var(--dt-border-subtle);
  color: var(--dt-text-primary);
}
.admin-users-page__table th {
  color: var(--dt-text-secondary);
  font-weight: var(--dt-weight-medium);
  font-size: var(--dt-text-xs);
}
.admin-users-page__table tr:last-child td {
  border-bottom: none;
}
.admin-users-page__select {
  appearance: none;
  background: var(--dt-bg-base);
  border: 1px solid var(--dt-border-default);
  color: var(--dt-text-primary);
  padding: var(--dt-space-sm) var(--dt-space-md);
  border-radius: var(--dt-radius-sm);
  font: inherit;
  min-width: 120px;
}
.admin-users-page__select:focus {
  outline: none;
  border-color: var(--dt-accent-primary);
}
</style>
