/**
 * Public engine types. Anything not in this file is implementation detail
 * and must not be imported by consumers.
 */

import type { SceneSnapshot } from '@dt/contracts';

import type { LoadGlbFn } from './asset-loader.js';

export type { LoadGlbFn };

export type AssetLoadEvent =
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'node-fallback'; nodeId: string; reason: string }
  | { type: 'complete' };

export interface EngineAssetsOptions {
  /**
   * Host catalog hook: catalog id → absolute or same-origin URL.
   * Return `null` when the id is unknown (engine keeps A-light).
   */
  resolveUrl(modelId: string): string | null;
  /**
   * Optional host byte-cache hook (ADR 0022 / `@dt/asset-system`).
   * Called with the URL from `resolveUrl` before `loadGlb` / GLTFLoader.
   * Return a local `blob:` / file / cached URL when the bytes are ready.
   */
  ensureLocalUrl?(url: string): Promise<string>;
  /**
   * Optional injectable loader for tests. Default uses Three.js GLTFLoader.
   */
  loadGlb?: LoadGlbFn;
}

export interface EngineOptions {
  /**
   * Whether to render with antialias. Default true.
   */
  antialias?: boolean;
  /**
   * Initial camera position. Default looks at the scene from a 3/4 view.
   */
  cameraPosition?: [number, number, number];
  /**
   * Background color of the renderer. Default is dark.
   */
  background?: number;
  /**
   * Scheme C / ADR 0021: host-owned GLB catalog resolution.
   * Omit to keep A-light procedural stage only.
   */
  assets?: EngineAssetsOptions;
}

export interface DigitalTwinEngine {
  mount(container: HTMLElement): void;
  loadScene(scene: SceneSnapshot): Promise<void>;
  /**
   * Remove the loaded scene graph and clear selection while keeping
   * the renderer mounted. Used when the host drops the snapshot
   * (e.g. logout) without disposing the whole viewport.
   */
  clearScene(): void;
  selectNode(nodeId: string | null): void;
  /**
   * Restore the default 3/4 camera pose (maps to the `reset-view` scene command).
   */
  resetView(): void;
  /**
   * Frame all scene nodes in view.
   */
  fitAll(): void;
  /**
   * Orbit-focus the camera on a node (maps to the `focus` scene command).
   * No-op when the node is missing from the loaded scene.
   */
  focusNode(nodeId: string): void;
  resize(): void;
  dispose(): void;
  getSelectedNodeId(): string | null;
  /**
   * Progress 0–1 for the in-flight asset batch; `null` when idle.
   */
  getAssetLoadProgress(): number | null;
  /**
   * Subscribe to asset load progress / per-node fallback / complete.
   * Returns an unsubscribe function.
   */
  onAssetLoad(listener: (ev: AssetLoadEvent) => void): () => void;
}
