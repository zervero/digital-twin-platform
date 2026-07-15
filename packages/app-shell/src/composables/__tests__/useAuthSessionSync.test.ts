import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';

import type { ApiClient } from '@dt/api-client';
import type { LoginResponse, MeResponse, Permission } from '@dt/contracts';
import { createPluginRegistry, type PluginRegistration } from '@dt/plugin-runtime';

import { useAuthSessionSync } from '../useAuthSessionSync.js';
import { ApiClientKey } from '../../stores/api-store.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { useDeviceStore } from '../../stores/device-store.js';
import { usePluginStore } from '../../stores/plugin-store.js';
import { useSceneStore } from '../../stores/scene-store.js';

function fakeApiClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    getMe: async () => ({ session: null } satisfies MeResponse),
    login: (async () => ({
      session: {
        user: { id: 'u', displayName: 'u', email: 'u@x', roles: ['admin'] },
        token: 'fresh-token',
        expiresAt: '2026-12-31T00:00:00.000Z',
        tenantId: 'acme-corp',
      },
    } satisfies LoginResponse)) as unknown as ApiClient['login'],
    logout: async () => undefined,
    setAuthToken: () => undefined,
    getHealth: async () => ({ ok: true }),
    getDevices: async () => [
      {
        id: 'd1',
        tenantId: 'acme-corp',
        name: 'CNC-01',
        status: 'online',
        sceneNodeId: 'n1',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    getScene: async () => ({
      id: 's1',
      tenantId: 'acme-corp',
      name: 'Factory',
      nodes: [],
    }),
    sendCommand: async () => ({ accepted: true as const, commandId: 'c' }),
    ...overrides,
  } as unknown as ApiClient;
}

const samplePlugin: PluginRegistration = {
  manifest: {
    id: 'hello',
    name: 'Hello',
    version: '1.0.0',
    vendor: 'dt',
    permissions: ['auth:login'] as Permission[],
  },
  activate: async () => [],
};

describe('useAuthSessionSync', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('re-activates plugins and reloads twin data after login', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const client = fakeApiClient();
    const activateSpy = vi.fn(async () => undefined);
    const deactivateSpy = vi.fn(async () => undefined);

    const Host = defineComponent({
      name: 'AuthSyncHost',
      setup() {
        useAuthSessionSync();
        return () => h('div');
      },
    });

    mount(Host, {
      global: {
        plugins: [pinia],
        provide: { [ApiClientKey as symbol]: client },
      },
    });

    const pluginStore = usePluginStore();
    const registry = createPluginRegistry();
    registry.register(samplePlugin);
    pluginStore.setRegistry(registry);
    pluginStore.activateAll = activateSpy;
    pluginStore.deactivateAll = deactivateSpy;

    const deviceStore = useDeviceStore();
    const sceneStore = useSceneStore();
    const loadDevices = vi.spyOn(deviceStore, 'load');
    const loadScene = vi.spyOn(sceneStore, 'load');

    const auth = useAuthStore();
    await auth.login('admin@x.test');
    await flushPromises();
    await nextTick();

    expect(deactivateSpy).toHaveBeenCalled();
    expect(activateSpy).toHaveBeenCalled();
    expect(loadDevices).toHaveBeenCalled();
    expect(loadScene).toHaveBeenCalled();
  });

  it('re-gates plugins after logout', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const client = fakeApiClient();

    const Host = defineComponent({
      name: 'AuthSyncHost',
      setup() {
        useAuthSessionSync();
        return () => h('div');
      },
    });

    mount(Host, {
      global: {
        plugins: [pinia],
        provide: { [ApiClientKey as symbol]: client },
      },
    });

    const pluginStore = usePluginStore();
    const activateSpy = vi.fn(async () => undefined);
    const deactivateSpy = vi.fn(async () => undefined);
    pluginStore.activateAll = activateSpy;
    pluginStore.deactivateAll = deactivateSpy;

    const deviceStore = useDeviceStore();
    const sceneStore = useSceneStore();
    deviceStore.devices = [
      {
        id: 'd1',
        tenantId: 'acme-corp',
        name: 'CNC-01',
        status: 'online',
        sceneNodeId: 'n1',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    sceneStore.snapshot = {
      id: 's1',
      tenantId: 'acme-corp',
      name: 'Factory',
      nodes: [],
    };
    const loadDevices = vi.spyOn(deviceStore, 'load');
    const loadScene = vi.spyOn(sceneStore, 'load');

    const auth = useAuthStore();
    auth.state = {
      kind: 'authenticated',
      session: {
        user: { id: 'u', displayName: 'u', email: 'u@x', roles: ['admin'] },
        token: 't',
        expiresAt: '2026-12-31T00:00:00.000Z',
        tenantId: 'acme-corp',
      },
    };
    await flushPromises();
    activateSpy.mockClear();
    deactivateSpy.mockClear();
    loadDevices.mockClear();
    loadScene.mockClear();

    await auth.logout();
    await flushPromises();
    await nextTick();

    expect(deactivateSpy).toHaveBeenCalled();
    expect(activateSpy).toHaveBeenCalledWith([]);
    expect(loadDevices).not.toHaveBeenCalled();
    expect(loadScene).not.toHaveBeenCalled();
    expect(deviceStore.devices).toEqual([]);
    expect(sceneStore.snapshot).toBeNull();
  });
});
