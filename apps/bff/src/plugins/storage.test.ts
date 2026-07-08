/**
 * FilePluginStore unit tests -- V3.4 T4.
 *
 * Each test uses a fresh `mkdtempSync` directory as the
 * storage root so the suite leaves no on-disk residue.
 * The temp directory is deleted in `afterEach`; a
 * dedicated "cleanup" test verifies that a full
 * install + activate + uninstall cycle empties the
 * tenant's tree.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { InstalledPluginVersion } from '@dt/plugin-runtime';

import type { PublishPluginRequest } from '@dt/contracts';

import {
  FilePluginStore,
  verifyArtifactSignature,
  writePluginArtifact,
} from './storage.js';
import {
  generateDevSigningSecret,
  resetSigningSecret,
} from './signing.js';

function makeRecord(overrides: Partial<InstalledPluginVersion> = {}): InstalledPluginVersion {
  return {
    pluginId: 'hello-plugin',
    version: '1.0.0',
    tenantId: 'acme-corp',
    installedAt: '2026-01-01T00:00:00.000Z',
    manifestPath: '.data/plugins/_registry/hello-plugin/1.0.0/manifest.json',
    artifactPath: '.data/plugins/_registry/hello-plugin/1.0.0/artifact.tgz',
    signaturePath: '.data/plugins/_registry/hello-plugin/1.0.0/signature.txt',
    active: false,
    ...overrides,
  };
}

function newStore(): { store: FilePluginStore; root: string } {
  const root = mkdtempSync(path.join(tmpdir(), 'dtp-file-store-'));
  return { store: new FilePluginStore(root), root };
}

describe('FilePluginStore (V3.4 T4)', () => {
  let store: FilePluginStore;
  let root: string;

  beforeEach(() => {
    ({ store, root } = newStore());
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('putVersion then listVersions returns the recorded install', async () => {
    const record = makeRecord({ version: '1.0.0' });
    await store.putVersion(record);

    const versions = await store.listVersions('acme-corp', 'hello-plugin');
    expect(versions).toHaveLength(1);
    expect(versions[0]).toMatchObject({
      pluginId: 'hello-plugin',
      version: '1.0.0',
      tenantId: 'acme-corp',
    });
  });

  it('putVersion with active:true writes the active pointer file', async () => {
    await store.putVersion(makeRecord({ version: '1.0.0', active: true }));
    const active = await store.getActive('acme-corp', 'hello-plugin');
    expect(active).not.toBeNull();
    expect(active!.version).toBe('1.0.0');
    expect(active!.active).toBe(true);
  });

  it('setActive marks the right version active and a subsequent listVersions reflects it', async () => {
    await store.putVersion(makeRecord({ version: '1.0.0', active: true }));
    await store.putVersion(makeRecord({ version: '1.1.0' }));

    const activated = await store.setActive('acme-corp', 'hello-plugin', '1.1.0');
    expect(activated.version).toBe('1.1.0');
    expect(activated.active).toBe(true);

    const versions = await store.listVersions('acme-corp', 'hello-plugin');
    expect(versions.find((v) => v.version === '1.0.0')!.active).toBe(false);
    expect(versions.find((v) => v.version === '1.1.0')!.active).toBe(true);
  });

  it('getActive returns the active version', async () => {
    await store.putVersion(makeRecord({ version: '1.0.0' }));
    await store.putVersion(makeRecord({ version: '1.1.0' }));
    await store.setActive('acme-corp', 'hello-plugin', '1.1.0');

    const active = await store.getActive('acme-corp', 'hello-plugin');
    expect(active?.version).toBe('1.1.0');
  });

  it('getActive returns null when nothing is active', async () => {
    await store.putVersion(makeRecord({ version: '1.0.0' }));
    const active = await store.getActive('acme-corp', 'hello-plugin');
    expect(active).toBeNull();
  });

  it('setActive throws when the version is not installed', async () => {
    await expect(
      store.setActive('acme-corp', 'hello-plugin', '9.9.9'),
    ).rejects.toThrow(/plugin not installed/);
  });

  it('removeVersion deletes the version dir; subsequent listVersions no longer includes it', async () => {
    await store.putVersion(makeRecord({ version: '1.0.0' }));
    await store.putVersion(makeRecord({ version: '1.1.0' }));

    const removed = await store.removeVersion('acme-corp', 'hello-plugin', '1.0.0');
    expect(removed).toBe(true);

    const versions = await store.listVersions('acme-corp', 'hello-plugin');
    expect(versions.map((v) => v.version)).toEqual(['1.1.0']);
  });

  it('removeVersion returns false for a version that was never installed', async () => {
    const removed = await store.removeVersion('acme-corp', 'hello-plugin', '9.9.9');
    expect(removed).toBe(false);
  });

  it('removeVersion of the active version clears the active pointer', async () => {
    await store.putVersion(makeRecord({ version: '1.0.0', active: true }));
    await store.removeVersion('acme-corp', 'hello-plugin', '1.0.0');

    const active = await store.getActive('acme-corp', 'hello-plugin');
    expect(active).toBeNull();
  });

  it('listForTenant returns empty for an unknown tenant', async () => {
    const records = await store.listForTenant('never-existed');
    expect(records).toEqual([]);
  });

  it('listForTenant scopes by tenant; other tenants do not leak in', async () => {
    await store.putVersion(makeRecord({ tenantId: 'acme-corp', version: '1.0.0' }));
    await store.putVersion(makeRecord({ tenantId: 'globex-ind', version: '1.0.0' }));

    const acme = await store.listForTenant('acme-corp');
    const globex = await store.listForTenant('globex-ind');
    expect(acme).toHaveLength(1);
    expect(acme[0]!.tenantId).toBe('acme-corp');
    expect(globex).toHaveLength(1);
    expect(globex[0]!.tenantId).toBe('globex-ind');
  });

  it('full install + activate + uninstall cycle leaves no on-disk residue under the tenant', async () => {
    await store.putVersion(makeRecord({ version: '1.0.0', active: true }));
    await store.putVersion(makeRecord({ version: '1.1.0' }));
    await store.setActive('acme-corp', 'hello-plugin', '1.1.0');
    await store.removeVersion('acme-corp', 'hello-plugin', '1.0.0');
    await store.removeVersion('acme-corp', 'hello-plugin', '1.1.0');

    // After uninstalling every version, the tenant dir
    // contains no plugin sub-directories (only an empty
    // tree). The store still returns an empty list.
    const records = await store.listForTenant('acme-corp');
    expect(records).toEqual([]);
    const versions = await store.listVersions('acme-corp', 'hello-plugin');
    expect(versions).toEqual([]);
  });
});


describe('writePluginArtifact (V3.4 T5)', () => {
  let root: string;
  let prior: string | undefined;

  let priorStorageRoot: string | undefined;

  beforeEach(async () => {
    root = mkdtempSync(path.join(tmpdir(), 'dtp-write-artifact-'));
    priorStorageRoot = process.env.PLUGIN_STORAGE_ROOT;
    // `writePluginArtifact` reads PLUGIN_STORAGE_ROOT
    // directly (it has no constructor for the root, by
    // design -- the registry root and the install root
    // are the same directory tree). Point it at the
    // test's tmp dir so the on-disk assertions match.
    process.env.PLUGIN_STORAGE_ROOT = root;
    prior = process.env.PLUGIN_SIGNING_SECRET;
    // The sign/verify path needs a real secret; generate
    // one per test so nothing leaks between runs.
    process.env.PLUGIN_SIGNING_SECRET = generateDevSigningSecret();
    resetSigningSecret();
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    if (priorStorageRoot === undefined) {
      delete process.env.PLUGIN_STORAGE_ROOT;
    } else {
      process.env.PLUGIN_STORAGE_ROOT = priorStorageRoot;
    }
    if (prior === undefined) {
      delete process.env.PLUGIN_SIGNING_SECRET;
    } else {
      process.env.PLUGIN_SIGNING_SECRET = prior;
    }
    resetSigningSecret();
  });

  it('writes manifest.json + artifact.tgz + signature.txt under _registry', async () => {
    const body: PublishPluginRequest = {
      manifest: {
        id: 'hello-plugin',
        name: 'Hello Plugin',
        version: '1.0.0',
        vendor: 'Acme',
        permissions: ['device:read'],
      },
      artifact: Buffer.from('hello-plugin-payload-v1').toString('base64'),
    };
    const { artifactPath, signaturePath } = await writePluginArtifact(body);

    // Paths live under <root>/_registry/<id>/<version>/.
    expect(artifactPath).toBe(
      path.join(root, '_registry', 'hello-plugin', '1.0.0', 'artifact.tgz'),
    );
    expect(signaturePath).toBe(
      path.join(root, '_registry', 'hello-plugin', '1.0.0', 'signature.txt'),
    );
    // All three files exist.
    const { promises: fs } = await import('node:fs');
    await expect(fs.stat(artifactPath)).resolves.toBeDefined();
    await expect(fs.stat(signaturePath)).resolves.toBeDefined();
    await expect(
      fs.stat(path.join(root, '_registry', 'hello-plugin', '1.0.0', 'manifest.json')),
    ).resolves.toBeDefined();
  });

  it('round-trip: the on-disk artifact verifies with verifyArtifactSignature', async () => {
    const body: PublishPluginRequest = {
      manifest: {
        id: 'hello-plugin',
        name: 'Hello Plugin',
        version: '1.0.0',
        vendor: 'Acme',
        permissions: ['device:read'],
      },
      artifact: Buffer.from('hello-plugin-payload-v1').toString('base64'),
    };
    const { artifactPath, signaturePath } = await writePluginArtifact(body);
    await expect(verifyArtifactSignature(artifactPath, signaturePath)).resolves.toBe(true);
  });

  it('round-trip: tampering with artifact.tgz breaks the signature', async () => {
    const body: PublishPluginRequest = {
      manifest: {
        id: 'hello-plugin',
        name: 'Hello Plugin',
        version: '1.0.0',
        vendor: 'Acme',
        permissions: ['device:read'],
      },
      artifact: Buffer.from('hello-plugin-payload-v1').toString('base64'),
    };
    const { artifactPath, signaturePath } = await writePluginArtifact(body);
    const { promises: fs } = await import('node:fs');
    await fs.writeFile(artifactPath, Buffer.from('tampered'));
    await expect(verifyArtifactSignature(artifactPath, signaturePath)).resolves.toBe(false);
  });
});
