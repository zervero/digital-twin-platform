/**
 * /api/admin/users — V4 T11.
 *
 *   GET   /api/admin/users              list users in tenant
 *   PATCH /api/admin/users/:id/roles    set roles (admin only)
 *
 * Gated on `admin:users` + tenant scope. Role changes
 * sync live MockAuthStore sessions (when supported) and
 * write a `user.roles_change` audit event.
 */

import { Hono } from 'hono';

import type { Role, SetUserRolesRequest } from '@dt/contracts';

import type { AuditStore } from '../admin/audit-store.js';
import type { TenantUserDirectory } from '../admin/user-directory.js';
import type { AuthStore } from '../auth/store.js';
import { requiresTenantScope } from '../middleware/requires-tenant.js';

const VALID_ROLES: readonly Role[] = ['admin', 'operator', 'viewer'];

export interface AdminUsersRoutesOptions {
  authStore: AuthStore;
  userDirectory: TenantUserDirectory;
  auditStore: AuditStore;
}

export function adminUsersRoutes(opts: AdminUsersRoutesOptions): Hono {
  const { authStore, userDirectory, auditStore } = opts;
  const app = new Hono();

  app.get(
    '/admin/users',
    requiresTenantScope(authStore, 'admin:users'),
    (c) => {
      const tenant = c.var.tenant!;
      return c.json({ users: userDirectory.list(tenant.tenant.id) });
    },
  );

  app.patch(
    '/admin/users/:id/roles',
    requiresTenantScope(authStore, 'admin:users'),
    async (c) => {
      const tenant = c.var.tenant!;
      const actor = c.var.user!;
      const userId = c.req.param('id');
      const body = (await c.req.json()) as SetUserRolesRequest;

      if (!Array.isArray(body.roles) || body.roles.length === 0) {
        return c.json(
          { error: 'VALIDATION_ERROR', message: 'roles must be a non-empty array' },
          400,
        );
      }
      for (const role of body.roles) {
        if (!VALID_ROLES.includes(role)) {
          return c.json(
            { error: 'VALIDATION_ERROR', message: `Invalid role: ${String(role)}` },
            400,
          );
        }
      }

      const before = userDirectory.get(tenant.tenant.id, userId);
      if (!before) {
        return c.json(
          { error: 'USER_NOT_FOUND', message: userId },
          404,
        );
      }

      const updated = userDirectory.setRoles(
        tenant.tenant.id,
        userId,
        body.roles,
      );
      if (!updated) {
        return c.json(
          { error: 'USER_NOT_FOUND', message: userId },
          404,
        );
      }

      if (authStore.updateUserRoles) {
        await authStore.updateUserRoles(userId, body.roles);
      }

      auditStore.record({
        tenantId: tenant.tenant.id,
        type: 'user.roles_change',
        actorUserId: actor.id,
        actorEmail: actor.email,
        summary: `Changed roles for ${updated.email}`,
        details: {
          targetUserId: updated.id,
          before: before.roles,
          after: updated.roles,
        },
      });

      return c.json({ user: updated });
    },
  );

  return app;
}
