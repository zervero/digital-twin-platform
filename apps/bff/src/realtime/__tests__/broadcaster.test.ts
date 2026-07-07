/**
 * Tests for the V3.3 T7 tenant-scoped broadcaster.
 *
 * The broadcaster is a 1-line filter over a single in-memory
 * stream: each subscriber receives only the events whose
 * `tenantId` matches the id passed to `subscribeClient`. The
 * tests below cover the three behaviors the V3.3 plan calls
 * for (step 7.2):
 *
 *   1. Two subscribers, one per tenant; publish an event for
 *      tenant A -- only A's subscriber receives it.
 *   2. One subscriber; publish events for both tenants --
 *      the subscriber receives only its own tenant's events.
 *   3. `unsubscribe()` removes the subscription cleanly.
 *
 * Plus an integration smoke against `DevMockSource.runTick()`
 * so a regression in the dev source's per-tenant fan-out
 * (e.g. forgetting to stamp `tenantId`) is caught here.
 */

import { describe, expect, it } from 'vitest';

import { withTimestamp, type DigitalTwinEvent } from '@dt/contracts';

import { RealtimeBroadcaster } from '../broadcaster.js';
import { DevMockSource } from '../dev-source.js';

/**
 * Build a synthetic DigitalTwinEvent for tests. The `type`
 * drives the payload shape via the contract union
 * (`device:updated` -> `Device`, `ping` -> `{ nonce }`);
 * we cast through `unknown` once because the helper's
 * payload shape is type-dependent and `withTimestamp` is
 * a generic stamp, not a contract-validating builder.
 * The point of these tests is the broadcaster's filter,
 * not the payload shape.
 */
function makeEvent(
  tenantId: string,
  type: 'device:updated' | 'ping' = 'device:updated',
): DigitalTwinEvent {
  const payload =
    type === 'ping'
      ? { nonce: `nonce-${tenantId}-${type}` }
      : {
          id: `${tenantId}-synthetic`,
          tenantId,
          name: 'synthetic',
          status: 'online' as const,
          sceneNodeId: 'synthetic',
          updatedAt: new Date().toISOString(),
        };
  return withTimestamp({ tenantId, type, payload }) as DigitalTwinEvent;
}

