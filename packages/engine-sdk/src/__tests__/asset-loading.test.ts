/**
 * Asset cache + progressive GLB replace (mocked loader, no WebGL).
 */

import { describe, expect, it, vi } from 'vitest';
import { Group, Mesh, MeshStandardMaterial, BoxGeometry } from 'three';

import type { SceneSnapshot } from '@dt/contracts';

import { createAssetCache } from '../asset-loader.js';
import { upgradeSceneAssets } from '../asset-upgrade.js';
import {
  applySelection,
  buildMachinePlaceholder,
  buildSceneGraph,
  findStatusLamp,
} from '../scene-factory.js';
import { SELECTION_COLOR, STATUS_COLORS } from '../colors.js';

describe('A-light recipes', () => {
  it('builds machine with pedestal, cabinetBody, and statusLamp', () => {
    const root = buildMachinePlaceholder('online');
    expect(root.getObjectByName('pedestal')).toBeTruthy();
    expect(root.getObjectByName('cabinetBody')).toBeTruthy();
    expect(findStatusLamp(root)?.name).toBe('statusLamp');
  });

  it('tints only the status lamp on selection', () => {
    const scene: SceneSnapshot = {
      id: 's',
      tenantId: 't',
      name: 'n',
      nodes: [
        {
          id: 'm-1',
          tenantId: 't',
          name: 'M',
          type: 'machine',
          position: [0, 0.5, 0],
          status: 'online',
        },
      ],
    };
    const built = buildSceneGraph(scene);
    applySelection(built.nodes, 'm-1');
    const lamp = findStatusLamp(built.nodes.get('m-1')!);
    const lampMat = lamp!.material as MeshStandardMaterial;
    expect(lampMat.color.getHex()).toBe(SELECTION_COLOR);

    const body = built.nodes.get('m-1')!.getObjectByName('cabinetBody') as Mesh;
    const bodyMat = body.material as MeshStandardMaterial;
    expect(bodyMat.color.getHex()).not.toBe(SELECTION_COLOR);
    expect(bodyMat.color.getHex()).not.toBe(STATUS_COLORS.online);
  });
});

describe('asset cache', () => {
  it('caches templates by URL and clones instances', async () => {
    const loadGlb = vi.fn(async () => {
      const g = new Group();
      g.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial()));
      return g;
    });
    const cache = createAssetCache({
      resolveUrl: (id) => (id === 'dt.machine.cnc-v1' ? '/x.glb' : null),
      loadGlb,
    });
    expect(cache.resolve('dt.machine.cnc-v1')).toBe('/x.glb');
    expect(cache.resolve('missing')).toBeNull();

    const a = await cache.createInstance('/x.glb');
    const b = await cache.createInstance('/x.glb');
    expect(loadGlb).toHaveBeenCalledTimes(1);
    expect(a).not.toBe(b);
  });
});

describe('upgradeSceneAssets', () => {
  const baseScene: SceneSnapshot = {
    id: 's1',
    tenantId: 't',
    name: 'n',
    nodes: [
      {
        id: 'm-1',
        tenantId: 't',
        name: 'CNC',
        type: 'machine',
        position: [1, 0.5, 2],
        status: 'online',
        modelId: 'dt.machine.cnc-v1',
      },
    ],
  };

  it('replaces placeholders via mocked loadGlb and reports progress', async () => {
    const events: Array<{ type: string }> = [];
    const loadGlb = vi.fn(async () => {
      const g = new Group();
      g.name = 'glb-root';
      return g;
    });
    const ensureLocalUrl = vi.fn(async (url: string) => `blob:cached:${url}`);
    const cache = createAssetCache({
      resolveUrl: () => '/assets/viewport/dt.machine.cnc-v1.glb',
      ensureLocalUrl,
      loadGlb,
    });
    const built = buildSceneGraph(baseScene);
    expect(built.nodes.get('m-1')?.getObjectByName('cabinetBody')).toBeTruthy();

    await upgradeSceneAssets({
      built,
      scene: baseScene,
      cache,
      selectedId: null,
      isCancelled: () => false,
      onEvent: (ev) => events.push({ type: ev.type }),
    });

    expect(ensureLocalUrl).toHaveBeenCalledWith(
      '/assets/viewport/dt.machine.cnc-v1.glb',
    );
    expect(loadGlb).toHaveBeenCalledWith(
      'blob:cached:/assets/viewport/dt.machine.cnc-v1.glb',
    );
    expect(built.nodes.get('m-1')?.getObjectByName('cabinetBody')).toBeFalsy();
    expect(findStatusLamp(built.nodes.get('m-1')!)).toBeTruthy();
    expect(events.some((e) => e.type === 'progress')).toBe(true);
    expect(events.some((e) => e.type === 'complete')).toBe(true);
  });

  it('emits node-fallback when resolveUrl returns null', async () => {
    const fallbacks: string[] = [];
    const cache = createAssetCache({
      resolveUrl: () => null,
      loadGlb: async () => new Group(),
    });
    const built = buildSceneGraph(baseScene);
    await upgradeSceneAssets({
      built,
      scene: baseScene,
      cache,
      selectedId: null,
      isCancelled: () => false,
      onEvent: (ev) => {
        if (ev.type === 'node-fallback') fallbacks.push(ev.nodeId);
      },
    });
    expect(fallbacks).toEqual(['m-1']);
    expect(built.nodes.get('m-1')?.getObjectByName('cabinetBody')).toBeTruthy();
  });

  it('emits node-fallback when loadGlb rejects', async () => {
    const reasons: string[] = [];
    const cache = createAssetCache({
      resolveUrl: () => '/broken.glb',
      loadGlb: async () => {
        throw new Error('404');
      },
    });
    const built = buildSceneGraph(baseScene);
    await upgradeSceneAssets({
      built,
      scene: baseScene,
      cache,
      selectedId: null,
      isCancelled: () => false,
      onEvent: (ev) => {
        if (ev.type === 'node-fallback') reasons.push(ev.reason);
      },
    });
    expect(reasons).toEqual(['404']);
  });
});
