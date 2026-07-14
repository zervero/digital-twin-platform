/**
 * Host wiring for admin marketplace pages.
 *
 * Owns BFF base URL + auth token → MarketplaceApi, and the
 * tenant-scoped useMarketplaceInstall handle used by the
 * card grid / installed / publish surfaces.
 */

import { computed, inject, onMounted, ref, type Ref } from 'vue';

import type { Permission } from '@dt/contracts';

import { BffBaseUrlKey } from './useOIDCStart.js';
import { usePermission } from './usePermission.js';
import {
  createFetchMarketplaceApi,
  isOfficialCatalogVendor,
  useMarketplaceInstall,
  type CatalogPlugin,
  type MarketplaceApi,
  type UseMarketplaceInstallHandle,
} from './useMarketplaceInstall.js';
import { useAuthStore } from '../stores/auth-store.js';

export type MarketplaceFilterId = 'all' | 'official' | 'thirdParty' | 'installed';

export interface UseAdminMarketplaceHandle extends UseMarketplaceInstallHandle {
  api: MarketplaceApi;
  catalog: Ref<readonly CatalogPlugin[]>;
  canInstall: ReturnType<typeof usePermission>;
  canPublish: ReturnType<typeof usePermission>;
  tenantId: Ref<string>;
  refreshAll: () => Promise<void>;
  filterCatalog: (filter: MarketplaceFilterId) => CatalogPlugin[];
  latestVersion: (plugin: CatalogPlugin) => string | undefined;
  isPluginInstalled: (pluginId: string) => boolean;
  isVersionActive: (pluginId: string, version: string) => boolean;
}

export function useAdminMarketplace(): UseAdminMarketplaceHandle {
  const authStore = useAuthStore();
  const bffBaseUrl = inject(BffBaseUrlKey, 'http://localhost:3001');

  const tenantId = computed<string>(() => {
    const state = authStore.state;
    if (state.kind === 'authenticated') {
      return state.session.tenantId ?? '';
    }
    return '';
  });

  const api = createFetchMarketplaceApi({
    baseUrl: bffBaseUrl,
    getAuthToken: () => authStore.token,
  });
  const handle = useMarketplaceInstall(api, tenantId);

  const catalog = ref<readonly CatalogPlugin[]>([]);
  const canInstall = usePermission('plugin:install' as Permission);
  const canPublish = usePermission('plugin:publish' as Permission);

  async function refreshAll(): Promise<void> {
    if (!tenantId.value) {
      catalog.value = [];
      return;
    }
    const [_, listed] = await Promise.all([
      handle.refresh(),
      api.listCatalog().catch((err: unknown) => {
        handle.error.value = err instanceof Error ? err.message : String(err);
        return [] as const;
      }),
    ]);
    catalog.value = listed;
  }

  function isPluginInstalled(pluginId: string): boolean {
    return handle.installed.value.some((r) => r.pluginId === pluginId);
  }

  function isVersionActive(pluginId: string, version: string): boolean {
    return handle.activeByPlugin.value.get(pluginId) === version;
  }

  function latestVersion(plugin: CatalogPlugin): string | undefined {
    return plugin.versions[plugin.versions.length - 1]?.version;
  }

  function filterCatalog(filter: MarketplaceFilterId): CatalogPlugin[] {
    const items = [...catalog.value];
    switch (filter) {
      case 'official':
        return items.filter((p) => isOfficialCatalogVendor(p.vendor));
      case 'thirdParty':
        return items.filter((p) => !isOfficialCatalogVendor(p.vendor));
      case 'installed':
        return items.filter((p) => isPluginInstalled(p.id));
      case 'all':
      default:
        return items;
    }
  }

  onMounted(async () => {
    if (tenantId.value) await refreshAll();
  });

  return {
    ...handle,
    api,
    catalog,
    canInstall,
    canPublish,
    tenantId,
    refreshAll,
    filterCatalog,
    latestVersion,
    isPluginInstalled,
    isVersionActive,
  };
}
