/**
 * Commands sent from the UI / AI agent to the platform.
 *
 * V1 keeps commands as a discriminated union so the BFF can dispatch them
 * without knowing the UI shape. Each command carries a stable `type` and an
 * `id` for traceability.
 *
 * Device-action variants (`acknowledge-alarm`, `reset-device`,
 * `request-maintenance`) support V4 ops drawer role actions gated by
 * `command:send`.
 */

/**
 * V3.3: every variant carries a required `tenantId` so the
 * BFF can reject cross-tenant commands with 403
 * TENANT_FORBIDDEN. The BFF's `isDigitalTwinCommand`
 * runtime validator (in `apps/bff/src/routes/commands.ts`)
 * is the enforcement point; the contract is the type-level
 * enforcement.
 */
export type DigitalTwinCommand =
  | { id: string; tenantId: string; type: 'select'; nodeId: string }
  | { id: string; tenantId: string; type: 'focus'; nodeId: string }
  | { id: string; tenantId: string; type: 'reset-view' }
  | { id: string; tenantId: string; type: 'acknowledge-alarm'; deviceId: string }
  | { id: string; tenantId: string; type: 'reset-device'; deviceId: string }
  | { id: string; tenantId: string; type: 'request-maintenance'; deviceId: string };

export type DigitalTwinCommandType = DigitalTwinCommand['type'];
