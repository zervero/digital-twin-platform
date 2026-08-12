<script setup lang="ts">
/**
 * Admin workspace shell: DtSideNav + nested RouterView + overview rail.
 * Appearance opens the shared dialog (does not navigate away).
 */
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { DtSideNav, DtStatCard } from '@dt/ui-kit';
import { useI18n } from '@dt/i18n';

import { useAppearanceStore } from '../stores/appearance-store.js';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const appearance = useAppearanceStore();

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
  if (appearance.dialogOpen) return 'appearance';
  const segment = route.path.split('/').filter(Boolean)[1];
  return segment ?? 'marketplace';
});

function onSelect(id: string) {
  if (id === 'appearance') {
    appearance.openDialog();
    return;
  }
  void router.push(`/admin/${id}`);
}
</script>

<template>
  <div class="admin-workspace dt-flex dt-flex-1 dt-min-h-0 dt-min-w-0">
    <DtSideNav
      class="admin-workspace__nav"
      :items="navItems"
      :model-value="activeId"
      :aria-label="t('admin.nav.ariaLabel')"
      @update:model-value="onSelect"
    />
    <main
      class="admin-workspace__main dt-flex-1 dt-min-w-0 dt-min-h-0 dt-overflow-auto dt-p-lg dt-bg-base"
    >
      <RouterView />
    </main>
    <aside
      class="admin-workspace__overview dt-flex dt-flex-col dt-gap-md dt-p-lg dt-border-l-subtle dt-bg-elevated dt-min-h-0 dt-overflow-auto"
      :aria-label="t('admin.overview.ariaLabel')"
    >
      <h2 class="dt-m-0 dt-text-md dt-font-semi dt-text-primary">
        {{ t('admin.overview.title') }}
      </h2>
      <p class="dt-m-0 dt-text-xs dt-text-secondary dt-leading-normal">
        {{ t('admin.overview.subtitle') }}
      </p>
      <DtStatCard
        :label="t('admin.overview.modulesLabel')"
        :value="navItems.length"
        :hint="t('admin.overview.modulesHint')"
      />
    </aside>
  </div>
</template>

<style scoped>
/* Fixed rail widths — one-off layout */
.admin-workspace__nav {
  flex: 0 0 220px;
  min-height: 0;
}
.admin-workspace__overview {
  flex: 0 0 240px;
}
</style>
