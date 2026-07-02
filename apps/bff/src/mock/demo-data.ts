/**
 * Mock data for V1.
 *
 * One factory, one area, four machines, and a sensor per machine. The sensor
 * inherits its machine's status so the UI can show consistent colors.
 */

import type { Device, SceneSnapshot } from '@dt/contracts';

export const DEMO_SCENE: SceneSnapshot = {
  id: 'scene-factory-a',
  name: 'Factory A',
  nodes: [
    { id: 'factory-a', name: 'Factory A', type: 'factory', position: [0, 0, 0] },
    { id: 'area-1', name: 'Workshop 1', type: 'area', position: [4, 0, 0] },
    { id: 'machine-1', name: 'CNC-01', type: 'machine', position: [5, 0.5, 1], status: 'online' },
    { id: 'sensor-1', name: 'CNC-01 Temp', type: 'sensor', position: [5, 1.4, 1], status: 'online' },
    { id: 'machine-2', name: 'CNC-02', type: 'machine', position: [7, 0.5, 1], status: 'warning' },
    { id: 'sensor-2', name: 'CNC-02 Temp', type: 'sensor', position: [7, 1.4, 1], status: 'warning' },
    { id: 'machine-3', name: 'CNC-03', type: 'machine', position: [5, 0.5, 3], status: 'alarm' },
    { id: 'sensor-3', name: 'CNC-03 Temp', type: 'sensor', position: [5, 1.4, 3], status: 'alarm' },
    { id: 'machine-4', name: 'CNC-04', type: 'machine', position: [7, 0.5, 3], status: 'offline' },
    { id: 'sensor-4', name: 'CNC-04 Temp', type: 'sensor', position: [7, 1.4, 3], status: 'offline' },
  ],
};

export const DEMO_DEVICES: Device[] = DEMO_SCENE.nodes
  .filter((n) => n.type === 'machine')
  .map((n, i) => ({
    id: `device-${i + 1}`,
    name: n.name,
    status: n.status ?? 'offline',
    sceneNodeId: n.id,
    updatedAt: new Date('2026-01-01T08:00:00.000Z').toISOString(),
  }));
