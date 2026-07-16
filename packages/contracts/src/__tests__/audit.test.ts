import { describe, expect, it } from 'vitest';

import {
  AUDIT_EVENT_TYPES,
  ROLE_PERMISSIONS,
  type AuditEvent,
  type ListAuditEventsResponse,
  type ListUsersResponse,
  type SetUserRolesRequest,
} from '../index.js';

describe('audit + admin user contracts (V4 T11)', () => {
  it('exposes the three audit event types', () => {
    expect(AUDIT_EVENT_TYPES).toEqual([
      'plugin.publish',
      'plugin.install',
      'user.roles_change',
    ]);
  });

  it('builds a valid AuditEvent', () => {
    const event: AuditEvent = {
      id: 'evt-1',
      tenantId: 'acme-corp',
      type: 'user.roles_change',
      createdAt: '2026-07-14T00:00:00.000Z',
      actorUserId: 'user-admin@acme.example.com',
      actorEmail: 'admin@acme.example.com',
      summary: 'Changed roles for operator@acme.example.com',
      details: { targetUserId: 'user-operator@acme.example.com', roles: ['viewer'] },
    };
    expect(event.type).toBe('user.roles_change');
  });

  it('builds list / role-assignment DTOs', () => {
    const list: ListUsersResponse = {
      users: [
        {
          id: 'user-admin@acme.example.com',
          displayName: 'admin',
          email: 'admin@acme.example.com',
          roles: ['admin'],
        },
      ],
    };
    const req: SetUserRolesRequest = { roles: ['operator'] };
    const auditPage: ListAuditEventsResponse = {
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    };
    expect(list.users).toHaveLength(1);
    expect(req.roles).toEqual(['operator']);
    expect(auditPage.page).toBe(1);
  });

  it('grants admin:users and admin:audit only to admin', () => {
    expect(ROLE_PERMISSIONS.admin).toContain('admin:users');
    expect(ROLE_PERMISSIONS.admin).toContain('admin:audit');
    expect(ROLE_PERMISSIONS.operator).not.toContain('admin:users');
    expect(ROLE_PERMISSIONS.viewer).not.toContain('admin:audit');
  });
});
