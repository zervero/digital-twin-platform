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
