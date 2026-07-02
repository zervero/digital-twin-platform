/**
 * Events emitted by the engine, app, or BFF.
 *
 * The contract is a discriminated union keyed on `type`. Subscribers should
 * narrow on `type` before reading `payload`.
 */

import type { Device } from './device.js';

export type DigitalTwinEvent =
  | { type: 'device:updated'; payload: Device }
  | { type: 'device:list-updated'; payload: Device[] }
  | { type: 'scene:loaded'; payload: { sceneId: string; nodeCount: number } }
  | { type: 'scene:node-selected'; payload: { nodeId: string | null } }
  | { type: 'command:accepted'; payload: { commandId: string } }
  | { type: 'command:rejected'; payload: { commandId: string; reason: string } };

export type DigitalTwinEventType = DigitalTwinEvent['type'];

export const DIGITAL_TWIN_EVENT_TYPES = {
  DEVICE_UPDATED: 'device:updated',
  DEVICE_LIST_UPDATED: 'device:list-updated',
  SCENE_LOADED: 'scene:loaded',
  SCENE_NODE_SELECTED: 'scene:node-selected',
  COMMAND_ACCEPTED: 'command:accepted',
  COMMAND_REJECTED: 'command:rejected',
} as const satisfies Record<string, DigitalTwinEventType>;
