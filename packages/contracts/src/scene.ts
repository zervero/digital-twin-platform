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
  name: string;
  type: SceneNodeType;
  position: [number, number, number];
  status?: DeviceStatus;
}

export interface SceneSnapshot {
  id: string;
  name: string;
  nodes: SceneNode[];
}
