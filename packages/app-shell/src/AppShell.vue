<script setup lang="ts">
/**
 * App shell layout host: top chrome + routed workspaces + global dialogs.
 *
 * Ops and admin bodies live under `<RouterView />` (see
 * `createAppRouter`). Mode switching in TopToolbar is Task 5.
 * Auth session sync re-gates plugins and reloads twin data after
 * login/logout so the UI matches the new permissions without a
 * hard refresh.
 */
import { RouterView } from 'vue-router';

import TopToolbar from './components/TopToolbar.vue';
import AppearanceSettingsDialog from './components/AppearanceSettingsDialog.vue';
import { useAuthSessionSync } from './composables/useAuthSessionSync.js';

useAuthSessionSync();
</script>

<template>
  <div class="app-shell">
    <TopToolbar />
    <RouterView />
    <AppearanceSettingsDialog />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: var(--dt-bg-base);
  color: var(--dt-text-primary);
  font-family: var(--dt-font-ui);
  font-size: var(--dt-text-md);
  line-height: var(--dt-line-normal);
}
</style>
