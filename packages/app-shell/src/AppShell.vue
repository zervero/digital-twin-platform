<script setup lang="ts">
/**
 * App shell layout host: top chrome + routed workspaces.
 *
 * Ops and admin bodies live under `<RouterView />` (see
 * `createAppRouter`). Mode switching in TopToolbar is Task 5.
 */
import { RouterView } from 'vue-router';

import TopToolbar from './components/TopToolbar.vue';
</script>

<template>
  <div class="app-shell">
    <TopToolbar />
    <RouterView />
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
