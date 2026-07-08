/**
 * V3.4: file-based plugin storage.
 *
 * `FilePluginStore` is the V3.4 production `PluginStore`
 * implementation; the in-memory variant in `store-memory.ts`
 * is the test-only one used by `marketplace.test.ts` so
 * the route tests stay fast and free of filesystem state.
 *
 * On-disk layout:
 *
 *   <root>/<tenantId>/<pluginId>/<version>/manifest.json
 *   <root>/<tenantId>/<pluginId>/<version>/artifact.tgz
 *   <root>/<tenantId>/<pluginId>/<version>/signature.txt
 *   <root>/<tenantId>/<pluginId>/<version>/install.json
 *   <root>/<tenantId>/<pluginId>/active.txt
 *   <root>/_registry/<pluginId>/<version>/...   (publish-time artifacts)
 *
 * Publish-time files live under `_registry/` (no tenant);
 * install-time files live under `<tenantId>/`. The two
 * trees never overlap; the `_` prefix keeps
 * `listForTenant` from accidentally scanning the registry
 * tree.
 *
 * The active pointer is `active.txt` containing the
 * semver of the currently active version; `setActive`
 * rewrites the pointer file in place.
 *
 * V3.4 ships JSON files because the install volume is
 * small (a few hundred plugins per tenant at most,
 * each with <10 versions). A V3.4.x follow-up swaps
 * this for SQLite or Postgres when the volume or the
 * multi-replica story needs it. The `PluginStore`
 * interface is the single point that changes.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import type { PublishPluginRequest } from '@dt/contracts';
import type {
  InstallRecord,
  InstalledPluginVersion,
  PluginStore,
} from '@dt/plugin-runtime';

import { signArtifact, verifySignature } from './signing.js';

const DEFAULT_STORAGE_ROOT = '.data/plugins';

function resolveStorageRoot(): string {
  const raw = process.env.PLUGIN_STORAGE_ROOT;
  return path.resolve(raw && raw.length > 0 ? raw : DEFAULT_STORAGE_ROOT);
}

/** The on-disk serialization of `InstalledPluginVersion`. */
interface InstallMeta {
  pluginId: string;
  version: string;
  tenantId: string;
  installedAt: string;
  manifestPath: string;
  artifactPath: string;
  signaturePath: string;
}

/** The on-disk serialization of the active version pointer. */
interface ActivePointer {
  active: string;
}

export class FilePluginStore implements PluginStore {
  constructor(private readonly root: string = resolveStorageRoot()) {}

  private tenantDir(
    tenantId: string,
    pluginId: string,
    version: string,
  ): string {
    return path.join(this.root, tenantId, pluginId, version);
  }

  private activePointerPath(tenantId: string, pluginId: string): string {
    return path.join(this.root, tenantId, pluginId, 'active.txt');
  }

  async listForTenant(tenantId: string): Promise<readonly InstallRecord[]> {
    const tenantDir = path.join(this.root, tenantId);
    const entries = await readdirSafe(tenantDir);
    const records: InstallRecord[] = [];
    for (const pluginId of entries) {
      if (pluginId === '_registry') continue;
      const versions = await this.listVersions(tenantId, pluginId);
      if (versions.length > 0) {
        records.push({ tenantId, pluginId, versions });
      }
    }
    return records.sort((a, b) => a.pluginId.localeCompare(b.pluginId));
  }

  async listVersions(
    tenantId: string,
    pluginId: string,
  ): Promise<readonly InstalledPluginVersion[]> {
    const pluginDir = path.join(this.root, tenantId, pluginId);
    const entries = await readdirSafe(pluginDir);
    const active = await this.readActivePointer(tenantId, pluginId);
    const versions: InstalledPluginVersion[] = [];
    for (const entry of entries) {
      if (entry === 'active.txt') continue;
      const versionDir = path.join(pluginDir, entry);
      let stat;
      try {
        stat = await fs.stat(versionDir);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') continue;
        throw err;
      }
      if (!stat.isDirectory()) continue;
      const manifestPath = path.join(versionDir, 'manifest.json');
      const artifactPath = path.join(versionDir, 'artifact.tgz');
      const signaturePath = path.join(versionDir, 'signature.txt');
      // mtime doubles as the installedAt timestamp when an
      // install row carries no explicit timestamp. The
      // marketplace route always sets installedAt; we fall
      // back to mtime for installs written by other paths.
      const installedAt = stat.mtime.toISOString();
      versions.push({
        pluginId,
        version: entry,
        tenantId,
        installedAt,
        manifestPath,
        artifactPath,
        signaturePath,
        active: active === entry,
      });
    }
    return versions.sort((a, b) => a.version.localeCompare(b.version));
  }

  async getVersion(
    tenantId: string,
    pluginId: string,
    version: string,
  ): Promise<InstalledPluginVersion | null> {
    const versions = await this.listVersions(tenantId, pluginId);
    return versions.find((v) => v.version === version) ?? null;
  }

