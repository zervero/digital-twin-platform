/**
 * Scene query helpers.
 *
 * The V1 scene is a flat array of nodes. Lookup is O(n); once we move to V2
 * with thousands of nodes we'll add a Map index here without changing the
 * public API.
 */

import type { SceneNode, SceneSnapshot } from '@dt/contracts';

export function findSceneNode(
  scene: SceneSnapshot,
  nodeId: string,
): SceneNode | undefined {
  return scene.nodes.find((n) => n.id === nodeId);
}

export function findSceneNodesByType(
  scene: SceneSnapshot,
  type: SceneNode['type'],
): SceneNode[] {
  return scene.nodes.filter((n) => n.type === type);
}

/**
 * Defensive normalizer that fills in defaults for missing optional fields.
 * The BFF in V1 already returns complete data, but this guards the engine
 * SDK against partial responses from future realtime sources.
 */
export function normalizeSceneSnapshot(input: SceneSnapshot): SceneSnapshot {
  return {
    id: input.id,
    name: input.name,
    nodes: input.nodes.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      position: [
        node.position[0] ?? 0,
        node.position[1] ?? 0,
        node.position[2] ?? 0,
      ] as [number, number, number],
      ...(node.status !== undefined ? { status: node.status } : {}),
    })),
  };
}
