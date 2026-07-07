/**
 * /api/commands — V3.0 gated on `command:send`, V3.3 tenant-scoped.
 *
 * V3.0 attached `requiresPermission`; V3.3 T4 switched to
 * `requiresTenantScope`. The permission union from
 * `@dt/contracts` uses `command:send` (singular), matching
 * the contract that the SPA already checks via
 * `@dt/app-shell`'s `usePermission` composable.
 *
 * V3.3 T6 (this commit) closes the tenant gap on the
 * write side: every `DigitalTwinCommand` now carries a
 * required `tenantId` (T1), and this handler compares it
 * against `c.var.tenant.tenant.id` so a caller cannot post
 * a command that targets a different tenant. Mismatch
 * returns 403 `TENANT_FORBIDDEN` with a diagnostic message;
 * the body is rejected before any dispatch. The
 * `requiresTenantScope` middleware has already ensured
 * `c.var.tenant` is set and `body.tenantId` is a string
 * (the shape guard above catches the latter; the comparison
 * is the new tenant gate).
 *
 * V1: no side effects. We just echo acceptance. V2 will
 * dispatch to a command bus. The tenant gate must stay
 * before the echo so a future dispatcher inherits the
 * invariant for free.
 */

import { Hono } from 'hono';

import { type CommandAcceptedResponse, type DigitalTwinCommand } from '@dt/contracts';

import type { AuthStore } from '../auth/store.js';
import { requiresTenantScope } from '../middleware/requires-tenant.js';

function isDigitalTwinCommand(value: unknown): value is DigitalTwinCommand {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || typeof v.type !== 'string') return false;
  if (typeof v.tenantId !== 'string') return false;
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
  app.post('/commands', requiresTenantScope(store, 'command:send'), async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!isDigitalTwinCommand(body)) {
      return c.json(
        { error: 'InvalidCommand', message: 'Command shape does not match contract' },
        400,
      );
    }
    // V3.3 T6: command.tenantId must match the session's
    // resolved tenant. The middleware already validated
    // that the session has a tenant, so this is the
    // cross-tenant 403 path (see V3.3 plan T6 step 6.1).
    const sessionTenantId = c.var.tenant!.tenant.id;
    if (body.tenantId !== sessionTenantId) {
      return c.json(
        {
          error: 'TENANT_FORBIDDEN',
          message: `Command tenant ${body.tenantId} does not match session tenant ${sessionTenantId}`,
        },
        403,
      );
    }
    // V1: no side effects. We just echo acceptance. V2 will dispatch to a
    // command bus.
    const response: CommandAcceptedResponse = { accepted: true, commandId: body.id };
    return c.json(response);
  });
  return app;
}
