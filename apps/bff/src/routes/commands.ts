/**
 * /api/commands — V3.0 gated on `command:send`.
 *
 * V2.1 was open; V3.0 attaches `requiresPermission`. The
 * permission union from @dt/contracts uses `command:send`
 * (singular), matching the contract that the SPA already
 * checks via @dt/app-shell's usePermission composable.
 */

import { Hono } from 'hono';

import { type CommandAcceptedResponse, type DigitalTwinCommand } from '@dt/contracts';

import type { AuthStore } from '../auth/store.js';
import { requiresPermission } from '../middleware/requires-permission.js';

function isDigitalTwinCommand(value: unknown): value is DigitalTwinCommand {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || typeof v.type !== 'string') return false;
  switch (v.type) {
    case 'select':
    case 'focus':
      return typeof v.nodeId === 'string';
    case 'reset-view':
      return true;
    default:
      return false;
  }
}

export function commandsRoute(store: AuthStore): Hono {
  const app = new Hono();
  app.post('/commands', requiresPermission(store, 'command:send'), async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!isDigitalTwinCommand(body)) {
      return c.json(
        { error: 'InvalidCommand', message: 'Command shape does not match contract' },
        400,
      );
    }
    // V1: no side effects. We just echo acceptance. V2 will dispatch to a
    // command bus.
    const response: CommandAcceptedResponse = { accepted: true, commandId: body.id };
    return c.json(response);
  });
  return app;
}
