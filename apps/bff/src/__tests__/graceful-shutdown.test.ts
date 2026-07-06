import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { healthRoute } from '../routes/health.js';

describe('health / readiness', () => {
  it('GET /health returns 200 when not shutting down', async () => {
    const app = new Hono();
    app.route('/', healthRoute({ isShuttingDown: () => false }));
    const res = await app.request('/health');
    expect(res.status).toBe(200);
  });

  it('GET /health returns 200 even during shutdown (liveness vs readiness)', async () => {
    const app = new Hono();
    app.route('/', healthRoute({ isShuttingDown: () => true }));
    const res = await app.request('/health');
    expect(res.status).toBe(200);
  });

  it('GET /ready returns 200 when not shutting down', async () => {
    const app = new Hono();
    app.route('/', healthRoute({ isShuttingDown: () => false }));
    const res = await app.request('/ready');
    expect(res.status).toBe(200);
  });

  it('GET /ready returns 503 when shutting down', async () => {
    const app = new Hono();
    app.route('/', healthRoute({ isShuttingDown: () => true }));
    const res = await app.request('/ready');
    expect(res.status).toBe(503);
  });

  it('GET /ready body includes a reason when not ready', async () => {
    const app = new Hono();
    app.route('/', healthRoute({ isShuttingDown: () => true }));
    const res = await app.request('/ready');
    const body = (await res.json()) as { ok: boolean; reason?: string };
    expect(body.ok).toBe(false);
    expect(body.reason).toBe('shutting down');
  });
});
