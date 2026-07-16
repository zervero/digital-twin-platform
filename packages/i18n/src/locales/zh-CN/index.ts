import common from './common.json';
import device from './device.json';
import auth from './auth.json';
import marketplace from './marketplace.json';
import scene from './scene.json';
import shell from './shell.json';
import plugin from './plugin.json';

export const zhCN = {
  ...common,
  ...device,
  ...auth,
  ...marketplace,
  ...scene,
  ...shell,
  ...plugin,
} as const;

export type ZhCNDictionary = typeof zhCN;
