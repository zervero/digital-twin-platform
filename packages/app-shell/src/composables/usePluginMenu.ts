import { computed, type ComputedRef } from 'vue';

import type { PluginMenuItem } from '@dt/plugin-runtime';

import { usePluginStore } from '../stores/plugin-store.js';

export function usePluginMenu(): ComputedRef<PluginMenuItem[]> {
  const store = usePluginStore();
  return computed(() => store.menuItems);
}
