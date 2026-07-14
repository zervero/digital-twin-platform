import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';

import type { ApiClient } from '@dt/api-client';
import type { LoginResponse, MeResponse } from '@dt/contracts';
import { createPluginRegistry, type PluginRegistration } from '@dt/plugin-runtime';

import { ApiClientKey } from '../../stores/api-store.js';
import { usePluginStore } from '../../stores/plugin-store.js';
import OpsWorkspace from '../../workspaces/OpsWorkspace.vue';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

async function mountOps(regs: PluginRegistration[] = []) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const wrapper = mount(OpsWorkspace, {
    global: {
      plugins: [pinia],
      provide: { [ApiClientKey as symbol]: fakeApiClient() },
      stubs: {
        SceneViewport: true,
        DeviceTreePanel: true,
        DeviceDetailDrawer: true,
      },
    },
  });
  if (regs.length > 0) {
    const r = createPluginRegistry();
    for (const reg of regs) r.register(reg);
    const store = usePluginStore();
    store.setRegistry(r);
    await store.activateAll([]);
  }
  await flushPromises();
  return wrapper;
}

describe('PluginPanelHost tokens', () => {
  it('avoids hardcoded hex colors in favor of --dt-* tokens', () => {
    const src = readFileSync(resolve(__dirname, '../PluginPanelHost.vue'), 'utf8');
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(src).toMatch(/--dt-/);
  });
});

describe('OpsWorkspace plugin error UX', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('shows a muted empty state for errored plugins without raw permission strings', async () => {
    const HelloPanel = defineComponent({ template: '<div>hello</div>' });
    const wrapper = await mountOps([
      {
        manifest: {
          id: 'needs-write',
          name: 'Writer',
          version: '1.0.0',
          vendor: 'X',
          permissions: ['device:write'],
        },
        activate: async () => [
          { kind: 'ui-panel', panel: { id: 'w', title: 'W', component: HelloPanel } },
        ],
      },
    ]);

    const errored = wrapper.find('[data-plugin-id="needs-write"]');
    expect(errored.exists()).toBe(true);
    expect(errored.text()).toContain('Writer');
    expect(errored.text()).not.toMatch(/device:write/);
    expect(errored.text()).not.toMatch(/plugin requires missing permission/);
    expect(errored.find('.dt-empty').exists() || errored.classes().includes('plugin-alert')).toBe(
      true,
    );
  });
});
