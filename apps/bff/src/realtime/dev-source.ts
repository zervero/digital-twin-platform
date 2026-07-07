/**
 * DevMockSource — dev-only heartbeat that publishes per-tenant
 * `device:updated` events on a fixed cadence. The BFF only spins
 * this up when `NODE_ENV !== 'production'`, so the production
 * build stays a static surface (no background timers).
 *
 * V3.3 T7: the source enumerates every registered tenant
 * (`DEMO_TENANTS`) and emits one `device:updated` event per device
 * in that tenant's per-tenant list. Previously (V1-V3.2) the
 * source published a single global `device:list-updated` for
 * `acme-corp` only; T5 deliberately left that back-compat export
 * in place for tests / fixtures until T7 closed the divergence.
 * With T7 the realtime path no longer touches the legacy
 * `DEMO_DEVICES` alias.
 *
 * Each event carries the device's own `tenantId` (per V3.3 T1
 * `DigitalTwinEvent` contract), so a tenant-scoped subscriber
 * receives only its own devices' updates.
 *
 * The mutation is intentionally lossy: we only flip `status`
 * and `updatedAt` per tick. Other fields (`id`, `name`,
 * `sceneNodeId`) stay constant so the UI's keyed
 * reconciliation keeps working.
 *
 * `runTick()` is exposed (rather than `private`) so the
 * broadcaster test can drive deterministic ticks without
 * depending on `setInterval` timing.
 */

import {
  withTimestamp,
  type Device,
  type DeviceStatus,
} from '@dt/contracts';

import { DEMO_TENANTS, getDevicesForTenant } from '../mock/demo-data.js';
import type { RealtimeBroadcaster } from './broadcaster.js';

// Weighted toward "online" so the demo doesn't look like a fire alarm.
const STATUSES: readonly DeviceStatus[] = [
  'online',
  'online',
  'online',
  'warning',
  'offline',
];

function pickStatus(): DeviceStatus {
  return STATUSES[Math.floor(Math.random() * STATUSES.length)]!;
}

function jitterDevice(d: Device): Device {
  return {
    ...d,
    status: pickStatus(),
    updatedAt: new Date().toISOString(),
  };
}

export interface DevMockSourceOptions {
  broadcaster: RealtimeBroadcaster;
  intervalMs?: number;
}

export class DevMockSource {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly opts: DevMockSourceOptions) {}

  start(): void {
    if (this.timer) return;
    const interval = this.opts.intervalMs ?? 3000;
    this.timer = setInterval(() => this.runTick(), interval);
  }

  /**
   * Publish one `device:updated` event per active device
   * across every registered tenant.
   *
   * Exposed for tests (V3.3 T7) so the broadcaster test can
   * drive a deterministic tick without timing out for the
   * default 3-second interval. Production never calls this
   * directly; `start()` invokes it from `setInterval`.
   */
  runTick(): void {
    for (const tenant of DEMO_TENANTS) {
      const devices = getDevicesForTenant(tenant.id);
      for (const device of devices) {
        this.opts.broadcaster.publish(
          withTimestamp({
            tenantId: tenant.id,
            type: 'device:updated',
            payload: jitterDevice(device),
          }),
        );
      }
    }
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
