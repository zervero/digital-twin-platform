/**
 * @dt/contracts
 *
 * Single source of truth for shared DTOs and event names across apps and
 * packages. No runtime code, no platform dependencies. If a type lives in
 * more than one place, it lives here.
 */

export type { Device, DeviceStatus } from './device.js';
export { DEVICE_STATUSES, STATUS_LABELS_ZH } from './device.js';

export type { SceneNode, SceneNodeType, SceneSnapshot } from './scene.js';

export type { DigitalTwinCommand, DigitalTwinCommandType } from './command.js';

export type { DigitalTwinEvent, DigitalTwinEventType } from './event.js';
export { DIGITAL_TWIN_EVENT_TYPES, withTimestamp } from './event.js';

export type {
  ApiHealth,
  ApiErrorPayload,
  CommandAcceptedResponse,
} from './api.js';

// Auth (V2.1, extended in V3.3 + V3.4)
export type {
  AuthErrorCode,
  AuthSession,
  AuthState,
  LoginRequest,
  LoginResponse,
  MeResponse,
  Permission,
  Role,
  User,
} from './auth.js';
export { ALL_PERMISSIONS, ROLE_PERMISSIONS, permissionsFor } from './auth.js';

// Plugin contract (V3.4: shape moved here from @dt/plugin-runtime
// so the marketplace DTOs in `plugins.ts` can reference it without
// violating the @dt/contracts import-boundary rule.)
export type { PluginManifest } from './plugin.js';

// Marketplace (V3.4)
export type {
  ActivatePluginRequest,
  InstallPluginRequest,
  InstalledPluginResponse,
  MarketplaceErrorCode,
  PluginPermission,
  PublishPluginRequest,
  PublishedPluginVersion,
  UninstallPluginParams,
} from './plugins.js';