describe('RealtimeBroadcaster (V3.3 T7)', () => {
  describe('per-tenant fan-out', () => {
    it('routes an event to the subscriber whose tenantId matches', () => {
      const broadcaster = new RealtimeBroadcaster();
      const acmeReceived: DigitalTwinEvent[] = [];
      const globexReceived: DigitalTwinEvent[] = [];
      const unsubA = broadcaster.subscribeClient('acme-corp', (e) =>
        acmeReceived.push(e),
      );
      const unsubG = broadcaster.subscribeClient('globex-ind', (e) =>
        globexReceived.push(e),
      );
      try {
        const acmeEvent = makeEvent('acme-corp');
        broadcaster.publish(acmeEvent);
        expect(acmeReceived).toEqual([acmeEvent]);
        expect(globexReceived).toEqual([]);
      } finally {
        unsubA();
        unsubG();
      }
    });

    it('does not leak events across tenants when both are subscribed', () => {
      const broadcaster = new RealtimeBroadcaster();
      const acmeReceived: DigitalTwinEvent[] = [];
      const initechReceived: DigitalTwinEvent[] = [];
      const unsubA = broadcaster.subscribeClient('acme-corp', (e) =>
        acmeReceived.push(e),
      );
      const unsubI = broadcaster.subscribeClient('initech-llc', (e) =>
        initechReceived.push(e),
      );
      try {
        // 4 publishes; acme-corp fires twice, initech once,
        // globex once (no subscriber). The filter is per-
        // subscriber, so each subscriber sees only its own.
        broadcaster.publish(makeEvent('acme-corp'));
        broadcaster.publish(makeEvent('initech-llc'));
        broadcaster.publish(makeEvent('acme-corp'));
        broadcaster.publish(makeEvent('globex-ind')); // unsubscribed tenant -- still published to the stream
        expect(acmeReceived.length).toBe(2);
        expect(initechReceived.length).toBe(1);
        for (const e of acmeReceived) expect(e.tenantId).toBe('acme-corp');
        for (const e of initechReceived) expect(e.tenantId).toBe('initech-llc');
      } finally {
        unsubA();
        unsubI();
      }
    });

    it('filters ping/pong keepalives by tenantId as well', () => {
      // The WebSocket route stamps `tenantId` on every keepalive
      // so the filter does not silently drop them. A ping
      // without `tenantId` would never reach any subscriber.
      const broadcaster = new RealtimeBroadcaster();
      const received: DigitalTwinEvent[] = [];
      const unsub = broadcaster.subscribeClient('acme-corp', (e) =>
        received.push(e),
      );
      try {
        broadcaster.publish(makeEvent('acme-corp', 'ping'));
        broadcaster.publish(makeEvent('globex-ind', 'ping'));
        expect(received.length).toBe(1);
        expect(received[0]!.type).toBe('ping');
        expect(received[0]!.tenantId).toBe('acme-corp');
      } finally {
        unsub();
      }
    });
  });

  describe('unsubscribe', () => {
    it('stops further events from reaching the subscriber', () => {
      const broadcaster = new RealtimeBroadcaster();
      const received: DigitalTwinEvent[] = [];
      const unsub = broadcaster.subscribeClient('acme-corp', (e) =>
        received.push(e),
      );
      broadcaster.publish(makeEvent('acme-corp'));
      expect(received.length).toBe(1);
      unsub();
      broadcaster.publish(makeEvent('acme-corp'));
      // No new event after unsubscribe.
      expect(received.length).toBe(1);
    });

    it('is idempotent (calling it twice does not throw)', () => {
      const broadcaster = new RealtimeBroadcaster();
      const received: DigitalTwinEvent[] = [];
      const unsub = broadcaster.subscribeClient('acme-corp', (e) =>
        received.push(e),
      );
      unsub();
      expect(() => unsub()).not.toThrow();
      broadcaster.publish(makeEvent('acme-corp'));
      expect(received.length).toBe(0);
    });

    it('does not affect other subscribers on the same broadcaster', () => {
      const broadcaster = new RealtimeBroadcaster();
      const aReceived: DigitalTwinEvent[] = [];
      const gReceived: DigitalTwinEvent[] = [];
      const unsubA = broadcaster.subscribeClient('acme-corp', (e) =>
        aReceived.push(e),
      );
      const unsubG = broadcaster.subscribeClient('globex-ind', (e) =>
        gReceived.push(e),
      );
      unsubA();
      broadcaster.publish(makeEvent('acme-corp'));
      broadcaster.publish(makeEvent('globex-ind'));
      expect(aReceived.length).toBe(0);
      expect(gReceived.length).toBe(1);
      unsubG();
    });
  });

  describe('integration with DevMockSource.runTick()', () => {
    it('fans one event per device across tenants, scoped per subscriber', () => {
      const broadcaster = new RealtimeBroadcaster();
      const acmeReceived: DigitalTwinEvent[] = [];
      const globexReceived: DigitalTwinEvent[] = [];
      const initechReceived: DigitalTwinEvent[] = [];
      const source = new DevMockSource({ broadcaster });
      const unsubA = broadcaster.subscribeClient('acme-corp', (e) =>
        acmeReceived.push(e),
      );
      const unsubG = broadcaster.subscribeClient('globex-ind', (e) =>
        globexReceived.push(e),
      );
      const unsubI = broadcaster.subscribeClient('initech-llc', (e) =>
        initechReceived.push(e),
      );
      try {
        source.runTick();
        // acme-corp has 3 machines, globex-ind has 2,
        // initech-llc has 4 (see `mock/demo-data.ts` T5
        // step 5.1 status distribution). One event per
        // device per tick.
        expect(acmeReceived.length).toBe(3);
        expect(globexReceived.length).toBe(2);
        expect(initechReceived.length).toBe(4);
        for (const e of acmeReceived) {
          expect(e.tenantId).toBe('acme-corp');
          expect(e.type).toBe('device:updated');
        }
        for (const e of globexReceived) {
          expect(e.tenantId).toBe('globex-ind');
        }
        for (const e of initechReceived) {
          expect(e.tenantId).toBe('initech-llc');
        }
      } finally {
        unsubA();
        unsubG();
        unsubI();
      }
    });
  });

  describe('close', () => {
    it('silently drops publishes after close', () => {
      const broadcaster = new RealtimeBroadcaster();
      const received: DigitalTwinEvent[] = [];
      const unsub = broadcaster.subscribeClient('acme-corp', (e) =>
        received.push(e),
      );
      broadcaster.publish(makeEvent('acme-corp'));
      broadcaster.close();
      broadcaster.publish(makeEvent('acme-corp'));
      // First event reached; second dropped because the
      // stream is closed. The subscriber is still alive but
      // the underlying stream short-circuits publishes.
      expect(received.length).toBe(1);
      unsub();
    });
  });
});
