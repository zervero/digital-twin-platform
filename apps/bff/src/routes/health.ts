import { Hono } from 'hono';

import type { ApiHealth } from '@dt/contracts';

export const healthRoute = new Hono();

const health: ApiHealth = {
  ok: true,
  service: 'digital-twin-bff',
  version: '0.1.0',
};

healthRoute.get('/health', (c) => c.json(health));
