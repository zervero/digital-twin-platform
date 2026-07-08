/**
 * V3.4: persistence contracts for the marketplace.
 *
 * The V2.2 in-memory `PluginRegistry` is the activation
 * envelope; it does not know about persistence. This
 * module adds the types a storage backend implements
 * to describe what is installed, signed, and active for
 * a given tenant.
 *
 * Trust model: a `PluginStore` is a pure async interface.
 * The BFF wires a file-based implementation in V3.4; a
 * V3.4.x follow-up swaps it for a database. The runtime
 * never imports from a specific backend.
 */

export interface InstalledPluginVersion {
  /** Plugin id from the manifest (e.g. "hello-plugin"). */
  pluginId: string;
  /** Semver string from the manifest (e.g. "1.2.3"). */
  version: string;
  /** Tenant that owns this install. */
  tenantId: string;
  /** ISO-8601 timestamp; set when the install succeeded. */
  installedAt: string;
  /** Path to the manifest on disk (relative to the storage root). */
  manifestPath: string;
  /** Path to the signed artifact on disk (relative to the storage root). */
  artifactPath: string;
  /** Path to the signature file on disk (relative to the storage root). */
  signaturePath: string;
  /** True if this version is the active one for the tenant. */
  active: boolean;
}

export interface InstallRecord {
  tenantId: string;
  pluginId: string;
  versions: readonly InstalledPluginVersion[];
}

export interface PluginStore {
  /** List every installed version for a tenant, across all plugins. */
  listForTenant(tenantId: string): Promise<readonly InstallRecord[]>;
  /** List every installed version for a single plugin in a tenant. */
  listVersions(
    tenantId: string,
    pluginId: string,
  ): Promise<readonly InstalledPluginVersion[]>;
  /** Get one installed version, or null if not installed. */
  getVersion(
    tenantId: string,
    pluginId: string,
    version: string,
  ): Promise<InstalledPluginVersion | null>;
  /** Get the active version for a tenant + plugin, or null if none active. */
  getActive(
    tenantId: string,
    pluginId: string,
  ): Promise<InstalledPluginVersion | null>;
  /** Persist a new install. Returns the recorded `InstalledPluginVersion`. */
  putVersion(record: InstalledPluginVersion): Promise<InstalledPluginVersion>;
  /** Mark `version` as the active one; previous active (if any) is cleared. */
  setActive(
    tenantId: string,
    pluginId: string,
    version: string,
  ): Promise<InstalledPluginVersion>;
  /** Remove an installed version. Returns true if a row was deleted. */
  removeVersion(
    tenantId: string,
    pluginId: string,
    version: string,
  ): Promise<boolean>;
}

/**
 * Compare two semver strings. Returns negative if a<b,
 * zero if equal, positive if a>b. Pre-release tags are
 * ordered lower than the same MAJOR.MINOR.PATCH without
 * a pre-release tag (per semver 2.0.0).
 *
 * Exported so the BFF can reject a downgrade in T5
 * (installing 1.2.3 over an active 1.3.0 returns 409).
 */
export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) {
    throw new Error(`invalid semver: ${!pa ? a : b}`);
  }
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  if (pa.patch !== pb.patch) return pa.patch - pb.patch;
  // No pre-release tag > pre-release tag with the same numbers.
  if (pa.preRelease && !pb.preRelease) return -1;
  if (!pa.preRelease && pb.preRelease) return 1;
  if (pa.preRelease && pb.preRelease) {
    return pa.preRelease < pb.preRelease
      ? -1
      : pa.preRelease > pb.preRelease
        ? 1
        : 0;
  }
  return 0;
}

interface ParsedSemver {
  major: number;
  minor: number;
  patch: number;
  preRelease: string | null;
}

function parseSemver(s: string): ParsedSemver | null {
  const m =
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?(?:\+[0-9A-Za-z-.]+)?$/.exec(s);
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    preRelease: m[4] ?? null,
  };
}
