/**
 * Public engine types. Anything not in this file is implementation detail
 * and must not be imported by consumers.
 */

import type { SceneSnapshot } from '@dt/contracts';

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
}

export interface DigitalTwinEngine {
  mount(container: HTMLElement): void;
  loadScene(scene: SceneSnapshot): Promise<void>;
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
}
