/**
 * Scene graph shared types.
 *
 * The scene is a flat list of nodes rather than a tree for V1. Hierarchy can
 * be added later via a `parentId` field without breaking the public shape.
 */

import type { DeviceStatus } from './device.js';

export type SceneNodeType = 'factory' | 'area' | 'machine' | 'sensor';

export interface SceneNode {
  id: string;
  /**
   * V3.3: owning tenant ID. Required on every SceneNode so
   * the BFF can filter a scene response to the caller's
   * tenant and so realtime events carry the tenant context
   * the broadcaster uses to filter subscribers.
   */
  tenantId: string;
  name: string;
  type: SceneNodeType;
  position: [number, number, number];
  status?: DeviceStatus;
}

export interface SceneSnapshot {
  id: string;
  /**
   * V3.3: owning tenant ID. The snapshot itself is tenant-
   * scoped; the BFF rejects `/api/scene` requests whose
   * session tenant does not match the snapshot's tenant.
   */
  tenantId: string;
  name: string;
  nodes: SceneNode[];
}
