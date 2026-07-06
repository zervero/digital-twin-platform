<script setup lang="ts">
import { defineProps } from 'vue';
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
  border: 1px solid #21262d;
  border-radius: 4px;
  margin-top: 8px;
  background: #0d1117;
}
.plugin-panel__header {
  padding: 6px 8px;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #8b949e;
  border-bottom: 1px solid #21262d;
}
.plugin-panel__body {
  padding: 8px;
}
</style>
