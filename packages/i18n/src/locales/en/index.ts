/**
 * English (default) locale — merged at build / load time.
 * Each namespace file is JSON-imported and merged into one
 * nested dictionary so `t('marketplace.installHint')` resolves
 * the same way regardless of which JSON the key came from.
 */
import common from './common.json';
import device from './device.json';
import auth from './auth.json';
import marketplace from './marketplace.json';
import scene from './scene.json';

export const en = {
  ...common,
  ...device,
  ...auth,
  ...marketplace,
  ...scene,
} as const;

export type EnDictionary = typeof en;