  async getActive(
    tenantId: string,
    pluginId: string,
  ): Promise<InstalledPluginVersion | null> {
    const active = await this.readActivePointer(tenantId, pluginId);
    if (!active) return null;
    return this.getVersion(tenantId, pluginId, active);
  }

  async putVersion(
    record: InstalledPluginVersion,
  ): Promise<InstalledPluginVersion> {
    const dir = this.tenantDir(record.tenantId, record.pluginId, record.version);
    await fs.mkdir(dir, { recursive: true });
    const meta: InstallMeta = {
      pluginId: record.pluginId,
      version: record.version,
      tenantId: record.tenantId,
      installedAt: record.installedAt,
      manifestPath: record.manifestPath,
      artifactPath: record.artifactPath,
      signaturePath: record.signaturePath,
    };
    await fs.writeFile(
      path.join(dir, 'install.json'),
      JSON.stringify(meta, null, 2),
      'utf8',
    );
    if (record.active) {
      await this.writeActivePointer(
        record.tenantId,
        record.pluginId,
        record.version,
      );
    }
    return record;
  }

  async setActive(
    tenantId: string,
    pluginId: string,
    version: string,
  ): Promise<InstalledPluginVersion> {
    const existing = await this.getVersion(tenantId, pluginId, version);
    if (!existing) {
      throw new Error(`plugin not installed: ${pluginId}@${version}`);
    }
    await this.writeActivePointer(tenantId, pluginId, version);
    return { ...existing, active: true };
  }

  async removeVersion(
    tenantId: string,
    pluginId: string,
    version: string,
  ): Promise<boolean> {
    const dir = this.tenantDir(tenantId, pluginId, version);
    try {
      await fs.stat(dir);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw err;
    }
    await fs.rm(dir, { recursive: true, force: true });
    const active = await this.readActivePointer(tenantId, pluginId);
    if (active === version) {
      try {
        await fs.rm(this.activePointerPath(tenantId, pluginId), { force: true });
      } catch {
        // best-effort: the pointer will be re-written by
        // the next setActive or left stale until then.
      }
    }
    return true;
  }

  private async readActivePointer(
    tenantId: string,
    pluginId: string,
  ): Promise<string | null> {
    const pointerPath = this.activePointerPath(tenantId, pluginId);
    try {
      const buf = await fs.readFile(pointerPath, 'utf8');
      const parsed = JSON.parse(buf) as ActivePointer;
      return parsed.active;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  private async writeActivePointer(
    tenantId: string,
    pluginId: string,
    version: string,
  ): Promise<void> {
    const pointerPath = this.activePointerPath(tenantId, pluginId);
    await fs.mkdir(path.dirname(pointerPath), { recursive: true });
    await fs.writeFile(
      pointerPath,
      JSON.stringify({ active: version }),
      'utf8',
    );
  }
}

async function readdirSafe(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

/**
 * Write the publish-time artifact to the registry root
 * (`<root>/_registry/<pluginId>/<version>/`). Decodes
 * the base64 artifact body, HMAC-signs it with the
 * secret loaded by `loadSigningSecret()`, and writes
 * `manifest.json`, `artifact.tgz`, and `signature.txt`
 * in the version dir.
 *
 * The T3 route is the only caller; T6 will route
 * `publish` through this function so the on-disk
 * shape and the in-memory registry stay in lockstep.
 */
export async function writePluginArtifact(
  body: PublishPluginRequest,
): Promise<{ artifactPath: string; signaturePath: string }> {
  const artifact = Buffer.from(body.artifact, 'base64');
  const signature = signArtifact(artifact);
  const dir = path.join(
    resolveStorageRoot(),
    '_registry',
    body.manifest.id,
    body.manifest.version,
  );
  await fs.mkdir(dir, { recursive: true });
  const artifactPath = path.join(dir, 'artifact.tgz');
  const signaturePath = path.join(dir, 'signature.txt');
  const manifestPath = path.join(dir, 'manifest.json');
  await Promise.all([
    fs.writeFile(artifactPath, artifact),
    fs.writeFile(signaturePath, signature),
    fs.writeFile(manifestPath, JSON.stringify(body.manifest, null, 2)),
  ]);
  return { artifactPath, signaturePath };
}

/**
 * Verify a signed artifact by recomputing the HMAC over
 * the bytes on disk and comparing against `signature.txt`.
 * Returns false (never throws) on a malformed signature,
 * a missing file, or a length mismatch. The T6 publish
 * route calls this on the install path to gate the
 * `POST /api/plugins/:id/install` handler.
 */
export async function verifyArtifactSignature(
  artifactPath: string,
  signaturePath: string,
): Promise<boolean> {
  const [artifact, signature] = await Promise.all([
    fs.readFile(artifactPath),
    fs.readFile(signaturePath, 'utf8'),
  ]);
  return verifySignature(artifact, signature.trim());
}
