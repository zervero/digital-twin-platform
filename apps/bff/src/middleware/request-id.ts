/**
 * requestId middleware.
 *
 * Honors an incoming `X-Request-Id` header (for client-supplied
 * correlation across services) and falls back to a fresh UUID when
 * none is provided. The id is stashed on the Hono context and
 * echoed back on the response so callers can pin logs to a request.
 */

import { randomUUID } from 'node:crypto';

import type { MiddlewareHandler } from 'hono';

declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
  }
}

export function requestId(): MiddlewareHandler {
  return async (c, next) => {
    const incoming = c.req.header('x-request-id');
    const id = incoming && incoming.length > 0 ? incoming : randomUUID();
    c.set('requestId', id);
    c.header('X-Request-Id', id);
    await next();
  };
}
