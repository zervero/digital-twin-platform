/**
 * Scene factory.
 *
 * Pure helpers that take a `SceneSnapshot` and produce Three.js objects.
 * Kept separate from the engine class so unit tests can verify the
 * structure of the returned graph without spinning up a renderer.
 */

import {
  BoxGeometry,
  GridHelper,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three';
import type { CylinderGeometry, Object3D } from 'three';

import type { DeviceStatus, SceneNode, SceneSnapshot } from '@dt/contracts';

import { FLOOR_COLOR, GRID_COLOR, SELECTION_COLOR, STATUS_COLORS } from './colors.js';

export interface NodeUserData {
  nodeId: string;
  status: DeviceStatus;
}

const STATUS_DEFAULT: DeviceStatus = 'offline';

function geometryForType(type: SceneNode['type']): {
  geometry: BoxGeometry | CylinderGeometry | SphereGeometry;
  height: number;
} {
  switch (type) {
    case 'factory':
      return { geometry: new BoxGeometry(8, 0.1, 6), height: 0.05 };
    case 'area':
      return { geometry: new BoxGeometry(3, 0.05, 2), height: 0.025 };
    case 'machine':
      return { geometry: new BoxGeometry(1.2, 1, 1.2), height: 0.5 };
    case 'sensor':
      return { geometry: new SphereGeometry(0.2, 16, 12), height: 1.4 };
  }
}

function makeFloor(): Object3D {
  const grid = new GridHelper(20, 20, GRID_COLOR, GRID_COLOR);
  // GridHelper sits on Y=0 by default; leave it.
  // Tint via material color so it picks up the muted floor palette.
  const floorMaterial = new MeshStandardMaterial({ color: FLOOR_COLOR, roughness: 0.95 });
  const floor = new Mesh(new BoxGeometry(20, 0.02, 20), floorMaterial);
  floor.position.y = -0.01;
  const group = new Group();
  group.add(grid);
  group.add(floor);
  return group;
}

export interface BuiltScene {
  group: Group;
  nodes: Map<string, Mesh>;
}

export function buildSceneGraph(scene: SceneSnapshot): BuiltScene {
  const group = new Group();
  group.name = `scene:${scene.id}`;
  group.add(makeFloor());

  const nodes = new Map<string, Mesh>();

  for (const node of scene.nodes) {
    const status: DeviceStatus = node.status ?? STATUS_DEFAULT;
    const { geometry, height } = geometryForType(node.type);
    const material = new MeshStandardMaterial({
      color: STATUS_COLORS[status],
      roughness: 0.4,
      metalness: 0.1,
    });
    const mesh = new Mesh(geometry, material);
    mesh.position.set(node.position[0], height, node.position[2]);
    mesh.userData = { nodeId: node.id, status } satisfies NodeUserData;
    mesh.name = node.id;
    nodes.set(node.id, mesh);
    group.add(mesh);
  }

  return { group, nodes };
}

export function applySelection(
  nodes: Map<string, Mesh>,
  selectedId: string | null,
): void {
  for (const [id, mesh] of nodes) {
    const data = mesh.userData as NodeUserData;
    const baseColor = STATUS_COLORS[data.status];
    const material = mesh.material as MeshStandardMaterial;
    if (id === selectedId) {
      material.color.setHex(SELECTION_COLOR);
      material.emissive.setHex(SELECTION_COLOR);
      material.emissiveIntensity = 0.35;
    } else {
      material.color.setHex(baseColor);
      material.emissive.setHex(baseColor);
      material.emissiveIntensity = 0.05;
    }
  }
}
