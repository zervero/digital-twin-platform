import { describe, expect, it } from 'vitest';

import {
  createPluginRegistry,
  type PluginContext,
  type PluginExtension,
  type PluginRegistration,
} from '../index.js';

function ctx(granted: readonly string[] = []): PluginContext {
  return {
    grantedPermissions: granted as PluginContext['grantedPermissions'],
    subscribe: () => () => undefined,
  };
}

describe('createPluginRegistry', () => {
  it('starts empty', () => {
    const r = createPluginRegistry();
    expect(r.list()).toEqual([]);
  });

  it('rejects duplicate ids', () => {
    const r = createPluginRegistry();
    const reg: PluginRegistration = {
      manifest: { id: 'a', name: 'A', version: '1.0.0', vendor: 'X', permissions: [] },
      activate: async () => [],
    };
    r.register(reg);
    expect(() => r.register(reg)).toThrow(/already registered/);
  });

  it('activates plugins whose required permissions are granted', async () => {
    const r = createPluginRegistry();
    const panel: PluginExtension = {
      kind: 'ui-panel',
      panel: { id: 'a-panel', title: 'A', component: {} as never },
    };
    const reg: PluginRegistration = {
      manifest: { id: 'a', name: 'A', version: '1.0.0', vendor: 'X', permissions: ['device:read'] },
      activate: async () => [panel],
    };
    r.register(reg);
    const changes: string[] = [];
    r.subscribe((c) => changes.push(`${c.pluginId}:${c.prev}->${c.next}`));
    await r.activateAll(ctx(['device:read']));
    const entry = r.get('a');
    expect(entry?.state).toBe('active');
    expect(entry?.extensions).toEqual([panel]);
    expect(changes).toEqual(['a:inactive->activating', 'a:activating->active']);
  });

  it('rejects plugins whose required permissions are NOT granted', async () => {
    const r = createPluginRegistry();
    const reg: PluginRegistration = {
      manifest: { id: 'a', name: 'A', version: '1.0.0', vendor: 'X', permissions: ['device:write'] },
      activate: async () => [],
    };
    r.register(reg);
    await r.activateAll(ctx(['device:read']));
    const entry = r.get('a');
    expect(entry?.state).toBe('errored');
    expect(entry?.error?.code).toBe('PERMISSION_DENIED');
    expect(entry?.error?.missingPermissions).toEqual(['device:write']);
  });

  it('reports ACTIVATION_FAILED when activate() throws', async () => {
    const r = createPluginRegistry();
    const reg: PluginRegistration = {
      manifest: { id: 'a', name: 'A', version: '1.0.0', vendor: 'X', permissions: [] },
      activate: async () => { throw new Error('boom'); },
    };
    r.register(reg);
    await r.activateAll(ctx());
    const entry = r.get('a');
    expect(entry?.state).toBe('errored');
    expect(entry?.error?.code).toBe('ACTIVATION_FAILED');
    expect(entry?.error?.message).toContain('boom');
  });

  it('deactivateAll reverses active plugins in reverse order', async () => {
    const order: string[] = [];
    const r = createPluginRegistry();
    r.register({
      manifest: { id: 'a', name: 'A', version: '1.0.0', vendor: 'X', permissions: [] },
      activate: async () => { order.push('activate-a'); return []; },
      deactivate: async () => { order.push('deactivate-a'); },
    });
    r.register({
      manifest: { id: 'b', name: 'B', version: '1.0.0', vendor: 'X', permissions: [] },
      activate: async () => { order.push('activate-b'); return []; },
      deactivate: async () => { order.push('deactivate-b'); },
    });
    await r.activateAll(ctx());
    await r.deactivateAll();
    expect(order).toEqual([
      'activate-a', 'activate-b', 'deactivate-b', 'deactivate-a',
    ]);
  });

  it('does not block the other plugins when one fails to activate', async () => {
    const r = createPluginRegistry();
    r.register({
      manifest: { id: 'a', name: 'A', version: '1.0.0', vendor: 'X', permissions: [] },
      activate: async () => { throw new Error('boom'); },
    });
    r.register({
      manifest: { id: 'b', name: 'B', version: '1.0.0', vendor: 'X', permissions: [] },
      activate: async () => [],
    });
    await r.activateAll(ctx());
    expect(r.get('a')?.state).toBe('errored');
    expect(r.get('b')?.state).toBe('active');
  });
});
