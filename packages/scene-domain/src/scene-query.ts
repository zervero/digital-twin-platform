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
 *
 * V3.3: `tenantId` is a required field on both SceneNode and
 * SceneSnapshot, so the normalizer carries it through from the
 * input. The normalizer does not synthesize a default value; if
 * the caller hands us an object without a tenant, the upstream
 * type system already prevented that. This is intentional, so
 * a missing tenant at runtime surfaces as `undefined` rather
 * than silently inventing a tenant the caller never approved.
 */
export function normalizeSceneSnapshot(input: SceneSnapshot): SceneSnapshot {
  return {
    id: input.id,
    tenantId: input.tenantId,
    name: input.name,
    nodes: input.nodes.map((node) => ({
      id: node.id,
      tenantId: node.tenantId,
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
