/**
 * RealtimeBroadcaster — the BFF's in-process fan-out for DigitalTwinEvents.
 *
 * V2 keeps the BFF stateless across requests: it owns a single
 * `RealtimeStream` and a single `DevMockSource` (when in dev). Each
 * WebSocket client subscribes directly to the stream, so adding a new
 * transport later (SSE, MQTT) is a matter of providing another
 * subscription adapter, not a rewrite.
 *
 * V3.3 T7: subscribers are tenant-scoped. Every DigitalTwinEvent
 * carries a required `tenantId` (T1), so the broadcaster filters at
 * the subscribe boundary -- a client for tenant A only ever sees
 * tenant A's events. The filter is a 1-line predicate over the single
 * in-memory stream; we deliberately do not split into per-tenant
 * streams because the source-of-truth is one stream and the
 * broadcaster is the single point of policy.
 *
 * `ping` / `pong` also carry `tenantId` (see `@dt/contracts`),
 * so the filter naturally keeps per-tenant keepalive traffic
 * within the tenant. The WebSocket route stamps `tenantId` on
 * every outgoing keepalive; a ping without `tenantId` would be
 * silently dropped by every subscriber, which would defeat the
 * whole point of the keepalive. See `server.ts` `onOpen`.
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
   * V3.3 T7: subscribe to events for a specific tenant.
   *
   * The signature gains a `tenantId` parameter; the body
   * applies a 1-line predicate on `event.tenantId` so the
   * stream stays single-tenant-per-callback and the
   * broadcaster stays a single object. Returns an
   * unsubscribe function the caller MUST call on disconnect.
   */
  subscribeClient(
    tenantId: string,
    onEvent: (event: DigitalTwinEvent) => void,
  ): () => void {
    return this.stream.subscribe((event) => {
      if (event.tenantId === tenantId) onEvent(event);
    });
  }

  close(): void {
    this.stream.close();
  }
}
