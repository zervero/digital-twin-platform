/**
 * Barrel export for the composables. Consumers (`AppShell.vue`
 * and downstream apps) can import from one place.
 */

export { useCurrentUser } from './useCurrentUser.js';
export { useDeviceStream } from './useDeviceStream.js';
export { useOIDCStart } from './useOIDCStart.js';
export { usePermission } from './usePermission.js';
export { usePluginPanels } from './usePluginPanels.js';
export { usePluginMenu } from './usePluginMenu.js';

export type { AuthMode } from './useOIDCStart.js';
export { AuthModeKey, BffBaseUrlKey } from './useOIDCStart.js';
