/**
 * useDeviceStream — Vue composable that wires the realtime WebSocket
 * stream to the Pinia device store.
 *
 * Lifecycle:
 *   - On call: opens a stream against `options.url`, subscribes to
 *     events, mirrors `device:list-updated` → `setDevices` and
 *     `device:updated` → `upsertDevice` on the store.
 *   - On scope dispose: unsubscribes, closes the stream, and
 *     flips the returned `status` to `'closed'`.
 *
 * Status semantics are intentionally coarse:
 *   - `'connecting'` initially (no message has arrived yet)
 *   - `'open'` once any event has been delivered
 *   - `'closed'` once the scope is disposed
 *
 * The `'connecting'` state matches what consumers need to show a
 * "waiting for live data" hint without having to peek at the
 * transport directly.
 */

import { onScopeDispose, ref, type Ref } from 'vue';

import {
  createWebSocketStream,
  type RealtimeStream,
  type ReconnectOptions,
} from '@dt/realtime';
import type { DigitalTwinEvent } from '@dt/contracts';

import { useDeviceStore } from '../stores/device-store.js';

export type StreamStatus = 'connecting' | 'open' | 'closed';

export interface UseDeviceStreamHandle {
  status: Ref<StreamStatus>;
}

export interface UseDeviceStreamOptions {
  url: string;
  reconnect?: ReconnectOptions;
}

export function useDeviceStream(options: UseDeviceStreamOptions): UseDeviceStreamHandle {
  const status = ref<StreamStatus>('connecting');
  const store = useDeviceStore();

  const stream: RealtimeStream = createWebSocketStream(options);

  const unsubscribe = stream.subscribe((event: DigitalTwinEvent) => {
    status.value = 'open';
    switch (event.type) {
      case 'device:list-updated':
        store.setDevices(event.payload);
        break;
      case 'device:updated':
        store.upsertDevice(event.payload);
        break;
      // Other event types (scene:*, command:*, ping/pong) are not
      // device-shaped; the composable owns no state for them in V2.0.
      default:
        break;
    }
  });

  onScopeDispose(() => {
    unsubscribe();
    stream.close();
    status.value = 'closed';
  });

  return { status };
}
