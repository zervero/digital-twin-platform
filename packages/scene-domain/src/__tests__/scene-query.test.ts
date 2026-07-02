import { describe, expect, it } from 'vitest';

import type { SceneNode, SceneSnapshot } from '@dt/contracts';

import {
  findSceneNode,
  findSceneNodesByType,
  normalizeSceneSnapshot,
} from '../index.js';

const baseNodes: SceneNode[] = [
  { id: 'factory-1', name: 'Factory A', type: 'factory', position: [0, 0, 0] },
  { id: 'area-1', name: 'Area 1', type: 'area', position: [5, 0, 0] },
  { id: 'machine-1', name: 'CNC-01', type: 'machine', position: [6, 0, 1], status: 'online' },
  { id: 'machine-2', name: 'CNC-02', type: 'machine', position: [7, 0, 1], status: 'alarm' },
];

const scene: SceneSnapshot = { id: 'scene-1', name: 'Main', nodes: baseNodes };

describe('@dt/scene-domain', () => {
  it('finds a node by id', () => {
    expect(findSceneNode(scene, 'machine-1')?.name).toBe('CNC-01');
  });

  it('returns undefined for an unknown id', () => {
    expect(findSceneNode(scene, 'missing')).toBeUndefined();
  });

  it('filters nodes by type', () => {
    const machines = findSceneNodesByType(scene, 'machine');
    expect(machines).toHaveLength(2);
  });

  it('normalizes a snapshot, filling defaults', () => {
    const partial: SceneSnapshot = {
      id: 's',
      name: 'S',
      nodes: [
        { id: 'a', name: 'A', type: 'area', position: [1, 2, 3] },
        { id: 'b', name: 'B', type: 'area', position: [4, 5] as unknown as [number, number, number] },
      ],
    };
    const normalized = normalizeSceneSnapshot(partial);
    expect(normalized.nodes[0]?.position).toEqual([1, 2, 3]);
    expect(normalized.nodes[1]?.position).toEqual([4, 5, 0]);
    expect(normalized.nodes[1]?.status).toBeUndefined();
  });

  it('preserves status when normalizing', () => {
    const normalized = normalizeSceneSnapshot(scene);
    expect(normalized.nodes.find((n) => n.id === 'machine-2')?.status).toBe('alarm');
  });
});
