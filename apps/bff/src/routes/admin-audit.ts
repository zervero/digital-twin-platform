/**
 * /api/admin/audit — V4 T11.
 *
 *   GET /api/admin/audit  paginated audit events for tenant
 *
 * Query: page (1-based), pageSize, type (AuditEventType).
 * Gated on `admin:audit` + tenant scope.
 */

import { Hono } from 'hono';

import {
  AUDIT_EVENT_TYPES,
  type AuditEventType,
} from '@dt/contracts';

import type { AuditStore } from '../admin/audit-store.js';
import type { AuthStore } from '../auth/store.js';
import { requiresTenantScope } from '../middleware/requires-tenant.js';

export interface AdminAuditRoutesOptions {
  authStore: AuthStore;
  auditStore: AuditStore;
}

export function adminAuditRoutes(opts: AdminAuditRoutesOptions): Hono {
  const { authStore, auditStore } = opts;
  const app = new Hono();

  app.get(
    '/admin/audit',
    requiresTenantScope(authStore, 'admin:audit'),
    (c) => {
      const tenant = c.var.tenant!;
      const pageRaw = c.req.query('page');
      const pageSizeRaw = c.req.query('pageSize');
      const typeRaw = c.req.query('type');

      const page = pageRaw ? Number.parseInt(pageRaw, 10) : undefined;
      const pageSize = pageSizeRaw
        ? Number.parseInt(pageSizeRaw, 10)
        : undefined;

      let type: AuditEventType | undefined;
      if (typeRaw) {
        if (!(AUDIT_EVENT_TYPES as readonly string[]).includes(typeRaw)) {
          return c.json(
            {
              error: 'VALIDATION_ERROR',
              message: `Unknown audit type: ${typeRaw}`,
            },
            400,
          );
        }
        type = typeRaw as AuditEventType;
      }

      return c.json(
        auditStore.list(tenant.tenant.id, {
          page: Number.isFinite(page) ? page : undefined,
          pageSize: Number.isFinite(pageSize) ? pageSize : undefined,
          type,
        }),
      );
    },
  );

  return app;
}
