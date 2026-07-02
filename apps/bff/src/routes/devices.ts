import { Hono } from 'hono';

import type { Device } from '@dt/contracts';

import { DEMO_DEVICES } from '../mock/demo-data.js';

export const devicesRoute = new Hono();

devicesRoute.get('/devices', (c) => {
  const devices: Device[] = DEMO_DEVICES;
  return c.json(devices);
});
