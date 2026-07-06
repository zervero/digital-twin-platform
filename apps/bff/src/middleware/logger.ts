/**
 * httpLogger middleware.
 *
 * Emits one structured log line per HTTP request once the response
 * has been produced, with `{ method, path, status, durationMs }`
 * plus the per-request `requestId` binding. Status → level mapping:
 *
 *   5xx → error
 *   4xx → warn
 *   else → info
 *
 * The supplied `Logger` is the *root* logger; we `child()` it per
 * request so the `requestId` binding rides along on every downstream
 * log line if other code in the route calls `c.get('logger')`.
 */

import type { Logger } from '@dt/observability';
import type { MiddlewareHandler } from 'hono';

export function httpLogger(root: Logger): MiddlewareHandler {
  return async (c, next) => {
    const requestId = c.get('requestId');
    const logger = root.child({ requestId });
    const started = Date.now();
    await next();
    const durationMs = Date.now() - started;
    const fields = {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs,
    };
    if (c.res.status >= 500) logger.error('http request', fields);
    else if (c.res.status >= 400) logger.warn('http request', fields);
    else logger.info('http request', fields);
  };
}
