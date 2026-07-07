/**
 * DevMockSource — dev-only heartbeat that mutates DEMO_DEVICES and emits
 * a `device:list-updated` event on a fixed cadence. The BFF only spins
 * this up when `NODE_ENV !== 'production'`, so the production build
 * stays a static surface (no background timers).
 *
 * The mutation is intentionally lossy: we only flip `status` and
 * `updatedAt` per tick. Other fields (`id`, `name`, `sceneNodeId`)
 * stay constant so the UI's keyed reconciliation keeps working.
 */

import {
  withTimestamp,
  type Device,
  type DeviceStatus,
} from '@dt/contracts';

import { DEMO_DEVICES } from '../mock/demo-data.js';
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
    this.timer = setInterval(() => {
      if (DEMO_DEVICES.length === 0) return;
      const next = DEMO_DEVICES.map(jitterDevice);
      this.opts.broadcaster.publish(
        withTimestamp({ tenantId: 'acme-corp', type: 'device:list-updated', payload: next }),
      );
    }, interval);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
