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
  resize(): void;
  dispose(): void;
  getSelectedNodeId(): string | null;
}
