import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp, defineComponent, effectScope } from 'vue';

import type { ApiClient } from '@dt/api-client';
import { createPluginRegistry, type PluginRegistration } from '@dt/plugin-runtime';

import { ApiClientKey } from '../../stores/api-store.js';
import { usePluginStore } from '../../stores/plugin-store.js';
import { usePluginPanels, usePluginMenu } from '../index.js';

const HelloPanel = defineComponent({ template: '<div>hello</div>' });

function fakeApi(): ApiClient {
  return {
    getHealth: async () => ({ ok: true }),
    getDevices: async () => [],
    getScene: async () => ({ id: 'x', tenantId: 'acme-corp', name: 'x', nodes: [] }),
    sendCommand: async () => ({ accepted: true as const, commandId: 'c' }),
    getMe: async () => ({ session: null }),
    login: (async () => ({
      session: {
        user: { id: 'u', displayName: 'u', email: 'u@x', roles: ['viewer'] },
        token: 't',
        expiresAt: '2026-12-31T00:00:00.000Z',
      },
    })) as unknown as ApiClient['login'],
    logout: async () => undefined,
    setAuthToken: () => undefined,
  } as unknown as ApiClient;
}

function withShell<T>(fn: () => T): T {
  const app = createApp({});
  app.provide(ApiClientKey, fakeApi());
  let result!: T;
  effectScope(true).run(() => {
    app.runWithContext(() => {
      result = fn();
    });
  });
  return result;
}

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('usePluginStore + composables', () => {
  it('exposes zero panels and zero menu items with no registry', () => {
    withShell(() => {
      expect(usePluginPanels().value).toEqual([]);
      expect(usePluginMenu().value).toEqual([]);
    });
  });

  it('surfaces active plugins through usePluginPanels and usePluginMenu', async () => {
    const reg: PluginRegistration = {
      manifest: { id: 'hello', name: 'Hello', version: '1.0.0', vendor: 'X', permissions: [] },
      activate: async () => [
        { kind: 'ui-panel', panel: { id: 'hello-panel', title: 'Hello', component: HelloPanel } },
        { kind: 'menu-item', item: { id: 'hello-menu', label: 'Say hi', onSelect: () => undefined } },
      ],
    };
    const r = createPluginRegistry();
    r.register(reg);
    await withShell(async () => {
      const store = usePluginStore();
      store.setRegistry(r);
      await store.activateAll([]);
      const panels = usePluginPanels();
      const items = usePluginMenu();
      expect(panels.value.map((p) => p.id)).toEqual(['hello-panel']);
      expect(items.value.map((i) => i.id)).toEqual(['hello-menu']);
      await store.deactivateAll();
      expect(usePluginPanels().value).toEqual([]);
    });
  });

  it('reports errored plugins but still surfaces successful ones', async () => {
    const good: PluginRegistration = {
      manifest: { id: 'good', name: 'Good', version: '1.0.0', vendor: 'X', permissions: [] },
      activate: async () => [
        { kind: 'ui-panel', panel: { id: 'good-panel', title: 'G', component: HelloPanel } },
      ],
    };
    const bad: PluginRegistration = {
      manifest: { id: 'bad', name: 'Bad', version: '1.0.0', vendor: 'X', permissions: [] },
      activate: async () => { throw new Error('boom'); },
    };
    const r = createPluginRegistry();
    r.register(good);
    r.register(bad);
    await withShell(async () => {
      const store = usePluginStore();
      store.setRegistry(r);
      await store.activateAll([]);
      const entries = store.entries;
      expect(entries.find((e) => e.manifest.id === 'bad')?.state).toBe('errored');
      expect(usePluginPanels().value.map((p) => p.id)).toEqual(['good-panel']);
    });
  });
});
