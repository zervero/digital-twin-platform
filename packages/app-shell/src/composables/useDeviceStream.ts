/**
 * useDeviceStream -- Vue composable that wires the realtime WebSocket
 * stream to the Pinia device store.
 *
 * Lifecycle:
 *   - On call: opens a stream against options.url, subscribes to
 *     events, mirrors device:list-updated -> setDevices and
 *     device:updated -> upsertDevice on the store.
 *   - On token change: calls stream.reconnect() so the next
 *     WebSocket upgrade carries the latest bearer token via the
 *     subprotocols list. (WebSocket protocol forbids custom
 *     request headers; see @dt/realtime CreateWebSocketStreamOptions.
 *     The BFF reads the subprotocol back into Authorization and
 *     runs the existing requiresTenantScope gate.)
 *   - On scope dispose: unsubscribes, closes the stream, and
 *     flips the returned status to 'closed'.
 *
 * Status semantics are intentionally coarse:
 *   - 'connecting' initially (no message has arrived yet)
 *   - 'open' once any event has been delivered
 *   - 'closed' once the scope is disposed
 *
 * The 'connecting' state matches what consumers need to show a
 * 'waiting for live data' hint without having to peek at the
 * transport directly.
 */

import { inject, onScopeDispose, ref, watch, type Ref } from 'vue';

import {
  createWebSocketStream,
  type RealtimeStream,
  type ReconnectOptions,
} from '@dt/realtime';
import type { DigitalTwinEvent } from '@dt/contracts';

import { ApiClientKey } from '../stores/api-store.js';
import { useAuthStore } from '../stores/auth-store.js';
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
  const authStore = useAuthStore();
  // The ApiClient is the same one the auth store drives
  // via setAuthToken; reading getAuthToken() here keeps the
  // stream in sync with the same source of truth.
  const api = inject(ApiClientKey);

  const stream: RealtimeStream = createWebSocketStream({
    url: options.url,
    getToken: () => api?.getAuthToken() ?? null,
    reconnect: options.reconnect,
  });

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

  // Login flow: when the user goes from anonymous to
  // authenticated, force a reconnect so the next WS upgrade
  // carries the new token. Logout: the next upgrade would
  // 401, so we just let the existing connection close and
  // skip the reconnect path.
  const stopTokenWatch = watch(
    () => authStore.token,
    (next, prev) => {
      if (next && next !== prev) {
        stream.reconnect?.();
      }
    },
  );

  onScopeDispose(() => {
    stopTokenWatch();
    unsubscribe();
    stream.close();
    status.value = 'closed';
  });

  return { status };
}