/**
 * Commands sent from the UI / AI agent to the platform.
 *
 * V1 keeps commands as a discriminated union so the BFF can dispatch them
 * without knowing the UI shape. Each command carries a stable `type` and an
 * `id` for traceability.
 */

export type DigitalTwinCommand =
  | { id: string; type: 'select'; nodeId: string }
  | { id: string; type: 'focus'; nodeId: string }
  | { id: string; type: 'reset-view' };

export type DigitalTwinCommandType = DigitalTwinCommand['type'];
