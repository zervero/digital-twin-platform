import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';

import type { ApiClient } from '@dt/api-client';
import type { Device, LoginResponse, MeResponse } from '@dt/contracts';

import DeviceDetailDrawer from '../DeviceDetailDrawer.vue';
import { ApiClientKey } from '../../stores/api-store.js';
import { useDeviceStore } from '../../stores/device-store.js';

function fakeApiClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    getMe: async () => ({ session: null } satisfies MeResponse),
    login: (async () => ({
      session: {
        user: { id: 'u', displayName: 'u', email: 'u@x', roles: ['viewer'] },
        token: 't',
        expiresAt: '2026-12-31T00:00:00.000Z',
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

function makeDevice(overrides: Partial<Device> = {}): Device {
  return {
    id: 'device-1',
    tenantId: 'acme-corp',
    name: 'CNC-01',
    status: 'online',
    sceneNodeId: 'machine-1',
    updatedAt: '2026-01-01T08:00:00.000Z',
    ...overrides,
  };
}

function mountDrawer(device: Device | null = makeDevice()) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const client = fakeApiClient();
  const wrapper = mount(DeviceDetailDrawer, {
    global: {
      plugins: [pinia],
      provide: { [ApiClientKey as symbol]: client },
    },
  });
  const deviceStore = useDeviceStore();
  if (device) {
    deviceStore.setDevices([device]);
    deviceStore.selectDevice(device.id);
  } else {
    deviceStore.setDevices([]);
    deviceStore.selectDevice(null);
  }
  return { wrapper, deviceStore };
}

describe('DeviceDetailDrawer', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('shows empty state when nothing is selected', async () => {
    const { wrapper } = mountDrawer(null);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('No device selected');
  });

  it('renders status pill, tabs, KPI cards, and telemetry fields', async () => {
    const { wrapper } = mountDrawer(
      makeDevice({ name: 'CNC-01', status: 'warning', id: 'device-1' }),
    );
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('CNC-01');
    expect(wrapper.text()).toContain('预警');
    expect(wrapper.text()).toContain('Overview');
    expect(wrapper.text()).toContain('Runtime');
    expect(wrapper.text()).toContain('Uptime');
    expect(wrapper.text()).toContain('Telemetry');
    expect(wrapper.text()).toContain('device-1');
    expect(wrapper.text()).toContain('machine-1');
    expect(wrapper.findAll('.dt-stat-card').length).toBe(4);
  });

  it('switches tab content', async () => {
    const { wrapper } = mountDrawer();
    await wrapper.vm.$nextTick();

    const runtimeTab = wrapper
      .findAll('[role="tab"]')
      .find((n) => n.text() === 'Runtime');
    expect(runtimeTab).toBeTruthy();
    await runtimeTab!.trigger('click');
    expect(wrapper.text()).toContain('No data for this tab yet');
  });
});
