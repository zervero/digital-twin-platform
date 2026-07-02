/**
 * @dt/realtime
 *
 * V2 boundary. In V1 we only define the shape of the realtime stream and a
 * small in-memory implementation useful for dev and tests. The real WebSocket
 * and SSE transports arrive in V2.
 */

import type { Device, DigitalTwinEvent } from '@dt/contracts';

export interface RealtimeStream {
  subscribe(listener: (event: DigitalTwinEvent) => void): () => void;
  publish(event: DigitalTwinEvent): void;
  close(): void;
}

export interface DeviceUpdateSource {
  onDeviceUpdate(listener: (device: Device) => void): () => void;
  start(): void;
  stop(): void;
}

class InMemoryRealtimeStream implements RealtimeStream {
  private readonly listeners = new Set<(event: DigitalTwinEvent) => void>();
  private closed = false;

  subscribe(listener: (event: DigitalTwinEvent) => void): () => void {
    if (this.closed) return () => undefined;
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publish(event: DigitalTwinEvent): void {
    if (this.closed) return;
    for (const l of this.listeners) l(event);
  }

  close(): void {
    this.closed = true;
    this.listeners.clear();
  }
}

export function createInMemoryStream(): RealtimeStream {
  return new InMemoryRealtimeStream();
}
