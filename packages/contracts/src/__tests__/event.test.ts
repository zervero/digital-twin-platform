import { describe, expect, it } from 'vitest';

import type { DigitalTwinEvent } from '../event.js';

describe('DigitalTwinEvent envelope (V2)', () => {
  it('carries an ISO 8601 timestamp on every variant', () => {
    const e: DigitalTwinEvent = {
      tenantId: 'fixture-tenant',
      type: 'ping',
      payload: { nonce: 'abc' },
      timestamp: '2026-07-05T00:00:00.000Z',
    };
    expect(e.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('exposes ping and pong variants', () => {
    const ping: DigitalTwinEvent = {
      tenantId: 'fixture-tenant',
      type: 'ping',
      payload: { nonce: 'n1' },
      timestamp: '2026-07-05T00:00:00.000Z',
    };
    const pong: DigitalTwinEvent = {
      tenantId: 'fixture-tenant',
      type: 'pong',
      payload: { nonce: 'n1' },
      timestamp: '2026-07-05T00:00:00.000Z',
    };
    expect(ping.type).toBe('ping');
    expect(pong.type).toBe('pong');
  });
});
