/**
 * Optional host-injected engine options (Scheme C catalog resolveUrl).
 * apps/web provides this; SceneViewport injects it into createEngine().
 */

import type { InjectionKey } from 'vue';
import type { EngineOptions } from '@dt/engine-sdk';

export const EngineOptionsKey: InjectionKey<EngineOptions> = Symbol('dt:engineOptions');
