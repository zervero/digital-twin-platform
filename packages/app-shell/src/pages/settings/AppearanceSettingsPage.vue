<script setup lang="ts">
/**
 * Deep-link opener for `/settings/appearance`: opens the shared
 * dialog and returns the user to `/ops` (dialog stays open).
 */
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { useAppearanceStore } from '../../stores/appearance-store.js';

const router = useRouter();
const appearance = useAppearanceStore();

onMounted(() => {
  appearance.openDialog();
  void router.replace('/ops');
});
</script>

<template>
  <div class="appearance-settings-redirect" aria-hidden="true" />
</template>
