/**
 * @dt/plugin-runtime
 *
 * V2 boundary. In V1 we define the plugin manifest shape and a registration
 * interface. Actual loading, sandboxing, and marketplace logic arrive in V2.
 */

export type PluginPermission =
  | 'device:read'
  | 'device:write'
  | 'scene:read'
  | 'scene:write'
  | 'command:send'
  | 'ui:extend';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  vendor: string;
  description?: string;
  entry?: string;
  permissions: readonly PluginPermission[];
}

export interface PluginRegistration {
  manifest: PluginManifest;
  activate(): void | Promise<void>;
  deactivate(): void | Promise<void>;
}

export interface PluginRegistry {
  register(registration: PluginRegistration): void;
  unregister(id: string): void;
  list(): readonly PluginRegistration[];
  get(id: string): PluginRegistration | undefined;
}
