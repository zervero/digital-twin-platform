/**
 * V3.4 T1: persistence contract tests.
 *
 * Two halves:
 *   1. `compareSemver` unit tests -- the pure helper that
 *      the BFF uses in T5 to reject downgrades.
 *   2. An in-memory `PluginStore` fake that satisfies the
 *      contract end-to-end (putVersion / setActive /
 *      removeVersion / listVersions / getActive /
 *      listForTenant). The fake lives in the test file so
 *      the runtime itself stays storage-agnostic; the BFF
 *      wires the file-based implementation in T4.
 */

import { describe, expect, it } from 'vitest';

import {
  compareSemver,
  type InstalledPluginVersion,
  type PluginStore,
} from '../persistence.js';

// ---------------------------------------------------------------------------
// compareSemver
// ---------------------------------------------------------------------------

describe('compareSemver', () => {
  it('returns 0 for equal versions', () => {
    expect(compareSemver('1.2.3', '1.2.3')).toBe(0);
  });

  it('returns negative when patch is lower', () => {
    expect(compareSemver('1.2.3', '1.2.4')).toBeLessThan(0);
  });

  it('returns positive when minor is higher', () => {
    expect(compareSemver('1.3.0', '1.2.99')).toBeGreaterThan(0);
  });

  it('returns positive when major is higher', () => {
    expect(compareSemver('2.0.0', '1.99.99')).toBeGreaterThan(0);
  });

  it('orders no pre-release higher than pre-release', () => {
    // 1.0.0 > 1.0.0-beta (per semver 2.0.0).
    expect(compareSemver('1.0.0', '1.0.0-beta')).toBeGreaterThan(0);
    expect(compareSemver('1.0.0-beta', '1.0.0')).toBeLessThan(0);
  });

  it('orders pre-release identifiers lexicographically', () => {
    expect(compareSemver('1.0.0-beta.2', '1.0.0-beta.1')).toBeGreaterThan(0);
    expect(compareSemver('1.0.0-alpha', '1.0.0-beta')).toBeLessThan(0);
  });

  it('ignores build metadata', () => {
    // 1.0.0+build === 1.0.0 per semver 2.0.0.
    expect(compareSemver('1.0.0+build', '1.0.0')).toBe(0);
    expect(compareSemver('1.0.0+build1', '1.0.0+build2')).toBe(0);
  });

  it('throws on invalid semver', () => {
    expect(() => compareSemver('not-semver', '1.0.0')).toThrow(/invalid semver/);
    expect(() => compareSemver('1.0.0', '1.0')).toThrow(/invalid semver/);
    expect(() => compareSemver('', '')).toThrow(/invalid semver/);
  });
});

// ---------------------------------------------------------------------------
// PluginStore contract (in-memory fake)
// ---------------------------------------------------------------------------

/**
 * Minimal in-memory `PluginStore` for tests. Mirrors the
 * contract the BFF's file-based implementation will
 * satisfy in T4. Lives here so the runtime itself stays
 * storage-agnostic.
 */
function createInMemoryPluginStore(): PluginStore {
  // Map keyed on `${tenantId}/${pluginId}` -> sorted versions.
  const store = new Map<string, InstalledPluginVersion[]>();
  const active = new Map<string, string>(); // key -> active version

  function key(tenantId: string, pluginId: string): string {
    return `${tenantId}/${pluginId}`;
  }

  function withActive(
    k: string,
    versions: readonly InstalledPluginVersion[],
  ): InstalledPluginVersion[] {
    const activeVersion = active.get(k);
    return [...versions]
      .sort((a, b) => a.version.localeCompare(b.version))
      .map((v) => ({ ...v, active: v.version === activeVersion }));
  }

  return {
    async listForTenant(tenantId) {
      const out: { tenantId: string; pluginId: string; versions: InstalledPluginVersion[] }[] = [];
      for (const [k, versions] of store) {
        const [t, p] = k.split('/');
        if (t === tenantId && versions.length > 0) {
          out.push({ tenantId: t!, pluginId: p!, versions: withActive(k, versions) });
        }
      }
      return out;
    },

    async listVersions(tenantId, pluginId) {
      return withActive(key(tenantId, pluginId), store.get(key(tenantId, pluginId)) ?? []);
    },

    async getVersion(tenantId, pluginId, version) {
      const versions = store.get(key(tenantId, pluginId)) ?? [];
      return versions.find((v) => v.version === version) ?? null;
    },

    async getActive(tenantId, pluginId) {
      const activeVersion = active.get(key(tenantId, pluginId));
      if (!activeVersion) return null;
      return this.getVersion(tenantId, pluginId, activeVersion);
    },

    async putVersion(record) {
      const k = key(record.tenantId, record.pluginId);
      const versions = store.get(k) ?? [];
      if (versions.some((v) => v.version === record.version)) {
        throw new Error(
          `plugin already installed: ${record.pluginId}@${record.version}`,
        );
      }
      const next: InstalledPluginVersion = { ...record };
      versions.push(next);
      store.set(k, versions);
      if (record.active) active.set(k, record.version);
      return next;
    },

    async setActive(tenantId, pluginId, version) {
      const existing = await this.getVersion(tenantId, pluginId, version);
      if (!existing) {
        throw new Error(`plugin not installed: ${pluginId}@${version}`);
      }
      active.set(key(tenantId, pluginId), version);
      return { ...existing, active: true };
    },

    async removeVersion(tenantId, pluginId, version) {
      const k = key(tenantId, pluginId);
      const versions = store.get(k) ?? [];
      const idx = versions.findIndex((v) => v.version === version);
      if (idx === -1) return false;
      versions.splice(idx, 1);
      if (versions.length === 0) {
        store.delete(k);
        active.delete(k);
      } else if (active.get(k) === version) {
        active.delete(k);
      }
      return true;
    },
  };
}

