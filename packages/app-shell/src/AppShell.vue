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

import './styles/utilities.css';

import TopToolbar from './components/TopToolbar.vue';
import AppearanceSettingsDialog from './components/AppearanceSettingsDialog.vue';
import { useAuthSessionSync } from './composables/useAuthSessionSync.js';

useAuthSessionSync();
</script>

<template>
  <div
    class="dt-flex dt-flex-col dt-h-full dt-w-full dt-bg-base dt-text-primary dt-font-ui dt-text-md dt-leading-normal"
  >
    <TopToolbar />
    <RouterView />
    <AppearanceSettingsDialog />
  </div>
</template>
