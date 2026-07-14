/**
 * The actual engine class.
 *
 * Owns the renderer, scene, camera, and a small interaction surface. Vue code
 * must go through this class and never import Three.js directly.
 */

import {
  AmbientLight,
  Color,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';

import type { SceneSnapshot } from '@dt/contracts';

import {
  computeFitAll,
  computeFocusOnPoint,
  computeResetView,
  type CameraPose,
} from './camera-framing.js';
import { applySelection, buildSceneGraph, type BuiltScene } from './scene-factory.js';
import type { DigitalTwinEngine, EngineOptions } from './types.js';

const DEFAULT_CAMERA: [number, number, number] = [10, 8, 10];
const DEFAULT_BACKGROUND = 0x0d1117;
const FOCUS_DISTANCE = 5;

export function createEngine(options: EngineOptions = {}): DigitalTwinEngine {
  let renderer: WebGLRenderer | null = null;
  let threeScene: Scene | null = null;
  let camera: PerspectiveCamera | null = null;
  let builtScene: BuiltScene | null = null;
  let selectedNodeId: string | null = null;
  let container: HTMLElement | null = null;
  let rafHandle: number | null = null;
  let resizeObserver: ResizeObserver | null = null;

  const cameraPos = options.cameraPosition ?? DEFAULT_CAMERA;
  const background = options.background ?? DEFAULT_BACKGROUND;

  function ensureContainerSize(el: HTMLElement): { width: number; height: number } {
    const rect = el.getBoundingClientRect();
    return {
      width: Math.max(1, Math.floor(rect.width)),
      height: Math.max(1, Math.floor(rect.height)),
    };
  }

  function tick(): void {
    if (!renderer || !threeScene || !camera) return;
    renderer.render(threeScene, camera);
    rafHandle = requestAnimationFrame(tick);
  }

  function startAutoResize(el: HTMLElement): void {
    resizeObserver = new ResizeObserver(() => {
      if (!renderer || !camera || !container) return;
      const { width, height } = ensureContainerSize(el);
      // V4 follow-up: pass `updateStyle = true` (the three.js default) so
      // the renderer writes `canvas.style.width / height` in CSS pixels.
      // The previous `false` left CSS untouched, so on retina displays
      // (`devicePixelRatio >= 2`) the canvas element rendered at its
      // backing-store size (e.g. 1680x1528 inside an 840x764 column)
      // and overflowed the viewport column, covering the marketplace
      // panel to the right. With style updated, the attribute size
      // still tracks `devicePixelRatio` for sharpness, but the layout
      // box snaps to the parent's CSS size.
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(el);
  }

  function applyPose(pose: CameraPose): void {
    if (!camera) return;
    camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
    camera.lookAt(pose.lookAt[0], pose.lookAt[1], pose.lookAt[2]);
  }

  function nodePositions(): Array<[number, number, number]> {
    if (!builtScene) return [];
    const out: Array<[number, number, number]> = [];
    for (const mesh of builtScene.nodes.values()) {
      out.push([mesh.position.x, mesh.position.y, mesh.position.z]);
    }
    return out;
  }

  return {
    mount(el: HTMLElement) {
      if (renderer) {
        throw new Error('[engine-sdk] mount() called twice without dispose()');
      }
      container = el;
      const { width, height } = ensureContainerSize(el);

      renderer = new WebGLRenderer({ antialias: options.antialias ?? true });
      renderer.setPixelRatio(window.devicePixelRatio);
      // V4 follow-up: pass `updateStyle = true` (the three.js default) so
      // the renderer writes `canvas.style.width / height` in CSS pixels.
      // The previous `false` left CSS untouched, so on retina displays
      // (`devicePixelRatio >= 2`) the canvas element rendered at its
      // backing-store size (e.g. 1680x1528 inside an 840x764 column)
      // and overflowed the viewport column, covering the marketplace
      // panel to the right. With style updated, the attribute size
      // still tracks `devicePixelRatio` for sharpness, but the layout
      // box snaps to the parent's CSS size.
      renderer.setSize(width, height);
      renderer.setClearColor(new Color(background));
      el.appendChild(renderer.domElement);

      threeScene = new Scene();
      threeScene.background = new Color(background);

      const aspect = width / height;
      camera = new PerspectiveCamera(45, aspect, 0.1, 1000);
      camera.position.set(cameraPos[0], cameraPos[1], cameraPos[2]);
      camera.lookAt(0, 0, 0);

      const ambient = new AmbientLight(0xffffff, 0.6);
      threeScene.add(ambient);
      const key = new DirectionalLight(0xffffff, 0.8);
      key.position.set(8, 12, 6);
      threeScene.add(key);

      startAutoResize(el);
      tick();
    },

    async loadScene(scene: SceneSnapshot): Promise<void> {
      if (!threeScene) {
        throw new Error('[engine-sdk] loadScene() called before mount()');
      }
      if (builtScene) {
        threeScene.remove(builtScene.group);
        disposeGroup(builtScene.group);
      }
      builtScene = buildSceneGraph(scene);
      threeScene.add(builtScene.group);
      applySelection(builtScene.nodes, selectedNodeId);
    },

    selectNode(nodeId: string | null): void {
      selectedNodeId = nodeId;
      if (builtScene) {
        applySelection(builtScene.nodes, nodeId);
      }
    },

    resetView(): void {
      applyPose(computeResetView(cameraPos));
    },

    fitAll(): void {
      const pose = computeFitAll(nodePositions(), camera?.fov ?? 45);
      if (pose) applyPose(pose);
      else applyPose(computeResetView(cameraPos));
    },

    focusNode(nodeId: string): void {
      const mesh = builtScene?.nodes.get(nodeId);
      if (!mesh) return;
      applyPose(
        computeFocusOnPoint(
          [mesh.position.x, mesh.position.y, mesh.position.z],
          FOCUS_DISTANCE,
        ),
      );
    },

    resize(): void {
      if (!renderer || !camera || !container) return;
      const { width, height } = ensureContainerSize(container);
      // V4 follow-up: pass `updateStyle = true` (the three.js default) so
      // the renderer writes `canvas.style.width / height` in CSS pixels.
      // The previous `false` left CSS untouched, so on retina displays
      // (`devicePixelRatio >= 2`) the canvas element rendered at its
      // backing-store size (e.g. 1680x1528 inside an 840x764 column)
      // and overflowed the viewport column, covering the marketplace
      // panel to the right. With style updated, the attribute size
      // still tracks `devicePixelRatio` for sharpness, but the layout
      // box snaps to the parent's CSS size.
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },

    getSelectedNodeId(): string | null {
      return selectedNodeId;
    },

    dispose(): void {
      if (rafHandle !== null) {
        cancelAnimationFrame(rafHandle);
        rafHandle = null;
      }
      resizeObserver?.disconnect();
      resizeObserver = null;

      if (builtScene && threeScene) {
        threeScene.remove(builtScene.group);
        disposeGroup(builtScene.group);
      }
      builtScene = null;

      renderer?.dispose();
      if (renderer?.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer = null;
      threeScene = null;
      camera = null;
      container = null;
    },
  };
}

function disposeGroup(group: { traverse: (cb: (obj: unknown) => void) => void }): void {
  group.traverse((obj) => {
    const o = obj as {
      geometry?: { dispose: () => void };
      material?: { dispose: () => void } | Array<{ dispose: () => void }>;
    };
    o.geometry?.dispose();
    const mat = o.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  });
}