function makeRecord(
  tenantId: string,
  pluginId: string,
  version: string,
  active: boolean,
): InstalledPluginVersion {
  return {
    pluginId,
    version,
    tenantId,
    installedAt: '2026-07-08T00:00:00.000Z',
    manifestPath: `${tenantId}/${pluginId}/${version}/manifest.json`,
    artifactPath: `${tenantId}/${pluginId}/${version}/artifact.tgz`,
    signaturePath: `${tenantId}/${pluginId}/${version}/signature.txt`,
    active,
  };
}

describe('PluginStore contract (in-memory fake)', () => {
  it('lists empty for an unknown tenant', async () => {
    const s = createInMemoryPluginStore();
    expect(await s.listForTenant('nobody')).toEqual([]);
  });

  it('putVersion then listVersions returns the recorded install', async () => {
    const s = createInMemoryPluginStore();
    await s.putVersion(makeRecord('acme-corp', 'hello-plugin', '1.0.0', true));
    const versions = await s.listVersions('acme-corp', 'hello-plugin');
    expect(versions).toHaveLength(1);
    expect(versions[0]!.version).toBe('1.0.0');
    expect(versions[0]!.active).toBe(true);
  });

  it('setActive marks the requested version active', async () => {
    const s = createInMemoryPluginStore();
    await s.putVersion(makeRecord('acme-corp', 'hello-plugin', '1.0.0', true));
    await s.putVersion(makeRecord('acme-corp', 'hello-plugin', '1.1.0', false));
    await s.setActive('acme-corp', 'hello-plugin', '1.1.0');
    const active = await s.getActive('acme-corp', 'hello-plugin');
    expect(active?.version).toBe('1.1.0');
    const versions = await s.listVersions('acme-corp', 'hello-plugin');
    expect(versions.find((v) => v.version === '1.0.0')!.active).toBe(false);
    expect(versions.find((v) => v.version === '1.1.0')!.active).toBe(true);
  });

  it('removeVersion returns false for an unknown version', async () => {
    const s = createInMemoryPluginStore();
    expect(await s.removeVersion('acme-corp', 'hello-plugin', '9.9.9')).toBe(false);
  });

  it('removeVersion clears the active pointer when the active version is removed', async () => {
    const s = createInMemoryPluginStore();
    await s.putVersion(makeRecord('acme-corp', 'hello-plugin', '1.0.0', true));
    expect(await s.removeVersion('acme-corp', 'hello-plugin', '1.0.0')).toBe(true);
    expect(await s.getActive('acme-corp', 'hello-plugin')).toBeNull();
  });

  it('putVersion rejects duplicate versions', async () => {
    const s = createInMemoryPluginStore();
    await s.putVersion(makeRecord('acme-corp', 'hello-plugin', '1.0.0', true));
    await expect(
      s.putVersion(makeRecord('acme-corp', 'hello-plugin', '1.0.0', false)),
    ).rejects.toThrow(/already installed/);
  });

  it('listForTenant returns all plugins for the tenant', async () => {
    const s = createInMemoryPluginStore();
    await s.putVersion(makeRecord('acme-corp', 'hello-plugin', '1.0.0', true));
    await s.putVersion(makeRecord('acme-corp', 'other-plugin', '2.0.0', true));
    await s.putVersion(makeRecord('globex-ind', 'hello-plugin', '1.0.0', true));
    const records = await s.listForTenant('acme-corp');
    expect(records).toHaveLength(2);
    const ids = records.map((r) => r.pluginId).sort();
    expect(ids).toEqual(['hello-plugin', 'other-plugin']);
    // globex-ind's hello-plugin must not appear.
    expect(records.every((r) => r.tenantId === 'acme-corp')).toBe(true);
  });

  it('exports all 7 PluginStore methods on the interface contract', () => {
    // Type-level smoke test: the interface shape is stable.
    const s = createInMemoryPluginStore();
    expect(typeof s.listForTenant).toBe('function');
    expect(typeof s.listVersions).toBe('function');
    expect(typeof s.getVersion).toBe('function');
    expect(typeof s.getActive).toBe('function');
    expect(typeof s.putVersion).toBe('function');
    expect(typeof s.setActive).toBe('function');
    expect(typeof s.removeVersion).toBe('function');
  });
});
