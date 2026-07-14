<script setup lang="ts">
/**
 * Thin admin page wrapper — MarketplacePanel lived in the ops
 * right rail before Task 4; it now owns `/admin/marketplace`.
 */
import MarketplacePanel from '../../components/MarketplacePanel.vue';
</script>

<template>
  <div class="admin-marketplace-page">
    <h1 class="admin-marketplace-page__title">Marketplace</h1>
    <MarketplacePanel />
  </div>
</template>

<style scoped>
.admin-marketplace-page {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-md);
  max-width: 720px;
}
.admin-marketplace-page__title {
  margin: 0;
  font-size: var(--dt-text-xl);
  font-weight: var(--dt-weight-semibold);
  color: var(--dt-text-primary);
}
</style>
