/**
 * Bootstrap-with-plugins integration test.
 *
 * Drives the full `bootstrapAppShell` path with a sample
 * plugin and asserts the plugin store surfaces its panel
 * once activation finishes. Uses happy-dom (already
 * configured for the package) for the mount target. The
 * `SceneViewport` (which mounts a Three.js engine that needs
 * a real WebGL context) is stubbed at the module level so the
 * test does not depend on the engine environment.
 */

import { setActivePinia, createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, effectScope } from 'vue';

import { createApiClient } from '@dt/api-client';
import { validatePluginManifest, type PluginRegistration } from '@dt/plugin-runtime';
import { createInMemoryStream, type RealtimeStream } from '@dt/realtime';

import { usePluginStore } from '../stores/plugin-store.js';
import { bootstrapAppShell } from '../index.js';

// Stub the Three.js viewport. The real one constructs a
// WebGL context that happy-dom does not provide.
vi.mock('../components/SceneViewport.vue', () => ({
  default: defineComponent({ name: 'SceneViewport', template: '<div data-testid="viewport" />' }),
}));

// V4-prep redesign: TopToolbar now reads the realtime connection
// status via useDeviceStream. The composable opens a WebSocket
// at construction time, and happy-dom does not provide one. Stub
// the composable so this test stays focused on plugin activation.
vi.mock('../composables/useDeviceStream.js', () => ({
  useDeviceStream: () => ({
    status: { value: 'closed' as const },
    latestEvent: { value: null },
    close: () => undefined,
  }),
}));

function fakeFetch(url: string): Promise<Response> {
  if (url.endsWith('/api/auth/me')) {
    return Promise.resolve(new Response(JSON.stringify({ session: null }), { status: 200 }));
  }
  if (url.endsWith('/api/devices')) {
    return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
  }
  if (url.endsWith('/api/scene')) {
    return Promise.resolve(
      new Response(
        JSON.stringify({ id: 'x', tenantId: 'acme-corp', name: 'x', nodes: [] }),
        { status: 200 },
      ),
    );
  }
  return Promise.resolve(new Response('not found', { status: 404 }));
}

describe('bootstrapAppShell with plugins', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    sessionStorage.clear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('activates a plugin and surfaces its panel through usePluginPanels', async () => {
    document.body.innerHTML = '<div id="host"></div>';
    const apiClient = createApiClient({ baseUrl: 'http://x', fetchImpl: fakeFetch as typeof fetch });
    const realtime: RealtimeStream = createInMemoryStream();

    const reg: PluginRegistration = {
      manifest: { id: 'sample', name: 'Sample', version: '1.0.0', vendor: 'X', permissions: [] },
      activate: async () => [
        { kind: 'ui-panel', panel: { id: 'sample-panel', title: 'S', component: { render: () => null } } },
      ],
    };

    const app = await bootstrapAppShell({
      apiClient,
      host: document.getElementById('host')!,
      plugins: [reg],
      realtime,
    });

    // The plugin store, queried in the same app context, should
    // see the panel. The composable requires a Vue context, so
    // we re-enter the app's runWithContext.
    const panels = await new Promise<unknown[]>((resolve) => {
      effectScope(true).run(() => {
        app.runWithContext(() => {
          const store = usePluginStore();
          resolve([...store.panels]);
        });
      });
    });
    expect(panels[0]).toMatchObject({ id: 'sample-panel' });

    app.unmount();
  });

  it('manifest validation: sample manifest is acceptable', () => {
    const r = validatePluginManifest({
      id: 'sample',
      name: 'Sample',
      version: '1.0.0',
      vendor: 'X',
      permissions: ['device:read'],
    });
    expect(r.ok).toBe(true);
  });
});
