import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, effectScope } from 'vue';

import type { ApiClient } from '@dt/api-client';

import { ApiClientKey } from '../../stores/api-store.js';
import { useDeviceStream } from '../useDeviceStream.js';

vi.mock('@dt/realtime', () => {
  type Listener = (e: unknown) => void;
  const g = globalThis as unknown as { __wsListener?: Listener };
  return {
    createWebSocketStream: vi.fn(() => ({
      subscribe: (l: Listener) => {
        g.__wsListener = l;
        return () => {
          g.__wsListener = undefined;
        };
      },
      publish: vi.fn(),
      close: vi.fn(),
    })),
  };
});

function emit(e: unknown): void {
  const g = globalThis as unknown as { __wsListener?: (e: unknown) => void };
  g.__wsListener?.(e);
}

function makeFakeClient(): ApiClient {
  return {
    getDevices: async () => [],
    getScene: async () => ({ id: 'x', name: 'x', nodes: [] }),
    sendCommand: async () => ({ commandId: 'c', status: 'accepted' as const }),
  } as unknown as ApiClient;
}

beforeEach(() => {
  setActivePinia(createPinia());
});

/**
 * Run `fn` inside:
 *   1. an active Vue effect scope (so `onScopeDispose` works),
 *   2. a Vue app context that provides `ApiClientKey` (so
 *      `useDeviceStore` can `inject()` it).
 */
function withApi<T>(fn: () => T): T {
  const app = createApp({});
  app.provide(ApiClientKey, makeFakeClient());
  let result!: T;
  effectScope(true).run(() => {
    app.runWithContext(() => {
      result = fn();
    });
  });
  return result;
}

describe('useDeviceStream', () => {
  it('updates the device store on device:list-updated', async () => {
    const { useDeviceStore } = await import('../../stores/device-store.js');
    withApi(() => {
      useDeviceStream({ url: 'ws://x' });
      const store = useDeviceStore();
      expect(store.devices).toEqual([]);
      emit({
        type: 'device:list-updated',
        payload: [
          { id: 'd1', name: 'n1', status: 'online', sceneNodeId: 's', updatedAt: '2026-01-01T00:00:00.000Z' },
        ],
        timestamp: new Date().toISOString(),
      });
      expect(store.devices).toHaveLength(1);
      expect(store.devices[0]!.id).toBe('d1');
      expect(store.devices[0]!.status).toBe('online');
    });
  });

  it('upserts a single device on device:updated', async () => {
    const { useDeviceStore } = await import('../../stores/device-store.js');
    withApi(() => {
      useDeviceStream({ url: 'ws://x' });
      const store = useDeviceStore();
      emit({
        type: 'device:list-updated',
        payload: [
          { id: 'd1', name: 'n1', status: 'online', sceneNodeId: 's', updatedAt: '2026-01-01T00:00:00.000Z' },
        ],
        timestamp: new Date().toISOString(),
      });
      emit({
        type: 'device:updated',
        payload: { id: 'd1', name: 'n1', status: 'warning', sceneNodeId: 's', updatedAt: '2026-02-01T00:00:00.000Z' },
        timestamp: new Date().toISOString(),
      });
      expect(store.devices).toHaveLength(1);
      expect(store.devices[0]!.status).toBe('warning');
    });
  });

  it('starts in connecting status', () => {
    withApi(() => {
      const handle = useDeviceStream({ url: 'ws://x' });
      expect(handle.status.value).toBe('connecting');
    });
  });
});
