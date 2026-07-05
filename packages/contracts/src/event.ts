/**
 * Events emitted by the engine, app, or BFF.
 *
 * The contract is a discriminated union keyed on `type`. Subscribers should
 * narrow on `type` before reading `payload`. In V2 every variant carries a
 * top-level `timestamp` (ISO 8601) so consumers do not need a separate
 * transport-layer timestamp.
 *
 * `ping` and `pong` are keepalive messages used by the WebSocket
 * transport. The BFF emits `ping` every 25s; clients reply with a
 * matching `pong`.
 */

import type { Device } from './device.js';

type WithTimestamp<T> = T & { timestamp: string };

export type DigitalTwinEvent =
  | WithTimestamp<{ type: 'device:updated'; payload: Device }>
  | WithTimestamp<{ type: 'device:list-updated'; payload: Device[] }>
  | WithTimestamp<{ type: 'scene:loaded'; payload: { sceneId: string; nodeCount: number } }>
  | WithTimestamp<{ type: 'scene:node-selected'; payload: { nodeId: string | null } }>
  | WithTimestamp<{ type: 'command:accepted'; payload: { commandId: string } }>
  | WithTimestamp<{ type: 'command:rejected'; payload: { commandId: string; reason: string } }>
  | WithTimestamp<{ type: 'ping'; payload: { nonce: string } }>
  | WithTimestamp<{ type: 'pong'; payload: { nonce: string } }>;

export type DigitalTwinEventType = DigitalTwinEvent['type'];

export const DIGITAL_TWIN_EVENT_TYPES = {
  DEVICE_UPDATED: 'device:updated',
  DEVICE_LIST_UPDATED: 'device:list-updated',
  SCENE_LOADED: 'scene:loaded',
  SCENE_NODE_SELECTED: 'scene:node-selected',
  COMMAND_ACCEPTED: 'command:accepted',
  COMMAND_REJECTED: 'command:rejected',
  PING: 'ping',
  PONG: 'pong',
} as const satisfies Record<string, DigitalTwinEventType>;

/** Helper to stamp a payload-style object as a DigitalTwinEvent. */
export function withTimestamp<T extends { type: DigitalTwinEventType; payload: unknown }>(
  event: T,
  now: () => Date = () => new Date(),
): T & { timestamp: string } {
  return { ...event, timestamp: now().toISOString() };
}
