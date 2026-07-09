/**
 * V3.4 marketplace install composable.
 *
 * Bridges the BFF's `/api/plugins/:id/installed`
 * endpoints to the host's plugin store. Each active
 * installed version becomes a `PluginRegistration`
 * the store merges into the entries view; the runtime
 * stays host-agnostic, this composable is the host-
 * side glue.
 *
 * The composable does NOT do dynamic JS imports. It
 * reads the manifest from the BFF and constructs a
 * stub registration that surfaces the manifest's
 * name + version in the `panels` derivation. V3.4.x
 * adds real dynamic loading (URL-based `import()`
 * behind a CSP and signature re-check).
 *
 * The composable takes a `MarketplaceApi` (the
 * transport surface) and a `Ref<string>` tenantId
 * (the scope to drive install / activate /
 * uninstall against). The host owns both.
 */

import { computed, ref, type ComputedRef, type Ref } from 'vue';

import type {
  InstallRecord,
  InstalledPluginVersion,
  PluginRegistration,
} from '@dt/plugin-runtime';
import { validatePluginManifest } from '@dt/plugin-runtime';

import { usePluginStore } from '../stores/plugin-store.js';

export interface MarketplaceApi {
  listInstalled(tenantId: string): Promise<readonly InstallRecord[]>;
  install(
    tenantId: string,
    pluginId: string,
    version: string,
  ): Promise<InstalledPluginVersion>;
  activate(
    tenantId: string,
    pluginId: string,
    version: string,
  ): Promise<InstalledPluginVersion>;
  uninstall(
    tenantId: string,
    pluginId: string,
    version: string,
  ): Promise<void>;
  /**
   * Read the manifest for an installed version. V3.4
   * returns `null` from the BFF (the manifest is
   * written on disk at publish time but not exposed
   * via a read endpoint yet); the composable skips
   * building a registration when the read returns
   * null.
   */
  readManifest(
    tenantId: string,
    pluginId: string,
    version: string,
  ): Promise<unknown>;
}

export interface UseMarketplaceInstallHandle {
  installed: Ref<readonly InstallRecord[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  /** Map of pluginId -> active version, derived from `installed`. */
  activeByPlugin: ComputedRef<ReadonlyMap<string, string>>;
  refresh: () => Promise<void>;
  install: (pluginId: string, version: string) => Promise<void>;
  activate: (pluginId: string, version: string) => Promise<void>;
  uninstall: (pluginId: string, version: string) => Promise<void>;
}

export function useMarketplaceInstall(
  api: MarketplaceApi,
  tenantId: Ref<string>,
): UseMarketplaceInstallHandle {
  const installed = ref<readonly InstallRecord[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const pluginStore = usePluginStore();

  async function refresh(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const records = await api.listInstalled(tenantId.value);
      installed.value = records;
      const regs = await buildRegistrations(records, api, tenantId.value);
      pluginStore.replaceMarketplaceRegistrations(regs);
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      // Clear the marketplace slice on failure so the
      // host does not display stale data after a
      // network error.
      pluginStore.replaceMarketplaceRegistrations([]);
    } finally {
      loading.value = false;
    }
  }

  async function install(pluginId: string, version: string): Promise<void> {
    await api.install(tenantId.value, pluginId, version);
    await refresh();
  }

  async function activate(pluginId: string, version: string): Promise<void> {
    await api.activate(tenantId.value, pluginId, version);
    await refresh();
  }

  async function uninstall(pluginId: string, version: string): Promise<void> {
    await api.uninstall(tenantId.value, pluginId, version);
    await refresh();
  }

  const activeByPlugin = computed<ReadonlyMap<string, string>>(() => {
    const map = new Map<string, string>();
    for (const record of installed.value) {
      const active = record.versions.find((v) => v.active);
      if (active) map.set(record.pluginId, active.version);
    }
    return map;
  });

  return {
    installed,
    loading,
    error,
    activeByPlugin,
    refresh,
    install,
    activate,
    uninstall,
  };
}

async function buildRegistrations(
  records: readonly InstallRecord[],
  api: MarketplaceApi,
  tenantId: string,
): Promise<readonly PluginRegistration[]> {
  const out: PluginRegistration[] = [];
  for (const record of records) {
    for (const v of record.versions) {
      if (!v.active) continue;
      const manifest = await api.readManifest(tenantId, record.pluginId, v.version);
      if (!manifest) continue;
      const result = validatePluginManifest(manifest);
      if (!result.ok) continue;
      out.push({
        manifest: result.manifest,
        // V3.4 stub: a no-op `activate` is enough for
        // the host to surface the manifest in the
        // entries view. The MarketplacePanel renders
        // the actual install / activate / uninstall
        // controls; the runtime does not need to
        // produce `ui-panel` extensions here.
        activate: async () => [],
      });
    }
  }
  return out;
}

/**
 * Default `MarketplaceApi` implementation that talks to
 * the BFF over fetch. Host code wires this when no
 * custom implementation is available.
 *
 * The factory is intentionally separate from the
 * composable so the composable's tests can inject a
 * fake without pulling in fetch / network. The
 * factory uses the V2.1 `ApiClient`'s fetchImpl
 * shape (a `fetch`-like function) so the host's
 * auth bearer token plumbing can be reused if it
 * wants to; the default is `globalThis.fetch`.
 *
 * V3.4 ships a minimal set of endpoints; a V3.4.x
 * follow-up may extend `ApiClient` with typed
 * `plugins.*` methods and deprecate this factory.
 *
 * V3.5 follow-up: the BFF's `/api/plugins` routes
 * are gated on `requiresTenantScope` (V3.3), which
 * reads `Authorization: Bearer <token>` out of the
 * request headers. `globalThis.fetch` does not know
 * about the auth store, so any host that builds the
 * factory without wiring a token getter gets a 401
 * `AUTH_SESSION_EXPIRED` ("Session not found") on
 * every call -- the symptom is the marketplace panel
 * silently fails to load. The `getAuthToken` option
 * closes that gap by reading the live bearer token
 * (the same callback shape `useDeviceStream` uses
 * for the WebSocket subprotocol tunnel, so the
 * host only writes it once). Passing `undefined`
 * preserves the V3.4 behavior for tests and
 * tooling that intentionally skip auth.
 */
export interface FetchMarketplaceApiOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  /**
   * V3.5 follow-up: returns the current bearer
   * token. The factory calls this on every request
   * and adds `Authorization: Bearer <token>` when
   * the value is non-null. The callback shape
   * matches `useDeviceStream`'s `getToken` so a
   * single `() => authStore.token.value` wires
   * both the HTTP and WebSocket transports.
   */
  getAuthToken?: () => string | null;
}

