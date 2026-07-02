/**
 * State-focused tests for the engine.
 *
 * We avoid spinning up a real WebGL renderer. Instead we exercise the public
 * surface that does not require GL: status -> color mapping, scene graph
 * building, and selection application. The renderer itself is wired through
 * the public DigitalTwinEngine API and can be smoke-tested in a browser.
 */

import { describe, expect, it } from 'vitest';
import type { MeshStandardMaterial } from 'three';

import type { SceneSnapshot } from '@dt/contracts';

import { STATUS_COLORS, SELECTION_COLOR } from '../colors.js';
import { applySelection, buildSceneGraph } from '../scene-factory.js';

const scene: SceneSnapshot = {
  id: 'scene-1',
  name: 'Test',
  nodes: [
    { id: 'm-1', name: 'M-1', type: 'machine', position: [0, 0, 0], status: 'online' },
    { id: 'm-2', name: 'M-2', type: 'machine', position: [2, 0, 0], status: 'alarm' },
    { id: 's-1', name: 'S-1', type: 'sensor', position: [0, 1, 0], status: 'warning' },
  ],
};

describe('@dt/engine-sdk state', () => {
  it('exposes a unique color per status', () => {
    const colors = new Set(Object.values(STATUS_COLORS));
    expect(colors.size).toBe(4);
  });

  it('builds one mesh per node', () => {
    const built = buildSceneGraph(scene);
    expect(built.nodes.size).toBe(3);
  });

  it('attaches node id and status to userData', () => {
    const built = buildSceneGraph(scene);
    const m1 = built.nodes.get('m-1');
    expect(m1?.userData).toMatchObject({ nodeId: 'm-1', status: 'online' });
  });

  it('positions meshes by node.position', () => {
    const built = buildSceneGraph(scene);
    const s1 = built.nodes.get('s-1');
    expect(s1?.position.x).toBe(0);
    expect(s1?.position.z).toBe(0);
  });

  it('tints selected mesh with the selection color and others with their status', () => {
    const built = buildSceneGraph(scene);
    applySelection(built.nodes, 'm-2');
    const selected = built.nodes.get('m-2')?.material as MeshStandardMaterial;
    const other = built.nodes.get('m-1')?.material as MeshStandardMaterial;
    expect(selected.color.getHex()).toBe(SELECTION_COLOR);
    expect(other.color.getHex()).toBe(STATUS_COLORS.online);
  });

  it('clears selection when null is passed', () => {
    const built = buildSceneGraph(scene);
    applySelection(built.nodes, 'm-2');
    applySelection(built.nodes, null);
    const m2 = built.nodes.get('m-2')?.material as MeshStandardMaterial;
    expect(m2.color.getHex()).toBe(STATUS_COLORS.alarm);
  });

  it('falls back to offline color when status is missing', () => {
    const partial: SceneSnapshot = {
      id: 's',
      name: 's',
      nodes: [{ id: 'x', name: 'X', type: 'machine', position: [0, 0, 0] }],
    };
    const built = buildSceneGraph(partial);
    const mesh = built.nodes.get('x')?.material as MeshStandardMaterial;
    expect(mesh.color.getHex()).toBe(STATUS_COLORS.offline);
  });
});
