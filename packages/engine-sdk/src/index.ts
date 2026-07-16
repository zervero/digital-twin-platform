/**
 * @dt/engine-sdk
 *
 * Public surface. Vue code and other consumers must import only from this
 * file. Internal Three.js details are intentionally not re-exported.
 */

export { createEngine } from './digital-twin-engine.js';
export type {
  AssetLoadEvent,
  DigitalTwinEngine,
  EngineAssetsOptions,
  EngineOptions,
  LoadGlbFn,
} from './types.js';
