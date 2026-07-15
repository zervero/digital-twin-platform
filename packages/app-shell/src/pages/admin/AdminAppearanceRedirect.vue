<script setup lang="ts">
/**
 * Deep-link opener for `/admin/appearance`: opens the shared dialog
 * without leaving the admin workspace (lands on marketplace).
 */
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { useAppearanceStore } from '../../stores/appearance-store.js';

const router = useRouter();
const appearance = useAppearanceStore();

onMounted(() => {
  appearance.openDialog();
  void router.replace({ name: 'admin-marketplace' });
});
</script>

<template>
  <div class="admin-appearance-redirect" aria-hidden="true" />
</template>
