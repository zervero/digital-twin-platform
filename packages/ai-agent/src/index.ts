/**
 * @dt/ai-agent
 *
 * V3 boundary. In V1 we define the natural-language command intent types.
 * Actual model integration, planning, and approval flow arrive in V3.
 */

import type { DigitalTwinCommand } from '@dt/contracts';

export type CommandIntent =
  | { kind: 'select'; nodeId: string; confidence: number }
  | { kind: 'focus'; nodeId: string; confidence: number }
  | { kind: 'reset-view'; confidence: number }
  | { kind: 'unknown'; reason: string };

export interface IntentPlan {
  intents: readonly CommandIntent[];
  commands: readonly DigitalTwinCommand[];
  requiresApproval: boolean;
}

export interface IntentParser {
  parse(input: string): IntentPlan;
}
