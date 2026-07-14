<script setup lang="ts">
/**
 * Admin workspace shell: DtSideNav + nested RouterView + overview rail.
 */
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { DtSideNav, DtStatCard } from '@dt/ui-kit';
import { useI18n } from '@dt/i18n';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const navItems = computed(() => [
  { id: 'marketplace', label: t('admin.nav.marketplace'), icon: 'Store' as const },
  { id: 'installed', label: t('admin.nav.installed'), icon: 'Package' as const },
  { id: 'publish', label: t('admin.nav.publish'), icon: 'Upload' as const },
  { id: 'users', label: t('admin.nav.users'), icon: 'Users' as const },
  { id: 'audit', label: t('admin.nav.audit'), icon: 'ScrollText' as const },
  { id: 'tenant', label: t('admin.nav.tenant'), icon: 'Building2' as const },
  { id: 'appearance', label: t('admin.nav.appearance'), icon: 'Palette' as const },
]);

const activeId = computed(() => {
  const segment = route.path.split('/').filter(Boolean)[1];
  return segment ?? 'marketplace';
});

function onSelect(id: string) {
  if (id === 'appearance') {
    void router.push({ name: 'settings-appearance' });
    return;
  }
  void router.push(`/admin/${id}`);
}
</script>

<template>
  <div class="admin-workspace">
    <DtSideNav
      class="admin-workspace__nav"
      :items="navItems"
      :model-value="activeId"
      :aria-label="t('admin.nav.ariaLabel')"
      @update:model-value="onSelect"
    />
    <main class="admin-workspace__main">
      <RouterView />
    </main>
    <aside class="admin-workspace__overview" :aria-label="t('admin.overview.ariaLabel')">
      <h2 class="admin-workspace__overview-title">{{ t('admin.overview.title') }}</h2>
      <p class="admin-workspace__overview-subtitle">{{ t('admin.overview.subtitle') }}</p>
      <DtStatCard
        :label="t('admin.overview.modulesLabel')"
        :value="navItems.length"
        :hint="t('admin.overview.modulesHint')"
      />
    </aside>
  </div>
</template>

<style scoped>
.admin-workspace {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
}
.admin-workspace__nav {
  flex: 0 0 220px;
  min-height: 0;
}
.admin-workspace__main {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: var(--dt-space-lg);
  background: var(--dt-bg-base);
}
.admin-workspace__overview {
  flex: 0 0 240px;
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-md);
  padding: var(--dt-space-lg);
  border-left: 1px solid var(--dt-border-subtle);
  background: var(--dt-bg-elevated);
  min-height: 0;
  overflow: auto;
}
.admin-workspace__overview-title {
  margin: 0;
  font-size: var(--dt-text-md);
  font-weight: var(--dt-weight-semibold);
  color: var(--dt-text-primary);
}
.admin-workspace__overview-subtitle {
  margin: 0;
  font-size: var(--dt-text-xs);
  color: var(--dt-text-secondary);
  line-height: var(--dt-line-normal);
}
</style>
