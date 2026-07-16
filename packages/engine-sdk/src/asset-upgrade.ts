/**
 * Progressive A-light → GLB replace for a built scene graph.
 * Pure of WebGL / renderer so unit tests can drive it with a mocked cache.
 */

import type { DeviceStatus, SceneSnapshot } from '@dt/contracts';

import type { AssetCache } from './asset-loader.js';
import {
  applySelection,
  attachStatusLamp,
  type BuiltScene,
  type NodeUserData,
} from './scene-factory.js';
import type { AssetLoadEvent } from './types.js';
import type { Object3D } from 'three';

function disposeObject(obj: Object3D): void {
  obj.traverse((child) => {
    const o = child as {
      geometry?: { dispose: () => void };
      material?: { dispose: () => void } | Array<{ dispose: () => void }>;
    };
    o.geometry?.dispose();
    const mat = o.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  });
}

export async function upgradeSceneAssets(opts: {
  built: BuiltScene;
  scene: SceneSnapshot;
  cache: AssetCache;
  selectedId: string | null;
  isCancelled: () => boolean;
  onEvent: (ev: AssetLoadEvent) => void;
}): Promise<void> {
  const { built, scene, cache, selectedId, isCancelled, onEvent } = opts;
  const jobs = scene.nodes.filter((n) => n.modelId);
  const total = jobs.length;
  onEvent({ type: 'progress', loaded: 0, total });

  if (total === 0) {
    onEvent({ type: 'complete' });
    return;
  }

  let loaded = 0;
  await Promise.all(
    jobs.map(async (node) => {
      const modelId = node.modelId!;
      const url = cache.resolve(modelId);
      if (!url) {
        onEvent({
          type: 'node-fallback',
          nodeId: node.id,
          reason: `Unknown modelId: ${modelId}`,
        });
        loaded += 1;
        onEvent({ type: 'progress', loaded, total });
        return;
      }
      try {
        const instance = await cache.createInstance(url);
        if (isCancelled()) {
          disposeObject(instance);
          return;
        }
        const previous = built.nodes.get(node.id);
        if (!previous) {
          disposeObject(instance);
          return;
        }
        const status = ((previous.userData as NodeUserData).status ??
          'offline') as DeviceStatus;
        instance.position.copy(previous.position);
        instance.userData = { nodeId: node.id, status } satisfies NodeUserData;
        instance.name = node.id;
        attachStatusLamp(instance, status, 1.4);
        built.group.remove(previous);
        disposeObject(previous);
        built.group.add(instance);
        built.nodes.set(node.id, instance);
        applySelection(built.nodes, selectedId);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        onEvent({ type: 'node-fallback', nodeId: node.id, reason });
      }
      loaded += 1;
      onEvent({ type: 'progress', loaded, total });
    }),
  );

  if (!isCancelled()) {
    onEvent({ type: 'complete' });
  }
}
