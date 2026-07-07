/**
 * BFF entry point.
 *
 * V3.1: this file is intentionally tiny. The real work
 * lives in `./bootstrap.ts`, which we await at the top
 * level. Splitting entry from bootstrap lets the OTel SDK
 * (started in `bootstrap`) register its require-hook
 * before Hono / ws are loaded (they're imported by
 * `./server.ts`, which `bootstrap` dynamic-imports).
 *
 * V2.3 added graceful shutdown: SIGTERM / SIGINT drain
 * WebSockets, flip `/ready` to 503, stop the dev mock
 * source, close the HTTP server, then exit. The shutdown
 * handler in `./bootstrap.ts` extends that to flush the
 * OTel SDK as the last step so the SIGTERM telemetry
 * isn't lost.
 */

import { bootstrap } from './bootstrap.js';

await bootstrap();
