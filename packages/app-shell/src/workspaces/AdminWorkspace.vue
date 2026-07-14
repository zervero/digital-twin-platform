<script setup lang="ts">
/**
 * Admin workspace shell: DtSideNav + nested RouterView for
 * marketplace / users / appearance stubs (Task 4).
 */
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { DtSideNav } from '@dt/ui-kit';

const route = useRoute();
const router = useRouter();

const navItems = [
  { id: 'marketplace', label: 'Marketplace', icon: 'Store' as const },
  { id: 'installed', label: 'Installed', icon: 'Package' as const },
  { id: 'publish', label: 'Publish', icon: 'Upload' as const },
  { id: 'users', label: 'Users', icon: 'Users' as const },
  { id: 'audit', label: 'Audit', icon: 'ScrollText' as const },
  { id: 'tenant', label: 'Tenant', icon: 'Building2' as const },
  { id: 'appearance', label: 'Appearance', icon: 'Palette' as const },
] as const;

const activeId = computed(() => {
  const segment = route.path.split('/').filter(Boolean)[1];
  return segment ?? 'marketplace';
});

function onSelect(id: string) {
  void router.push(`/admin/${id}`);
}
</script>

<template>
  <div class="admin-workspace">
    <DtSideNav
      class="admin-workspace__nav"
      :items="[...navItems]"
      :model-value="activeId"
      aria-label="Admin sections"
      @update:model-value="onSelect"
    />
    <main class="admin-workspace__main">
      <RouterView />
    </main>
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
</style>
