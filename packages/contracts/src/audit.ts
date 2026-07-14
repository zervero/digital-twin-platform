/**
 * Audit event contract — V4 T11.
 *
 * Shared DTOs for the admin audit trail. The BFF records
 * events on marketplace publish / install and on admin
 * role changes; `GET /api/admin/audit` returns a
 * paginated, tenant-scoped list for the admin console.
 */

export type AuditEventType =
  | 'plugin.publish'
  | 'plugin.install'
  | 'user.roles_change';

/**
 * Canonical list of audit event type strings.
 * Kept as a tuple (like `ALL_PERMISSIONS`) so callers can
 * iterate without casting and so a misspelled type is a
 * compile error when used with `satisfies`.
 */
export const AUDIT_EVENT_TYPES = [
  'plugin.publish',
  'plugin.install',
  'user.roles_change',
] as const satisfies readonly AuditEventType[];

export interface AuditEvent {
  id: string;
  tenantId: string;
  type: AuditEventType;
  /** ISO-8601 timestamp when the event was recorded. */
  createdAt: string;
  actorUserId: string;
  actorEmail: string;
  /** Short human-readable summary for the admin table. */
  summary: string;
  /**
   * Optional structured payload (plugin id/version, roles
   * before/after, target user id, etc.). Opaque to the
   * contract; the BFF and UI agree on keys per `type`.
   */
  details?: Record<string, unknown>;
}

/**
 * Paginated response for `GET /api/admin/audit`.
 * `page` is 1-based; `pageSize` defaults on the BFF.
 */
export interface ListAuditEventsResponse {
  items: AuditEvent[];
  total: number;
  page: number;
  pageSize: number;
}
