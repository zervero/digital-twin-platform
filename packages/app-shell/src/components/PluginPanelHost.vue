<script setup lang="ts">
import type { PluginPanel } from '@dt/plugin-runtime';

defineProps<{ panel: PluginPanel }>();
</script>

<template>
  <section class="plugin-panel" :data-plugin-id="panel.id">
    <header class="plugin-panel__header">{{ panel.title }}</header>
    <div class="plugin-panel__body">
      <component :is="panel.component" />
    </div>
  </section>
</template>

<style scoped>
.plugin-panel {
  border: 1px solid var(--dt-border-subtle);
  border-radius: var(--dt-radius-sm);
  margin-top: var(--dt-space-md);
  background: var(--dt-bg-elevated);
}
.plugin-panel__header {
  padding: var(--dt-space-sm) var(--dt-space-md);
  font-size: var(--dt-text-xs);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--dt-text-muted);
  border-bottom: 1px solid var(--dt-border-subtle);
}
.plugin-panel__body {
  padding: var(--dt-space-md);
}
</style>
