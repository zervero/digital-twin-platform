<script setup lang="ts">
import type { PluginPanel } from '@dt/plugin-runtime';

defineProps<{ panel: PluginPanel }>();
</script>

<template>
  <section
    class="plugin-panel dt-mt-md dt-border-subtle dt-rounded-sm dt-bg-elevated"
    :data-plugin-id="panel.id"
  >
    <header
      class="plugin-panel__header dt-py-sm dt-px-md dt-text-xs dt-uppercase dt-tracking-wide dt-text-muted dt-border-b-subtle"
    >
      {{ panel.title }}
    </header>
    <div class="dt-p-md">
      <component :is="panel.component" />
    </div>
  </section>
</template>
