/**
 * V3.4 T2: in-memory `RegistryIndex` tests.
 *
 * The BFF's marketplace routes in T3 consume a
 * `RegistryIndex`. The file-based implementation lands
 * in T4; for unit tests the BFF and the smoke (T8)
 * substitute `createInMemoryPluginIndex` from this
 * package. The tests below cover the data model +
 * the in-memory factory contract end-to-end.
 */

import { describe, expect, it } from 'vitest';

import type { PluginManifest } from '@dt/plugin-runtime';

import {
  createInMemoryPluginIndex,
  type PluginVersion,
} from '../registry.js';

function manifest(
  id: string,
  version: string,
  name = id,
  vendor = 'Acme',
): PluginManifest {
  return { id, name, version, vendor, permissions: ['device:read'] };
}

function version(
  pluginId: string,
  v: string,
  publishedAt = '2026-07-08T00:00:00.000Z',
): PluginVersion {
  return {
    pluginId,
    version: v,
    manifest: manifest(pluginId, v),
    artifactPath: `${pluginId}/${v}/artifact.tgz`,
    signaturePath: `${pluginId}/${v}/signature.txt`,
    publishedAt,
  };
}

describe('createInMemoryPluginIndex', () => {
  it('starts empty', async () => {
    const r = createInMemoryPluginIndex();
    expect(await r.list()).toEqual([]);
  });

  it('publish adds a new plugin with one version', async () => {
    const r = createInMemoryPluginIndex();
    await r.publish(version('hello-plugin', '1.0.0'));
    const all = await r.list();
    expect(all).toHaveLength(1);
    expect(all[0]!.id).toBe('hello-plugin');
    expect(all[0]!.name).toBe('hello-plugin');
    expect(all[0]!.vendor).toBe('Acme');
    expect(all[0]!.versions).toHaveLength(1);
    expect(all[0]!.versions[0]!.version).toBe('1.0.0');
  });

  it('publish keeps plugin metadata from the latest manifest', async () => {
    const r = createInMemoryPluginIndex();
    await r.publish({
      ...version('hello-plugin', '1.0.0'),
      manifest: { ...manifest('hello-plugin', '1.0.0'), name: 'Hello Plugin' },
    });
    await r.publish({
      ...version('hello-plugin', '1.1.0'),
      manifest: { ...manifest('hello-plugin', '1.1.0'), name: 'Hello Plugin v2' },
    });
    const p = await r.get('hello-plugin');
    expect(p?.name).toBe('Hello Plugin v2');
    expect(p?.versions).toHaveLength(2);
  });

  it('publish appends versions to an existing plugin', async () => {
    const r = createInMemoryPluginIndex();
    await r.publish(version('hello-plugin', '1.0.0'));
    await r.publish(version('hello-plugin', '1.1.0'));
    const p = await r.get('hello-plugin');
    expect(p?.versions.map((v) => v.version)).toEqual(['1.0.0', '1.1.0']);
  });

  it('get returns null for an unknown plugin', async () => {
    const r = createInMemoryPluginIndex();
    expect(await r.get('nope')).toBeNull();
  });

  it('list is sorted by plugin id', async () => {
    const r = createInMemoryPluginIndex();
    await r.publish(version('zebra', '1.0.0'));
    await r.publish(version('apple', '1.0.0'));
    await r.publish(version('mango', '1.0.0'));
    const all = await r.list();
    expect(all.map((p) => p.id)).toEqual(['apple', 'mango', 'zebra']);
  });

  it('multiple plugins stay independent', async () => {
    const r = createInMemoryPluginIndex();
    await r.publish(version('hello-plugin', '1.0.0'));
    await r.publish(version('other-plugin', '2.0.0'));
    const all = await r.list();
    expect(all).toHaveLength(2);
    const ids = all.map((p) => p.id).sort();
    expect(ids).toEqual(['hello-plugin', 'other-plugin']);
  });

  it('preserves artifact / signature paths from publish', async () => {
    const r = createInMemoryPluginIndex();
    const v = version('hello-plugin', '1.0.0');
    await r.publish(v);
    const p = await r.get('hello-plugin');
    expect(p?.versions[0]!.artifactPath).toBe(v.artifactPath);
    expect(p?.versions[0]!.signaturePath).toBe(v.signaturePath);
    expect(p?.versions[0]!.publishedAt).toBe(v.publishedAt);
  });

  it('exports the RegistryIndex contract shape (3 methods)', () => {
    const r = createInMemoryPluginIndex();
    expect(typeof r.list).toBe('function');
    expect(typeof r.get).toBe('function');
    expect(typeof r.publish).toBe('function');
  });
});
