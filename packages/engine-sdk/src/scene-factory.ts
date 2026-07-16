/**
 * Scene factory.
 *
 * Pure helpers that take a `SceneSnapshot` and produce Three.js objects.
 * Kept separate from the engine class so unit tests can verify the
 * structure of the returned graph without spinning up a renderer.
 *
 * Scheme C (ADR 0021): build **A-light** procedural placeholders first.
 * Status / selection tint live on a lamp child (`userData.role = 'statusLamp'`),
 * not on cabinet/pad albedo. GLB instances replace these roots asynchronously.
 */

import {
  BoxGeometry,
  CylinderGeometry,
  GridHelper,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three';
import type { Object3D } from 'three';

import type { DeviceStatus, SceneNode, SceneSnapshot } from '@dt/contracts';

import { FLOOR_COLOR, GRID_COLOR, SELECTION_COLOR, STATUS_COLORS } from './colors.js';

export interface NodeUserData {
  nodeId: string;
  status: DeviceStatus;
  role?: string;
}

const STATUS_DEFAULT: DeviceStatus = 'offline';

/** Neutral industrial body tones — status is lamp-only. */
const BODY_COLOR = 0x5a6169;
const PEDESTAL_COLOR = 0x3a3f46;
const PAD_COLOR = 0x2a3038;

function makeFloor(): Object3D {
  const grid = new GridHelper(20, 20, GRID_COLOR, GRID_COLOR);
  const floorMaterial = new MeshStandardMaterial({ color: FLOOR_COLOR, roughness: 0.95 });
  const floor = new Mesh(new BoxGeometry(20, 0.02, 20), floorMaterial);
  floor.position.y = -0.01;
  const group = new Group();
  group.add(grid);
  group.add(floor);
  return group;
}

/**
 * Status / selection accessory. Name + userData.role are stable so
 * GLB swap + tests can find the lamp without albedo inspection.
 */
export function makeStatusLamp(status: DeviceStatus): Mesh {
  const material = new MeshStandardMaterial({
    color: STATUS_COLORS[status],
    emissive: STATUS_COLORS[status],
    emissiveIntensity: 0.45,
    roughness: 0.35,
    metalness: 0.1,
  });
  const lamp = new Mesh(new SphereGeometry(0.08, 12, 10), material);
  lamp.name = 'statusLamp';
  lamp.userData = { role: 'statusLamp' } satisfies Pick<NodeUserData, 'role'>;
  return lamp;
}

export function findStatusLamp(root: Object3D): Mesh | null {
  const byName = root.getObjectByName('statusLamp');
  if (byName && (byName as Mesh).isMesh) return byName as Mesh;
  let found: Mesh | null = null;
  root.traverse((obj) => {
    if (found) return;
    if ((obj as Mesh).isMesh && obj.userData?.role === 'statusLamp') {
      found = obj as Mesh;
    }
  });
  return found;
}

export function attachStatusLamp(root: Object3D, status: DeviceStatus, localY = 1.35): Mesh {
  const existing = findStatusLamp(root);
  if (existing) {
    applyLampColors(existing, status, false);
    return existing;
  }
  const lamp = makeStatusLamp(status);
  lamp.position.set(0, localY, 0);
  root.add(lamp);
  return lamp;
}

function applyLampColors(lamp: Mesh, status: DeviceStatus, selected: boolean): void {
  const material = lamp.material as MeshStandardMaterial;
  if (selected) {
    material.color.setHex(SELECTION_COLOR);
    material.emissive.setHex(SELECTION_COLOR);
    material.emissiveIntensity = 0.85;
  } else {
    const base = STATUS_COLORS[status];
    material.color.setHex(base);
    material.emissive.setHex(base);
    material.emissiveIntensity = 0.45;
  }
}

export function buildMachinePlaceholder(status: DeviceStatus): Group {
  const root = new Group();
  root.name = 'placeholder:machine';

  const pedestal = new Mesh(
    new BoxGeometry(1.2, 0.12, 1.0),
    new MeshStandardMaterial({ color: PEDESTAL_COLOR, metalness: 0.45, roughness: 0.55 }),
  );
  pedestal.name = 'pedestal';
  pedestal.position.y = 0.06;
  root.add(pedestal);

  const cabinetBody = new Mesh(
    new BoxGeometry(1.0, 1.1, 0.85),
    new MeshStandardMaterial({ color: BODY_COLOR, metalness: 0.55, roughness: 0.4 }),
  );
  cabinetBody.name = 'cabinetBody';
  cabinetBody.position.y = 0.7;
  root.add(cabinetBody);

  const lamp = makeStatusLamp(status);
  lamp.position.set(0.35, 1.35, 0.35);
  root.add(lamp);
  return root;
}

export function buildSensorPlaceholder(status: DeviceStatus): Group {
  const root = new Group();
  root.name = 'placeholder:sensor';

  const pole = new Mesh(
    new CylinderGeometry(0.06, 0.08, 1.0, 12),
    new MeshStandardMaterial({ color: PEDESTAL_COLOR, metalness: 0.4, roughness: 0.5 }),
  );
  pole.name = 'pole';
  pole.position.y = 0.5;
  root.add(pole);

  const lamp = makeStatusLamp(status);
  lamp.position.set(0, 1.15, 0);
  root.add(lamp);
  return root;
}

export function buildPadPlaceholder(type: 'factory' | 'area'): Group {
  const root = new Group();
  root.name = `placeholder:${type}`;
  const size = type === 'factory' ? ([8, 0.08, 6] as const) : ([3, 0.05, 2] as const);
  const pad = new Mesh(
    new BoxGeometry(size[0], size[1], size[2]),
    new MeshStandardMaterial({ color: PAD_COLOR, roughness: 0.9, metalness: 0.05 }),
  );
  pad.name = 'pad';
  pad.position.y = size[1] / 2;
  root.add(pad);
  return root;
}

function buildNodeRoot(node: SceneNode): Group {
  const status: DeviceStatus = node.status ?? STATUS_DEFAULT;
  let root: Group;
  switch (node.type) {
    case 'machine':
      root = buildMachinePlaceholder(status);
      break;
    case 'sensor':
      root = buildSensorPlaceholder(status);
      break;
    case 'factory':
      root = buildPadPlaceholder('factory');
      break;
    case 'area':
      root = buildPadPlaceholder('area');
      break;
  }
  // Nodes place at scene coordinates; Y comes from Snapshot (demo uses 0.5 / 1.4).
  root.position.set(node.position[0], node.position[1], node.position[2]);
  root.userData = { nodeId: node.id, status } satisfies NodeUserData;
  root.name = node.id;
  return root;
}

export interface BuiltScene {
  group: Group;
  /** Node roots (A-light placeholders or GLB instances). */
  nodes: Map<string, Object3D>;
}

export function buildSceneGraph(scene: SceneSnapshot): BuiltScene {
  const group = new Group();
  group.name = `scene:${scene.id}`;
  group.add(makeFloor());

  const nodes = new Map<string, Object3D>();

  for (const node of scene.nodes) {
    const root = buildNodeRoot(node);
    nodes.set(node.id, root);
    group.add(root);
  }

  return { group, nodes };
}

export function applySelection(
  nodes: Map<string, Object3D>,
  selectedId: string | null,
): void {
  for (const [id, root] of nodes) {
    const data = root.userData as NodeUserData;
    const lamp = findStatusLamp(root);
    if (!lamp) continue;
    applyLampColors(lamp, data.status, id === selectedId);
  }
}
