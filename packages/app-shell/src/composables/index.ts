/**
 * Barrel export for the composables. Consumers (`AppShell.vue`
 * and downstream apps) can import from one place.
 */

export { useCurrentUser } from './useCurrentUser.js';
export { useDeviceStream } from './useDeviceStream.js';
export { useAuthSessionSync } from './useAuthSessionSync.js';
export { useLastAdminPath } from './useLastAdminPath.js';
export { useOIDCStart } from './useOIDCStart.js';
export { usePermission } from './usePermission.js';
export { usePluginPanels } from './usePluginPanels.js';
export { usePluginMenu } from './usePluginMenu.js';
export { useAdminMarketplace } from './useAdminMarketplace.js';
export { useAdminUsers, ADMIN_ROLES } from './useAdminUsers.js';
export { useAdminAudit, AUDIT_TYPE_FILTERS } from './useAdminAudit.js';
export {
  useMarketplaceInstall,
  createFetchMarketplaceApi,
  isOfficialCatalogVendor,
} from './useMarketplaceInstall.js';

export type { AuthMode } from './useOIDCStart.js';
export { AuthModeKey, BffBaseUrlKey } from './useOIDCStart.js';
export type {
  MarketplaceFilterId,
  UseAdminMarketplaceHandle,
} from './useAdminMarketplace.js';
export type { UseAdminUsersHandle } from './useAdminUsers.js';
export type { AuditTypeFilter, UseAdminAuditHandle } from './useAdminAudit.js';
export type {
  MarketplaceApi,
  UseMarketplaceInstallHandle,
  CatalogPlugin,
  CatalogPluginVersion,
} from './useMarketplaceInstall.js';
