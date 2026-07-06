/**
 * Plugin extension shapes (stub for T1).
 *
 * The full implementation lands in T2. Keeping the type
 * declarations here lets `index.ts` re-export them so the
 * runtime typechecks end-to-end before the registry is
 * fleshed out.
 *
 * `PluginComponent` is intentionally a structural type, not
 * `import type { Component } from 'vue'`. The runtime stays
 * host-agnostic; the host app passes a real Vue component in
 * via the `PluginPanel.component` field, and Vue's
 * `<component :is="..." />` accepts anything shaped like one.
 */

import type { DigitalTwinEvent, DigitalTwinEventType } from '@dt/contracts';

/**
 * Structural Vue component shape. A real `Component` from
 * `vue` is assignable to this; the host app does the work
 * of constructing it.
 */
export interface PluginComponent {
  // Vue components have at least one of these. The runtime
  // never calls them directly; the host's
  // `<component :is="..." />` does.
  render?: (...args: unknown[]) => unknown;
  setup?: (...args: unknown[]) => unknown;
  // `defineComponent` returns a richer object. We accept
  // anything extra as `[key: string]: unknown` so the
  // structural type stays loose without `any`.
  [key: string]: unknown;
}

export interface PluginPanel {
  id: string;
  title: string;
  component: PluginComponent;
}

export interface PluginMenuItem {
  id: string;
  label: string;
  onSelect: () => void;
}

export interface PluginEventSubscriber {
  eventTypes?: readonly DigitalTwinEventType[];
  handle: (event: DigitalTwinEvent) => void | Promise<void>;
}

export type PluginExtension =
  | { kind: 'ui-panel'; panel: PluginPanel }
  | { kind: 'menu-item'; item: PluginMenuItem }
  | { kind: 'event-subscriber'; subscriber: PluginEventSubscriber };
