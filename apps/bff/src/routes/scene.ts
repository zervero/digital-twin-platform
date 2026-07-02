import { Hono } from 'hono';

import type { SceneSnapshot } from '@dt/contracts';

import { DEMO_SCENE } from '../mock/demo-data.js';

export const sceneRoute = new Hono();

sceneRoute.get('/scene', (c) => {
  const scene: SceneSnapshot = DEMO_SCENE;
  return c.json(scene);
});
