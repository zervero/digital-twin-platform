import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';

import type { ApiClient } from '@dt/api-client';
import type { DigitalTwinEngine } from '@dt/engine-sdk';
import type { LoginResponse, MeResponse } from '@dt/contracts';

import { ApiClientKey } from '../../stores/api-store.js';
import { useSceneStore } from '../../stores/scene-store.js';

const engineMocks = {
  mount: vi.fn(),
  loadScene: vi.fn(async () => undefined),
  clearScene: vi.fn(),
  selectNode: vi.fn(),
  resetView: vi.fn(),
  fitAll: vi.fn(),
  focusNode: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  getSelectedNodeId: vi.fn(() => null as string | null),
};

vi.mock('@dt/engine-sdk', () => ({
  createEngine: (): DigitalTwinEngine => engineMocks as unknown as DigitalTwinEngine,
}));

import SceneViewport from '../SceneViewport.vue';

function fakeApiClient(): ApiClient {
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
  } as unknown as ApiClient;
}

async function mountViewport(selectedNodeId: string | null = null) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const wrapper = mount(SceneViewport, {
    global: {
      plugins: [pinia],
      provide: { [ApiClientKey as symbol]: fakeApiClient() },
    },
  });
  const sceneStore = useSceneStore();
  sceneStore.snapshot = {
    id: 'scene-1',
    tenantId: 'acme-corp',
    name: 'Plant',
    nodes: [
      {
        id: 'machine-1',
        tenantId: 'acme-corp',
        name: 'M1',
        type: 'machine',
        position: [0, 0, 0],
      },
    ],
  };
  sceneStore.selectNode(selectedNodeId);
  await flushPromises();
  return { wrapper, sceneStore };
}

describe('SceneViewport tool strips', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders top-right and bottom-center tool strips', async () => {
    const { wrapper } = await mountViewport();
    const strips = wrapper.findAll('[role="toolbar"]');
    expect(strips.length).toBe(2);
    expect(wrapper.find('.scene-viewport__tools--top').exists()).toBe(true);
    expect(wrapper.find('.scene-viewport__tools--bottom').exists()).toBe(true);
  });

  it('calls resetView / fitAll / focusNode from the camera strip', async () => {
    const { wrapper } = await mountViewport('machine-1');
    const bottom = wrapper.find('.scene-viewport__tools--bottom');
    const buttons = bottom.findAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3);

    await buttons.find((b) => b.attributes('aria-label')?.includes('Reset'))!.trigger('click');
    expect(engineMocks.resetView).toHaveBeenCalledTimes(1);

    await buttons.find((b) => b.attributes('aria-label')?.includes('Fit'))!.trigger('click');
    expect(engineMocks.fitAll).toHaveBeenCalledTimes(1);

    await buttons.find((b) => b.attributes('aria-label')?.includes('Focus'))!.trigger('click');
    expect(engineMocks.focusNode).toHaveBeenCalledWith('machine-1');
  });

  it('disables focus when nothing is selected', async () => {
    const { wrapper } = await mountViewport(null);
    const bottom = wrapper.find('.scene-viewport__tools--bottom');
    const focusBtn = bottom
      .findAll('button')
      .find((b) => b.attributes('aria-label')?.includes('Focus'));
    expect(focusBtn?.attributes('disabled')).toBeDefined();
  });

  it('stubs layers and settings as disabled with aria labels', async () => {
    const { wrapper } = await mountViewport();
    const top = wrapper.find('.scene-viewport__tools--top');
    const buttons = top.findAll('button');
    expect(buttons.length).toBe(2);
    for (const btn of buttons) {
      expect(btn.attributes('disabled')).toBeDefined();
      expect(btn.attributes('aria-label')).toBeTruthy();
    }
  });

  it('clears the engine when the scene snapshot is dropped', async () => {
    const { sceneStore } = await mountViewport();
    expect(engineMocks.loadScene).toHaveBeenCalled();
    engineMocks.clearScene.mockClear();

    sceneStore.clear();
    await flushPromises();

    expect(engineMocks.clearScene).toHaveBeenCalledTimes(1);
  });
});
