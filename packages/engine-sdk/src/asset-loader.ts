/**
 * Host-resolved GLB loading + in-memory template cache (ADR 0021).
 *
 * Templates are retained across `clearScene`; instances are cloned per node.
 * Default loader uses Three.js GLTFLoader; tests inject `loadGlb`.
 */

import type { Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type LoadGlbFn = (url: string) => Promise<Object3D>;

let sharedLoader: GLTFLoader | null = null;

function defaultLoadGlb(url: string): Promise<Object3D> {
  if (!sharedLoader) sharedLoader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    sharedLoader!.load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      (err) => reject(err instanceof Error ? err : new Error(String(err))),
    );
  });
}

export interface AssetCatalog {
  resolveUrl(modelId: string): string | null;
  /**
   * Optional host hook: turn a catalog source URL into a locally readable
   * URL (blob: / file / cached) before GLTFLoader runs (ADR 0022).
   */
  ensureLocalUrl?(url: string): Promise<string>;
  loadGlb?: LoadGlbFn;
}

export interface AssetCache {
  /** Resolve modelId → URL (null if unknown). */
  resolve(modelId: string): string | null;
  /** Load or return cached template; never returns a live instance. */
  getTemplate(url: string): Promise<Object3D>;
  /** Deep-clone a cached template for scene placement. */
  createInstance(url: string): Promise<Object3D>;
  /** Clear template cache (dispose path). */
  clearTemplates(): void;
}

export function createAssetCache(catalog: AssetCatalog): AssetCache {
  const templates = new Map<string, Object3D>();
  const inflight = new Map<string, Promise<Object3D>>();
  const loadGlb = catalog.loadGlb ?? defaultLoadGlb;

  async function getTemplate(sourceUrl: string): Promise<Object3D> {
    const hit = templates.get(sourceUrl);
    if (hit) return hit;
    const pending = inflight.get(sourceUrl);
    if (pending) return pending;

    const promise = (async () => {
      const loadUrl = catalog.ensureLocalUrl
        ? await catalog.ensureLocalUrl(sourceUrl)
        : sourceUrl;
      return loadGlb(loadUrl);
    })()
      .then((root) => {
        templates.set(sourceUrl, root);
        inflight.delete(sourceUrl);
        return root;
      })
      .catch((err) => {
        inflight.delete(sourceUrl);
        throw err;
      });
    inflight.set(sourceUrl, promise);
    return promise;
  }

  return {
    resolve(modelId) {
      return catalog.resolveUrl(modelId);
    },
    getTemplate,
    async createInstance(url) {
      const tpl = await getTemplate(url);
      return tpl.clone(true);
    },
    clearTemplates() {
      templates.clear();
      inflight.clear();
    },
  };
}
