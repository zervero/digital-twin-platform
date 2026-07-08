/**
 * In-memory `PluginStore` for V3.4 T3 server wiring.
 *
 * T4 replaces this with `FilePluginStore` (the on-disk
 * implementation under `apps/bff/.data/plugins/`). For
 * T3 the BFF boots with this in-memory version so the
 * routes have a working `PluginStore` to talk to before
 * the storage layer lands. The smoke (T8) and the route
 * unit tests substitute this for the file-based store
 * via the same `PluginStore` interface.
 *
 * The class is a thin wrapper around the in-memory fake
 * used in `@dt/plugin-runtime`'s persistence tests; both
 * implementations satisfy the same 7-method contract so
 * the route handlers cannot tell them apart.
 */

import type {
  InstalledPluginVersion,
  InstallRecord,
  PluginStore,
} from '@dt/plugin-runtime';

export class MemoryPluginStore implements PluginStore {
  // Map keyed on `${tenantId}/${pluginId}` -> versions.
  private readonly store = new Map<string, InstalledPluginVersion[]>();
  // Map keyed on `${tenantId}/${pluginId}` -> active version string.
  private readonly active = new Map<string, string>();

  private key(tenantId: string, pluginId: string): string {
    return `${tenantId}/${pluginId}`;
  }

  private withActive(
    k: string,
    versions: readonly InstalledPluginVersion[],
  ): InstalledPluginVersion[] {
    const activeVersion = this.active.get(k);
    return [...versions]
      .sort((a, b) => a.version.localeCompare(b.version))
      .map((v) => ({ ...v, active: v.version === activeVersion }));
  }

  async listForTenant(tenantId: string): Promise<readonly InstallRecord[]> {
    const out: InstallRecord[] = [];
    for (const [k, versions] of this.store) {
      const [t, p] = k.split('/');
      if (t === tenantId && versions.length > 0) {
        out.push({ tenantId: t!, pluginId: p!, versions: this.withActive(k, versions) });
      }
    }
    return out;
  }

  async listVersions(
    tenantId: string,
    pluginId: string,
  ): Promise<readonly InstalledPluginVersion[]> {
    return this.withActive(this.key(tenantId, pluginId), this.store.get(this.key(tenantId, pluginId)) ?? []);
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
    const activeVersion = this.active.get(this.key(tenantId, pluginId));
    if (!activeVersion) return null;
    return this.getVersion(tenantId, pluginId, activeVersion);
  }

  async putVersion(record: InstalledPluginVersion): Promise<InstalledPluginVersion> {
    const k = this.key(record.tenantId, record.pluginId);
    const versions = this.store.get(k) ?? [];
    if (versions.some((v) => v.version === record.version)) {
      throw new Error(
        `plugin already installed: ${record.pluginId}@${record.version}`,
      );
    }
    versions.push(record);
    this.store.set(k, versions);
    if (record.active) this.active.set(k, record.version);
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
    this.active.set(this.key(tenantId, pluginId), version);
    return { ...existing, active: true };
  }

  async removeVersion(
    tenantId: string,
    pluginId: string,
    version: string,
  ): Promise<boolean> {
    const k = this.key(tenantId, pluginId);
    const versions = this.store.get(k) ?? [];
    const idx = versions.findIndex((v) => v.version === version);
    if (idx === -1) return false;
    versions.splice(idx, 1);
    if (versions.length === 0) {
      this.store.delete(k);
      this.active.delete(k);
    } else if (this.active.get(k) === version) {
      this.active.delete(k);
    }
    return true;
  }
}
