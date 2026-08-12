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
  <div class="admin-users-page dt-flex dt-flex-col dt-gap-lg">
    <header class="dt-flex dt-items-start dt-justify-between dt-gap-md">
      <div>
        <h1 class="dt-m-0 dt-text-xl dt-font-semi dt-text-primary">
          {{ t('admin.users.title') }}
        </h1>
        <p class="dt-m-0 dt-mt-xs dt-text-secondary dt-text-sm">
          {{ t('admin.users.subtitle') }}
        </p>
      </div>
      <DtButton variant="ghost" :disabled="isLoading" @click="refresh">
        <DtIcon name="RefreshCw" size="sm" />
        {{ t('admin.users.refresh') }}
      </DtButton>
    </header>

    <p
      v-if="errorMessage"
      class="dt-inline-flex dt-items-center dt-gap-xs dt-m-0 dt-text-danger dt-text-xs"
      role="alert"
    >
      <DtIcon name="AlertTriangle" size="sm" />
      {{ errorMessage }}
    </p>

    <div
      v-if="isLoading"
      class="dt-inline-flex dt-items-center dt-gap-sm dt-text-secondary dt-text-sm"
    >
      <DtIcon name="Loader" size="sm" />
      {{ t('admin.users.loading') }}
    </div>

    <div
      v-else-if="users && users.length > 0"
      class="dt-overflow-auto dt-border dt-rounded-md dt-bg-elevated"
    >
      <table class="admin-users-page__table dt-w-full dt-text-sm">
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
                class="admin-users-page__select dt-appearance-none dt-bg-base dt-border dt-text-primary dt-py-sm dt-px-md dt-rounded-sm dt-font-inherit"
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
  max-width: 960px;
}
.admin-users-page__table {
  border-collapse: collapse;
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
  min-width: 120px;
}
.admin-users-page__select:focus {
  outline: none;
  border-color: var(--dt-accent-primary);
}
</style>
