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
  <div class="admin-tenant-page dt-flex dt-flex-col dt-gap-lg">
    <header class="dt-flex dt-flex-col dt-gap-xs">
      <h1 class="dt-m-0 dt-text-xl dt-font-semi dt-text-primary">
        {{ t('admin.tenant.title') }}
      </h1>
      <p class="dt-m-0 dt-text-secondary dt-text-sm">
        {{ t('admin.tenant.subtitle') }}
      </p>
    </header>

    <DtEmptyState
      v-if="!session"
      :title="t('admin.tenant.empty')"
      :description="t('admin.tenant.emptyHint')"
    />

    <dl v-else class="dt-m-0 dt-flex dt-flex-col dt-border dt-rounded-md dt-bg-elevated dt-overflow-hidden">
      <div class="admin-tenant-page__row dt-gap-md dt-py-md dt-px-lg dt-border-b-subtle">
        <dt class="dt-m-0 dt-text-secondary dt-text-xs dt-font-medium dt-self-center">
          {{ t('admin.tenant.fields.tenantId') }}
        </dt>
        <dd class="dt-m-0 dt-flex dt-flex-wrap dt-items-center dt-gap-sm dt-text-primary dt-text-sm">
          <template v-if="tenantId">
            <DtIcon name="Building2" size="sm" />
            <span class="dt-font-mono dt-text-xs">{{ tenantId }}</span>
          </template>
          <span v-else class="dt-text-muted dt-text-xs">
            {{ t('admin.tenant.noTenant') }}
          </span>
        </dd>
      </div>

      <div class="admin-tenant-page__row dt-gap-md dt-py-md dt-px-lg dt-border-b-subtle">
        <dt class="dt-m-0 dt-text-secondary dt-text-xs dt-font-medium dt-self-center">
          {{ t('admin.tenant.fields.user') }}
        </dt>
        <dd class="dt-m-0 dt-flex dt-flex-wrap dt-items-center dt-gap-sm dt-text-primary dt-text-sm">
          <span>{{ user?.displayName }}</span>
          <span class="dt-text-muted dt-text-xs">{{ user?.email }}</span>
        </dd>
      </div>

      <div class="admin-tenant-page__row dt-gap-md dt-py-md dt-px-lg dt-border-b-subtle">
        <dt class="dt-m-0 dt-text-secondary dt-text-xs dt-font-medium dt-self-center">
          {{ t('admin.tenant.fields.roles') }}
        </dt>
        <dd class="dt-m-0 dt-flex dt-flex-wrap dt-items-center dt-gap-sm dt-text-primary dt-text-sm">
          <ul class="dt-list-none dt-flex dt-flex-wrap dt-gap-xs" aria-label="roles">
            <li
              v-for="role in roles"
              :key="role"
              class="admin-tenant-page__chip dt-inline-flex dt-items-center dt-rounded-sm dt-border dt-bg-surface dt-text-xs dt-text-primary"
            >
              {{ t(`admin.users.roles.${role}`) }}
            </li>
          </ul>
        </dd>
      </div>

      <div class="admin-tenant-page__row dt-gap-md dt-py-md dt-px-lg dt-border-b-subtle">
        <dt class="dt-m-0 dt-text-secondary dt-text-xs dt-font-medium dt-self-center">
          {{ t('admin.tenant.fields.permissions') }}
        </dt>
        <dd class="dt-m-0 dt-flex dt-flex-wrap dt-items-center dt-gap-sm dt-text-primary dt-text-sm">
          <ul
            v-if="permissions.length > 0"
            class="dt-list-none dt-flex dt-flex-wrap dt-gap-xs"
            aria-label="permissions"
          >
            <li
              v-for="perm in permissions"
              :key="perm"
              class="admin-tenant-page__chip dt-inline-flex dt-items-center dt-rounded-sm dt-border dt-bg-surface dt-text-xs dt-text-primary dt-font-mono"
            >
              {{ perm }}
            </li>
          </ul>
          <span v-else class="dt-text-muted dt-text-xs">
            {{ t('admin.tenant.permissionsDerived') }}
          </span>
        </dd>
      </div>

      <div class="admin-tenant-page__row dt-gap-md dt-py-md dt-px-lg">
        <dt class="dt-m-0 dt-text-secondary dt-text-xs dt-font-medium dt-self-center">
          {{ t('admin.tenant.fields.expiresAt') }}
        </dt>
        <dd class="dt-m-0 dt-flex dt-flex-wrap dt-items-center dt-gap-sm dt-font-mono dt-text-xs">
          {{ formatExpiry(session.expiresAt) }}
        </dd>
      </div>
    </dl>

    <p class="dt-m-0 dt-text-muted dt-text-xs dt-leading-normal">
      {{ t('admin.tenant.note') }}
    </p>
  </div>
</template>

<style scoped>
.admin-tenant-page {
  max-width: 720px;
}
.admin-tenant-page__row {
  display: grid;
  grid-template-columns: 140px 1fr;
}
.admin-tenant-page__row:last-child {
  border-bottom: none;
}
.admin-tenant-page__chip {
  padding: 2px var(--dt-space-sm);
}
</style>
