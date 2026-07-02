import { Hono } from 'hono';

import type { CommandAcceptedResponse, DigitalTwinCommand } from '@dt/contracts';

export const commandsRoute = new Hono();

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

commandsRoute.post('/commands', async (c) => {
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