export function createFetchMarketplaceApi(
  options: FetchMarketplaceApiOptions,
): MarketplaceApi {
  const base = options.baseUrl.replace(/\/$/, '');
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const getAuthToken = options.getAuthToken;

  async function readJson<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text) return null as T;
    return JSON.parse(text) as T;
  }

  async function call<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    // V3.5 follow-up: the BFF's `requiresTenantScope`
    // gate keys mock-auth sessions on the bearer token,
    // so a missing header turns every marketplace call
    // into a 401. The token is read lazily on every
    // request so a login that happens after the panel
    // mounted picks up automatically on the next call.
    const token = getAuthToken?.();
    if (token) headers.authorization = `Bearer ${token}`;
    const init: RequestInit = { method, headers };
    if (body !== undefined) init.body = JSON.stringify(body);
    const response = await fetchImpl(`${base}${path}`, init);
    if (!response.ok) {
      // Surface the BFF's error payload as a plain
      // Error so the composable can put the message
      // into `error.value` without depending on the
      // api-client's typed error class.
      const err = await readJson<{ error?: string; message?: string }>(response);
      throw new Error(err?.message ?? `${method} ${path} -> ${response.status}`);
    }
    if (response.status === 204) return null as T;
    return readJson<T>(response);
  }

  return {
    async listInstalled(tenantId: string) {
      void tenantId;
      return call<readonly InstallRecord[]>('GET', '/api/plugins');
    },
    async install(tenantId: string, pluginId: string, version: string) {
      void tenantId;
      return call<InstalledPluginVersion>(
        'POST',
        `/api/plugins/${encodeURIComponent(pluginId)}/install`,
        { pluginId, version },
      );
    },
    async activate(tenantId: string, pluginId: string, version: string) {
      void tenantId;
      return call<InstalledPluginVersion>(
        'PUT',
        `/api/plugins/${encodeURIComponent(pluginId)}/activate`,
        { pluginId, version },
      );
    },
    async uninstall(tenantId: string, pluginId: string, version: string) {
      void tenantId;
      await call<void>(
        'DELETE',
        `/api/plugins/${encodeURIComponent(pluginId)}/installed/${encodeURIComponent(version)}`,
      );
    },
    /**
     * V3.4 stub: the BFF does not expose a manifest
     * read endpoint yet. Returning `null` is the
     * documented "skip this install" signal for
     * `buildRegistrations`. A V3.4.x follow-up adds
     * `GET /api/plugins/:id/:version/manifest` and
     * this function returns the parsed manifest.
     */
    async readManifest(tenantId: string, pluginId: string, version: string) {
      void tenantId;
      void pluginId;
      void version;
      return null;
    },
  };
}
