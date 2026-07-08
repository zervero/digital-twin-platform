/**
 * @dt/plugin-registry — public surface.
 *
 * V3.4 entry point. Re-exports the marketplace data
 * model (`Plugin`, `PluginVersion`, `RegistryIndex`)
 * and the `createInMemoryPluginIndex` factory used by
 * the BFF routes in T3 / T6 and by the smoke in T8.
 *
 * The package is pure types + an in-memory test factory.
 * Production uses the file-based implementation wired
 * in apps/bff/src/plugins/ (V3.4 T4). The in-memory
 * factory is also what `apps/bff` tests construct in
 * place of the file backend when running unit tests.
 */

export type {
  Plugin,
  PluginVersion,
  RegistryIndex,
} from './registry.js';
export { createInMemoryPluginIndex } from './registry.js';
