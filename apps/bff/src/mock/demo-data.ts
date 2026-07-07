/**
 * Mock data for V1.
 *
 * One factory, one area, four machines, and a sensor per machine. The sensor
 * inherits its machine's status so the UI can show consistent colors.
 *
 * V3.3 T1 deviation: every node and device carries an `acme-corp` tenant
 * placeholder so the contract-required `tenantId` field is satisfied and
 * the user's pre-push typecheck gate stays green. T5 (BFF mock data split
 * into 3 tenants) replaces this single-tenant shim with a proper
 * `acme-corp` + `globex-ind` + `initech-llc` registry.
 */

import type { Device, SceneSnapshot } from '@dt/contracts';

export const DEMO_SCENE: SceneSnapshot = {
  id: 'scene-factory-a',
  tenantId: 'acme-corp',
  name: 'Factory A',
  nodes: [
    { id: 'factory-a', tenantId: 'acme-corp', name: 'Factory A', type: 'factory', position: [0, 0, 0] },
    { id: 'area-1', tenantId: 'acme-corp', name: 'Workshop 1', type: 'area', position: [4, 0, 0] },
    { id: 'machine-1', tenantId: 'acme-corp', name: 'CNC-01', type: 'machine', position: [5, 0.5, 1], status: 'online' },
    { id: 'sensor-1', tenantId: 'acme-corp', name: 'CNC-01 Temp', type: 'sensor', position: [5, 1.4, 1], status: 'online' },
    { id: 'machine-2', tenantId: 'acme-corp', name: 'CNC-02', type: 'machine', position: [7, 0.5, 1], status: 'warning' },
    { id: 'sensor-2', tenantId: 'acme-corp', name: 'CNC-02 Temp', type: 'sensor', position: [7, 1.4, 1], status: 'warning' },
    { id: 'machine-3', tenantId: 'acme-corp', name: 'CNC-03', type: 'machine', position: [5, 0.5, 3], status: 'alarm' },
    { id: 'sensor-3', tenantId: 'acme-corp', name: 'CNC-03 Temp', type: 'sensor', position: [5, 1.4, 3], status: 'alarm' },
    { id: 'machine-4', tenantId: 'acme-corp', name: 'CNC-04', type: 'machine', position: [7, 0.5, 3], status: 'offline' },
    { id: 'sensor-4', tenantId: 'acme-corp', name: 'CNC-04 Temp', type: 'sensor', position: [7, 1.4, 3], status: 'offline' },
  ],
};

export const DEMO_DEVICES: Device[] = DEMO_SCENE.nodes
  .filter((n) => n.type === 'machine')
  .map((n, i) => ({
    id: `device-${i + 1}`,
    tenantId: 'acme-corp',
    name: n.name,
    status: n.status ?? 'offline',
    sceneNodeId: n.id,
    updatedAt: new Date('2026-01-01T08:00:00.000Z').toISOString(),
  }));
