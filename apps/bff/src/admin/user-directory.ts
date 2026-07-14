/**
 * In-memory tenant user directory — V4 T11.
 *
 * Dev/mock source of truth for `GET /api/admin/users` and
 * role assignment. Seeded with at least two users per
 * registered demo tenant so the admin UI has something to
 * render without requiring prior logins. Login via
 * MockAuthStore upserts into this directory so newly
 * minted users also appear in the list.
 */

import type { Role, User } from '@dt/contracts';

import { DEMO_TENANTS } from '../mock/demo-data.js';

export interface TenantUserDirectory {
  list(tenantId: string): User[];
  get(tenantId: string, userId: string): User | undefined;
  upsert(tenantId: string, user: User): void;
  setRoles(
    tenantId: string,
    userId: string,
    roles: readonly Role[],
  ): User | undefined;
  seedDemoUsers(): void;
}

export function createMemoryUserDirectory(): TenantUserDirectory {
  // tenantId -> userId -> User
  const byTenant = new Map<string, Map<string, User>>();

  function bucket(tenantId: string): Map<string, User> {
    let map = byTenant.get(tenantId);
    if (!map) {
      map = new Map();
      byTenant.set(tenantId, map);
    }
    return map;
  }

  const directory: TenantUserDirectory = {
    list(tenantId: string): User[] {
      return [...bucket(tenantId).values()].map((u) => ({
        ...u,
        roles: [...u.roles],
      }));
    },

    get(tenantId: string, userId: string): User | undefined {
      const user = bucket(tenantId).get(userId);
      return user ? { ...user, roles: [...user.roles] } : undefined;
    },

    upsert(tenantId: string, user: User): void {
      bucket(tenantId).set(user.id, {
        ...user,
        roles: [...user.roles],
      });
    },

    setRoles(
      tenantId: string,
      userId: string,
      roles: readonly Role[],
    ): User | undefined {
      const map = bucket(tenantId);
      const existing = map.get(userId);
      if (!existing) return undefined;
      const updated: User = {
        ...existing,
        roles: [...roles],
      };
      map.set(userId, updated);
      return { ...updated, roles: [...updated.roles] };
    },

    seedDemoUsers(): void {
      // At least two users per demo tenant for UI demos.
      // Ids follow MockAuthStore's `user-${email}` scheme so
      // a later login with the same email merges cleanly.
      for (const tenant of DEMO_TENANTS) {
        const adminEmail = `admin@${tenant.id}.example.com`;
        const operatorEmail = `operator@${tenant.id}.example.com`;
        directory.upsert(tenant.id, {
          id: `user-${adminEmail}`,
          displayName: 'Alice Admin',
          email: adminEmail,
          roles: ['admin'],
        });
        directory.upsert(tenant.id, {
          id: `user-${operatorEmail}`,
          displayName: 'Bob Operator',
          email: operatorEmail,
          roles: ['operator'],
        });
      }
    },
  };

  return directory;
}
