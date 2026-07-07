/**
 * Mock data for V1 / V3.3.
 *
 * Two coexisting shapes live in this module:
 *
 *   - The **legacy** `DEMO_SCENE` and `DEMO_DEVICES` exports
 *     preserve the V1-V3.2-era shape (id `scene-factory-a`,
 *     4 machines, ids `device-1..device-4`) and are pointed
 *     at `acme-corp`. Anything that imports them directly --
 *     `apps/bff/src/realtime/dev-source.ts`, the protected-
 *     routes tests, the V2 smoke -- keeps working without
 *     changes. T6 will switch the production routes off these
 *     and onto the per-tenant helpers below; until then,
 *     `dev-source.ts` continues to emit a single global
 *     device list.
 *
 *   - The **V3.3** multi-tenant data: `DEMO_TENANTS` is the
 *     three-tenant registry, and `getSceneForTenant` /
 *     `getDevicesForTenant` produce per-tenant scenes /
 *     devices on demand. Status distribution per tenant is
 *     hand-tuned (step 5.1 of the V3.3 plan) so a smoke run
 *     can verify the routes return tenant-specific data
 *     without writing per-tenant assertions:
 *
 *       acme-corp   (3 machines): online, warning, alarm
 *       globex-ind  (2 machines): online, online
 *       initech-llc (4 machines): online, warning, offline, alarm
 *
 * The per-tenant scene for `acme-corp` (3 machines) is
 * intentionally different from the legacy `DEMO_SCENE` (4
 * machines). They are two separate data sets; the legacy
 * alias exists so the V1-V3.2-era tests and `dev-source.ts`
 * heartbeat don't have to change in lockstep with V3.3.
 * T7 closes the divergence on the realtime side: the
 * broadcaster emits only per-tenant events so the WS view
 * and the HTTP view agree.
 */

import type {
  Device,
  DeviceStatus,
  SceneNode,
  SceneSnapshot,
} from '@dt/contracts';
import type { Tenant } from '@dt/tenant';

// ---------------------------------------------------------------------------
// Legacy V1-V3.2 single-tenant exports (back-compat).
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// V3.3 multi-tenant registry + per-tenant data.
// ---------------------------------------------------------------------------

export const DEMO_TENANTS: readonly Tenant[] = [
  {
    id: 'acme-corp',
    slug: 'acme-corp',
    name: 'Acme Corporation',
    plan: 'pro',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'globex-ind',
    slug: 'globex-ind',
    name: 'Globex Industries',
    plan: 'free',
    createdAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'initech-llc',
    slug: 'initech-llc',
    name: 'Initech LLC',
    plan: 'free',
    createdAt: '2026-02-01T00:00:00.000Z',
  },
];

/**
 * Build a per-tenant scene: one factory node, one area node,
 * then `machineStatuses.length` machine nodes plus one sensor
 * per machine. The factory name and id prefix are tenant-
 * specific so the same smoke run can assert "tenant A sees
 * its own factory; tenant B does not."
 */
function buildScene(
  tenantId: string,
  factoryName: string,
  machineStatuses: readonly DeviceStatus[],
): SceneSnapshot {
  const nodes: SceneNode[] = [
    {
      id: `${tenantId}-factory`,
      tenantId,
      name: factoryName,
      type: 'factory',
      position: [0, 0, 0],
    },
    {
      id: `${tenantId}-area-1`,
      tenantId,
      name: 'Workshop 1',
      type: 'area',
      position: [4, 0, 0],
    },
  ];
  machineStatuses.forEach((status, i) => {
    // Lay machines out on a 2-column grid so the scene is
    // visually compact regardless of how many machines the
    // tenant has. Columns are at x=5 and x=7; rows at z=1
    // and z=3 (so a 4-machine tenant occupies the whole grid).
    const x = 5 + (i % 2) * 2;
    const z = 1 + Math.floor(i / 2) * 2;
    const machineId = `${tenantId}-machine-${i + 1}`;
    const sensorId = `${tenantId}-sensor-${i + 1}`;
    const machineName = `CNC-${String(i + 1).padStart(2, '0')}`;
    nodes.push(
      {
        id: machineId,
        tenantId,
        name: machineName,
        type: 'machine',
        position: [x, 0.5, z],
        status,
      },
      {
        id: sensorId,
        tenantId,
        name: `${machineName} Temp`,
        type: 'sensor',
        position: [x, 1.4, z],
        status,
      },
    );
  });
  return {
    id: `${tenantId}-scene`,
    tenantId,
    name: `${factoryName} (${tenantId})`,
    nodes,
  };
}

const DEMO_SCENE_BY_TENANT: Readonly<Record<string, SceneSnapshot>> = {
  'acme-corp': buildScene('acme-corp', 'Acme Factory', [
    'online',
    'warning',
    'alarm',
  ]),
  'globex-ind': buildScene('globex-ind', 'Globex Plant', [
    'online',
    'online',
  ]),
  'initech-llc': buildScene('initech-llc', 'Initech Works', [
    'online',
    'warning',
    'offline',
    'alarm',
  ]),
};

/**
 * Resolve the scene for a tenant. Returns `null` when the
 * tenant is unknown so the route can map that to a 403
 * `TENANT_FORBIDDEN` (T6); an empty scene would be a lie
 * ("you have a tenant but no scene to render") so we don't
 * return one.
 */
export function getSceneForTenant(tenantId: string): SceneSnapshot | null {
  return DEMO_SCENE_BY_TENANT[tenantId] ?? null;
}

function buildDevicesFor(scene: SceneSnapshot): readonly Device[] {
  return scene.nodes
    .filter((n) => n.type === 'machine')
    .map((n, i) => ({
      id: `${scene.tenantId}-device-${i + 1}`,
      tenantId: scene.tenantId,
      name: n.name,
      status: n.status ?? 'offline',
      sceneNodeId: n.id,
      updatedAt: new Date('2026-01-01T08:00:00.000Z').toISOString(),
    }));
}

const DEMO_DEVICES_BY_TENANT: Readonly<Record<string, readonly Device[]>> =
  Object.fromEntries(
    Object.entries(DEMO_SCENE_BY_TENANT).map(([id, scene]) => [
      id,
      buildDevicesFor(scene),
    ]),
  );

/**
 * Resolve the device list for a tenant. Returns an empty
 * array when the tenant is unknown so the route's
 * `c.json(getDevicesForTenant(tenant.id))` call doesn't need
 * to null-check; the route just renders an empty list, which
 * is a fine UX for a stale / unknown tenant id (the
 * middleware already rejected those at the gate, so this
 * code path only runs for valid tenants).
 */
export function getDevicesForTenant(tenantId: string): readonly Device[] {
  return DEMO_DEVICES_BY_TENANT[tenantId] ?? [];
}
