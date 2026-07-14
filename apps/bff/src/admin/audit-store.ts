/**
 * In-memory audit store — V4 T11.
 *
 * Records tenant-scoped audit events for marketplace
 * publish / install and admin role changes. Newest events
 * first in list responses.
 */

import { randomUUID } from 'node:crypto';

import type {
  AuditEvent,
  AuditEventType,
  ListAuditEventsResponse,
} from '@dt/contracts';

export interface RecordAuditInput {
  tenantId: string;
  type: AuditEventType;
  actorUserId: string;
  actorEmail: string;
  summary: string;
  details?: Record<string, unknown>;
}

export interface ListAuditOptions {
  page?: number;
  pageSize?: number;
  type?: AuditEventType;
}

export interface AuditStore {
  record(input: RecordAuditInput): AuditEvent;
  list(tenantId: string, opts?: ListAuditOptions): ListAuditEventsResponse;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function createMemoryAuditStore(): AuditStore {
  const events: AuditEvent[] = [];

  return {
    record(input: RecordAuditInput): AuditEvent {
      const event: AuditEvent = {
        id: `audit-${randomUUID()}`,
        tenantId: input.tenantId,
        type: input.type,
        createdAt: new Date().toISOString(),
        actorUserId: input.actorUserId,
        actorEmail: input.actorEmail,
        summary: input.summary,
        ...(input.details ? { details: { ...input.details } } : {}),
      };
      events.unshift(event);
      return event;
    },

    list(tenantId: string, opts: ListAuditOptions = {}): ListAuditEventsResponse {
      const page = Math.max(1, opts.page ?? 1);
      const pageSize = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, opts.pageSize ?? DEFAULT_PAGE_SIZE),
      );
      let filtered = events.filter((e) => e.tenantId === tenantId);
      if (opts.type) {
        filtered = filtered.filter((e) => e.type === opts.type);
      }
      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const items = filtered.slice(start, start + pageSize).map((e) => ({
        ...e,
        details: e.details ? { ...e.details } : undefined,
      }));
      return { items, total, page, pageSize };
    },
  };
}
