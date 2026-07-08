/**
 * V3.4: the marketplace data model.
 *
 * `Plugin` describes the canonical plugin (id + name +
 * vendor); `PluginVersion` describes a single published
 * version (the manifest + signature + artifact path).
 * The in-memory `createInMemoryPluginIndex` factory is
 * a test-friendly implementation of `RegistryIndex`; the
 * BFF wires a file-based one in T4.
 *
 * Boundary: this package depends on `@dt/plugin-runtime`
 * (for `InstalledPluginVersion`) and `@dt/contracts` (for
 * the `Permission` union used by manifest validation).
 * It imports `PluginManifest` from `@dt/plugin-runtime`
 * because that is where the V2.2 contract lives; a V3.4.x
 * follow-up may move the type to `@dt/contracts` to match
 * the `Permission` shape (TBD).
 *
 * The package does not import `vue`, `three`, `pinia`,
 * or any BFF module. It is a pure-types + in-memory
 * factory module.
 */

import type { PluginManifest } from '@dt/plugin-runtime';

export interface PluginVersion {
  /** Plugin id from the manifest. */
  pluginId: string;
  /** Semver version. */
  version: string;
  /** Manifest for this version; parsed and validated. */
  manifest: PluginManifest;
  /** Path to the signed artifact on disk (relative to the storage root). */
  artifactPath: string;
  /** Path to the signature file on disk (relative to the storage root). */
  signaturePath: string;
  /** ISO-8601 timestamp; set when the artifact was published. */
  publishedAt: string;
}

export interface Plugin {
  /** Plugin id; the canonical key for `PluginStore`. */
  id: string;
  /** Human-readable name (from the manifest). */
  name: string;
  /** Vendor (from the manifest). */
  vendor: string;
  /** Versions of this plugin available in the local registry, ordered by semver. */
  versions: readonly PluginVersion[];
}

export interface RegistryIndex {
  /** All plugins in the local registry, keyed by id. */
  list(): Promise<readonly Plugin[]>;
  /** Get one plugin (all versions); null if not in the registry. */
  get(pluginId: string): Promise<Plugin | null>;
  /** Publish a new plugin version to the local registry. */
  publish(version: PluginVersion): Promise<PluginVersion>;
}

/**
 * Pure in-memory registry for tests. Production uses the
 * file-based implementation in apps/bff/src/plugins/.
 *
 * The `publish` method sorts versions with `localeCompare`
 * because semver strings of equal width sort correctly.
 * A V3.4.x follow-up swaps this for `compareSemver` from
 * `@dt/plugin-runtime` when the registry gains a real
 * storage backend that needs deterministic ordering.
 */
export function createInMemoryPluginIndex(): RegistryIndex {
  const plugins = new Map<string, Plugin>();
  return {
    async list() {
      return [...plugins.values()].sort((a, b) => a.id.localeCompare(b.id));
    },
    async get(pluginId) {
      return plugins.get(pluginId) ?? null;
    },
    async publish(version) {
      const existing = plugins.get(version.pluginId);
      const next: Plugin = {
        id: version.pluginId,
        name: version.manifest.name,
        vendor: version.manifest.vendor,
        versions: existing
          ? [...existing.versions, version].sort((a, b) =>
              a.version.localeCompare(b.version),
            )
          : [version],
      };
      plugins.set(version.pluginId, next);
      return version;
    },
  };
}
