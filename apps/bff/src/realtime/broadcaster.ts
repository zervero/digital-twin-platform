/**
 * RealtimeBroadcaster — the BFF's in-process fan-out for DigitalTwinEvents.
 *
 * V2 keeps the BFF stateless across requests: it owns a single
 * `RealtimeStream` and a single `DevMockSource` (when in dev). Each
 * WebSocket client subscribes directly to the stream, so adding a new
 * transport later (SSE, MQTT) is a matter of providing another
 * subscription adapter, not a rewrite.
 */

import {
  createInMemoryStream,
  type RealtimeStream,
} from '@dt/realtime';
import type { DigitalTwinEvent } from '@dt/contracts';

export class RealtimeBroadcaster {
  private readonly stream: RealtimeStream = createInMemoryStream();

  publish(event: DigitalTwinEvent): void {
    this.stream.publish(event);
  }

  /**
   * Used by the WebSocket route to subscribe to outgoing events.
   * Returns an unsubscribe function the caller MUST call on disconnect.
   */
  subscribeClient(onEvent: (event: DigitalTwinEvent) => void): () => void {
    return this.stream.subscribe(onEvent);
  }

  close(): void {
    this.stream.close();
  }
}
