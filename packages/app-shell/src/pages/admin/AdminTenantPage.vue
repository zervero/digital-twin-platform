<script setup lang="ts">
/**
 * Admin tenant page — honest session/tenant context from auth store.
 *
 * No tenant admin BFF exists yet; this page only surfaces what the
 * current AuthSession already carries (tenantId, user, roles,
 * permissions, expiry). It does not invent org/settings APIs.
 */
import { computed } from 'vue';
import { storeToRefs } from 'pinia';

import { DtEmptyState, DtIcon } from '@dt/ui-kit';
import { useI18n } from '@dt/i18n';

import { useAuthStore } from '../../stores/auth-store.js';

const { t } = useI18n();
const authStore = useAuthStore();
const { state } = storeToRefs(authStore);

const session = computed(() =>
  state.value.kind === 'authenticated' ? state.value.session : null,
);

const tenantId = computed(() => session.value?.tenantId ?? null);
const user = computed(() => session.value?.user ?? null);
const roles = computed(() => user.value?.roles ?? []);
const permissions = computed(() => {
  const perms = session.value?.permissions;
  return perms ? [...perms] : [];
});

function formatExpiry(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
</script>

<template>
  <div class="admin-tenant-page">
    <header class="admin-tenant-page__header">
      <h1 class="admin-tenant-page__title">{{ t('admin.tenant.title') }}</h1>
      <p class="admin-tenant-page__subtitle">{{ t('admin.tenant.subtitle') }}</p>
    </header>

    <DtEmptyState
      v-if="!session"
      :title="t('admin.tenant.empty')"
      :description="t('admin.tenant.emptyHint')"
    />

    <dl v-else class="admin-tenant-page__dl">
      <div class="admin-tenant-page__row">
        <dt>{{ t('admin.tenant.fields.tenantId') }}</dt>
        <dd>
          <template v-if="tenantId">
            <DtIcon name="Building2" size="sm" />
            <span class="admin-tenant-page__mono">{{ tenantId }}</span>
          </template>
          <span v-else class="admin-tenant-page__muted">
            {{ t('admin.tenant.noTenant') }}
          </span>
        </dd>
      </div>

      <div class="admin-tenant-page__row">
        <dt>{{ t('admin.tenant.fields.user') }}</dt>
        <dd>
          <span>{{ user?.displayName }}</span>
          <span class="admin-tenant-page__muted">{{ user?.email }}</span>
        </dd>
      </div>

      <div class="admin-tenant-page__row">
        <dt>{{ t('admin.tenant.fields.roles') }}</dt>
        <dd>
          <ul class="admin-tenant-page__chips" aria-label="roles">
            <li v-for="role in roles" :key="role" class="admin-tenant-page__chip">
              {{ t(`admin.users.roles.${role}`) }}
            </li>
          </ul>
        </dd>
      </div>

      <div class="admin-tenant-page__row">
        <dt>{{ t('admin.tenant.fields.permissions') }}</dt>
        <dd>
          <ul
            v-if="permissions.length > 0"
            class="admin-tenant-page__chips"
            aria-label="permissions"
          >
            <li
              v-for="perm in permissions"
              :key="perm"
              class="admin-tenant-page__chip admin-tenant-page__chip--mono"
            >
              {{ perm }}
            </li>
          </ul>
          <span v-else class="admin-tenant-page__muted">
            {{ t('admin.tenant.permissionsDerived') }}
          </span>
        </dd>
      </div>

      <div class="admin-tenant-page__row">
        <dt>{{ t('admin.tenant.fields.expiresAt') }}</dt>
        <dd class="admin-tenant-page__mono">
          {{ formatExpiry(session.expiresAt) }}
        </dd>
      </div>
    </dl>

    <p class="admin-tenant-page__note">{{ t('admin.tenant.note') }}</p>
  </div>
</template>

<style scoped>
.admin-tenant-page {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-lg);
  max-width: 720px;
}
.admin-tenant-page__header {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-xs);
}
.admin-tenant-page__title {
  margin: 0;
  font-size: var(--dt-text-xl);
  font-weight: var(--dt-weight-semibold);
  color: var(--dt-text-primary);
}
.admin-tenant-page__subtitle {
  margin: 0;
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-sm);
}
.admin-tenant-page__dl {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--dt-border-default);
  border-radius: var(--dt-radius-md);
  background: var(--dt-bg-elevated);
  overflow: hidden;
}
.admin-tenant-page__row {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: var(--dt-space-md);
  padding: var(--dt-space-md) var(--dt-space-lg);
  border-bottom: 1px solid var(--dt-border-subtle);
}
.admin-tenant-page__row:last-child {
  border-bottom: none;
}
.admin-tenant-page__row dt {
  margin: 0;
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-xs);
  font-weight: var(--dt-weight-medium);
  align-self: center;
}
.admin-tenant-page__row dd {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dt-space-sm);
  color: var(--dt-text-primary);
  font-size: var(--dt-text-sm);
}
.admin-tenant-page__mono {
  font-family: var(--dt-font-mono);
  font-size: var(--dt-text-xs);
}
.admin-tenant-page__muted {
  color: var(--dt-text-muted);
  font-size: var(--dt-text-xs);
}
.admin-tenant-page__chips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--dt-space-xs);
}
.admin-tenant-page__chip {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--dt-space-sm);
  border-radius: var(--dt-radius-sm);
  border: 1px solid var(--dt-border-default);
  background: var(--dt-bg-surface);
  font-size: var(--dt-text-xs);
  color: var(--dt-text-primary);
}
.admin-tenant-page__chip--mono {
  font-family: var(--dt-font-mono);
}
.admin-tenant-page__note {
  margin: 0;
  color: var(--dt-text-muted);
  font-size: var(--dt-text-xs);
  line-height: var(--dt-line-normal);
}
</style>
