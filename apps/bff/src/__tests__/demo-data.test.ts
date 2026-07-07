/**
 * Tests for the V3.3 multi-tenant mock data.
 *
 * The plan's T5 spec calls for the registry to be a single
 * source of truth for the three dev tenants, and for
 * `getSceneForTenant` / `getDevicesForTenant` to produce
 * per-tenant data on demand. T6 routes will exercise the
 * helpers indirectly via HTTP; this file sanity-checks the
 * data shapes and per-tenant status distribution directly
 * so a regression in the fixture is caught before T6 starts
 * layering routes on top.
 *
 * The legacy `DEMO_SCENE` / `DEMO_DEVICES` exports stay as
 * they were in V3.2 (covered by `protected-routes.test.ts`
 * via the route handlers; the tests here only assert the
 * per-tenant shape, not the legacy alias).
 */

import { describe, expect, it } from 'vitest';

import {
  DEMO_TENANTS,
  getDevicesForTenant,
  getSceneForTenant,
} from '../mock/demo-data.js';

describe('V3.3 multi-tenant mock data (T5)', () => {
  describe('DEMO_TENANTS', () => {
    it('contains exactly the three V3.3 dev tenants', () => {
      const ids = DEMO_TENANTS.map((t) => t.id).sort();
      expect(ids).toEqual(['acme-corp', 'globex-ind', 'initech-llc']);
    });

    it('uses distinct plans so a smoke can assert billing metadata', () => {
      const plans = Object.fromEntries(
        DEMO_TENANTS.map((t) => [t.id, t.plan]),
      );
      // Plan distribution is deliberately uneven: acme-corp
      // is the paying customer, the other two are on the
      // free tier. This makes a future "free-tier rate
      // limit" feature a one-assertion test away.
      expect(plans['acme-corp']).toBe('pro');
      expect(plans['globex-ind']).toBe('free');
      expect(plans['initech-llc']).toBe('free');
    });
  });

  describe('getSceneForTenant', () => {
    it('returns a scene for every registered tenant', () => {
      for (const t of DEMO_TENANTS) {
        const scene = getSceneForTenant(t.id);
        expect(scene, `scene for ${t.id}`).not.toBeNull();
        expect(scene?.tenantId).toBe(t.id);
      }
    });

    it('returns null for an unknown tenant id', () => {
      expect(getSceneForTenant('not-a-tenant')).toBeNull();
    });

    it('every node in a per-tenant scene carries that tenant id', () => {
      for (const t of DEMO_TENANTS) {
        const scene = getSceneForTenant(t.id);
        expect(scene).not.toBeNull();
        for (const node of scene!.nodes) {
          expect(node.tenantId).toBe(t.id);
        }
      }
    });

    it('status distribution per tenant matches V3.3 plan T5 step 5.1', () => {
      const acme = getSceneForTenant('acme-corp')!;
      const globex = getSceneForTenant('globex-ind')!;
      const initech = getSceneForTenant('initech-llc')!;
      const machineStatuses = (s: typeof acme) =>
        s.nodes.filter((n) => n.type === 'machine').map((n) => n.status);
      expect(machineStatuses(acme)).toEqual(['online', 'warning', 'alarm']);
      expect(machineStatuses(globex)).toEqual(['online', 'online']);
      expect(machineStatuses(initech)).toEqual([
        'online',
        'warning',
        'offline',
        'alarm',
      ]);
    });
  });

  describe('getDevicesForTenant', () => {
    it('returns one device per machine in the per-tenant scene', () => {
      for (const t of DEMO_TENANTS) {
        const scene = getSceneForTenant(t.id);
        const machines = scene!.nodes.filter((n) => n.type === 'machine');
        const devices = getDevicesForTenant(t.id);
        expect(devices.length).toBe(machines.length);
        for (const d of devices) {
          expect(d.tenantId).toBe(t.id);
        }
      }
    });

    it('every device carries the tenant id and points at a machine node', () => {
      const scene = getSceneForTenant('acme-corp')!;
      const devices = getDevicesForTenant('acme-corp');
      for (const d of devices) {
        expect(d.tenantId).toBe('acme-corp');
        const node = scene.nodes.find((n) => n.id === d.sceneNodeId);
        expect(node?.type).toBe('machine');
      }
    });

    it('returns an empty array for an unknown tenant id', () => {
      // T6 routes use this as the body of `GET /api/devices`
      // when the resolved tenant is not in the registry; an
      // empty array is the documented "render nothing" path.
      expect(getDevicesForTenant('not-a-tenant')).toEqual([]);
    });
  });
});
