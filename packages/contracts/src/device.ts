/**
 * Device domain shared types and presentation constants.
 *
 * The Chinese status labels live here so the UI kit can render badges
 * without depending on a domain package. Domain packages layer behavior
 * (sorting, filtering) on top of these constants.
 */

export type DeviceStatus = 'online' | 'offline' | 'warning' | 'alarm';

export interface Device {
  id: string;
  /**
   * V3.3: owning tenant ID. Required on every Device; the BFF
   * scopes `/api/devices` responses to the caller's tenant
   * and rejects cross-tenant writes with 403 TENANT_FORBIDDEN.
   * Resolved from the OIDC JWT's namespaced `tenant_id` claim
   * (see `@dt/tenant` for the default claim name and the
   * `OIDC_TENANT_CLAIM` env-var override).
   */
  tenantId: string;
  name: string;
  status: DeviceStatus;
  sceneNodeId: string;
  updatedAt: string;
}

export const DEVICE_STATUSES: readonly DeviceStatus[] = [
  'online',
  'offline',
  'warning',
  'alarm',
] as const;

/**
 * Chinese display labels. UI components should read this map directly so
 * the UI kit does not need to depend on a domain package.
 */
export const STATUS_LABELS_ZH: Readonly<Record<DeviceStatus, string>> = {
  online: '在线',
  offline: '离线',
  warning: '预警',
  alarm: '告警',
};
