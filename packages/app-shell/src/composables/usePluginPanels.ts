import { computed, type ComputedRef } from 'vue';

import type { PluginPanel } from '@dt/plugin-runtime';

import { usePluginStore } from '../stores/plugin-store.js';

export function usePluginPanels(): ComputedRef<PluginPanel[]> {
  const store = usePluginStore();
  return computed(() => store.panels);
}
