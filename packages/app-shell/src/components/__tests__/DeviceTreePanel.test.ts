import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';

import type { ApiClient } from '@dt/api-client';
import type { Device, LoginResponse, MeResponse } from '@dt/contracts';

import DeviceTreePanel from '../DeviceTreePanel.vue';
import { ApiClientKey } from '../../stores/api-store.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { useDeviceStore } from '../../stores/device-store.js';
import { useSceneStore } from '../../stores/scene-store.js';

function fakeApiClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    getMe: async () => ({ session: null } satisfies MeResponse),
    login: (async () => ({
      session: {
        user: { id: 'u', displayName: 'u', email: 'u@x', roles: ['viewer'] },
        token: 't',
        expiresAt: '2026-12-31T00:00:00.000Z',
        tenantId: 'acme-corp',
      },
    } satisfies LoginResponse)) as unknown as ApiClient['login'],
    logout: async () => undefined,
    setAuthToken: () => undefined,
    getHealth: async () => ({ ok: true }),
    getDevices: async () => [],
    getScene: async () => ({ id: 'x', tenantId: 'acme-corp', name: 'x', nodes: [] }),
    sendCommand: async () => ({ accepted: true as const, commandId: 'c' }),
    ...overrides,
  } as unknown as ApiClient;
}

function makeDevice(overrides: Partial<Device> & { line?: string; area?: string } = {}): Device {
  return {
    id: 'device-1',
    tenantId: 'acme-corp',
    name: 'CNC-01',
    status: 'online',
    sceneNodeId: 'machine-1',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function mountTree(devices: Device[] = [makeDevice()]) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const client = fakeApiClient();
  const wrapper = mount(DeviceTreePanel, {
    global: {
      plugins: [pinia],
      provide: { [ApiClientKey as symbol]: client },
    },
  });
  const deviceStore = useDeviceStore();
  deviceStore.setDevices(devices);
  const auth = useAuthStore();
  auth.state = {
    kind: 'authenticated',
    session: {
      user: { id: 'u', displayName: 'u', email: 'u@x', roles: ['viewer'] },
      token: 't',
      expiresAt: '2026-12-31T00:00:00.000Z',
      tenantId: 'acme-corp',
    },
  };
  return { wrapper, deviceStore, sceneStore: useSceneStore() };
}

describe('DeviceTreePanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders device leaves under the tenant root', async () => {
    const { wrapper } = mountTree([
      makeDevice({ id: 'device-1', name: 'CNC-01' }),
      makeDevice({ id: 'device-2', name: 'CNC-02', status: 'warning' }),
    ]);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('acme-corp');
    expect(wrapper.text()).toContain('CNC-01');
    expect(wrapper.text()).toContain('CNC-02');
    expect(wrapper.find('[data-node-id="device-1"]').exists()).toBe(true);
  });

  it('selects a device and syncs the scene node', async () => {
    const { wrapper, deviceStore, sceneStore } = mountTree([
      makeDevice({ id: 'device-1', sceneNodeId: 'machine-1' }),
      makeDevice({ id: 'device-2', name: 'CNC-02', sceneNodeId: 'machine-2' }),
    ]);
    await wrapper.vm.$nextTick();

    await wrapper.find('[data-node-id="device-2"]').trigger('click');

    expect(deviceStore.selectedDeviceId).toBe('device-2');
    expect(sceneStore.selectedNodeId).toBe('machine-2');
  });

  it('ignores clicks on the root node', async () => {
    const { wrapper, deviceStore } = mountTree();
    await wrapper.vm.$nextTick();

    await wrapper.find('[data-node-id="root:acme-corp"]').trigger('click');
    expect(deviceStore.selectedDeviceId).toBeNull();
  });

  it('groups devices by line when present', async () => {
    const { wrapper } = mountTree([
      makeDevice({ id: 'device-1', name: 'A', line: 'Line-1' } as Device & { line: string }),
      makeDevice({ id: 'device-2', name: 'B', line: 'Line-1' } as Device & { line: string }),
    ]);
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-node-id="group:Line-1"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Line-1');
  });
});
