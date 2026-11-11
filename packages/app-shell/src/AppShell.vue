<script setup lang="ts">
/**
 * App shell layout host: top chrome + routed workspaces + global dialogs.
 *
 * Ops and admin bodies live under `<RouterView />` (see
 * `createAppRouter`). Mode switching in TopToolbar is Task 5.
 * Auth session sync re-gates plugins and reloads twin data after
 * login/logout so the UI matches the new permissions without a
 * hard refresh.
 *
 * `DtConfigProvider` forwards Element ConfigProvider; we map
 * `@dt/i18n` → Element `Language` here (SPEC 0003).
 */
import { computed } from 'vue';
import { RouterView } from 'vue-router';

import { DtConfigProvider, elementLocaleOf } from '@dt/ui-kit';
import { useI18n } from '@dt/i18n';

import './styles/utilities.css';

import TopToolbar from './components/TopToolbar.vue';
import AppearanceSettingsDialog from './components/AppearanceSettingsDialog.vue';
import { useAuthSessionSync } from './composables/useAuthSessionSync.js';

useAuthSessionSync();

const { locale } = useI18n();
const elementLocale = computed(() => elementLocaleOf(locale.value));
</script>

<template>
  <DtConfigProvider :locale="elementLocale">
    <div
      class="dt-flex dt-flex-col dt-h-full dt-w-full dt-bg-base dt-text-primary dt-font-ui dt-text-md dt-leading-normal"
    >
      <TopToolbar />
      <RouterView />
      <AppearanceSettingsDialog />
    </div>
  </DtConfigProvider>
</template>
