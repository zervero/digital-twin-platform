/**
 * @dt/realtime
 *
 * V2 boundary. In V1 we only defined the shape of the realtime stream and a
 * small in-memory implementation useful for dev and tests. V2 adds a real
 * WebSocket stream with exponential reconnect backoff.
 *
 * Consumers should pick one of:
 * - `createInMemoryStream()` for tests and local-only flows
 * - `createWebSocketStream({ url })` for real deployments
 */

import { withTimestamp, type DigitalTwinEvent } from '@dt/contracts';

export interface RealtimeStream {
  subscribe(listener: (event: DigitalTwinEvent) => void): () => void;
  publish(event: DigitalTwinEvent): void;
  close(): void;
}

export interface DeviceUpdateSource {
  onDeviceUpdate(listener: (device: import('@dt/contracts').Device) => void): () => void;
  start(): void;
  stop(): void;
}

export interface ReconnectOptions {
  enabled?: boolean;
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: Event) => void) | null;
  onclose: ((ev: CloseEvent) => void) | null;
  onmessage: ((ev: MessageEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
}

function getWebSocketImpl(): { new (url: string): WebSocketLike } {
  return (globalThis as unknown as { WebSocket: { new (url: string): WebSocketLike } }).WebSocket;
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

export class WebSocketRealtimeStream implements RealtimeStream {
  private readonly listeners = new Set<(event: DigitalTwinEvent) => void>();
  private ws: WebSocketLike | null = null;
  private closed = false;
  private attempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly opts: Required<ReconnectOptions>;

  constructor(private readonly url: string, options: ReconnectOptions = {}) {
    this.opts = {
      enabled: options.enabled ?? true,
      maxAttempts: options.maxAttempts ?? 10,
      baseDelayMs: options.baseDelayMs ?? 100,
      maxDelayMs: options.maxDelayMs ?? 30_000,
    };
    this.connect();
  }

  subscribe(listener: (event: DigitalTwinEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publish(event: DigitalTwinEvent): void {
    if (!this.ws || this.ws.readyState !== 1) return;
    this.ws.send(JSON.stringify(event));
  }

  close(): void {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.ws?.close();
    this.ws = null;
    this.listeners.clear();
  }

  private connect(): void {
    if (this.closed) return;
    const WS = getWebSocketImpl();
    const ws = new WS(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.attempts = 0;
    };
    ws.onmessage = (ev) => {
      let event: DigitalTwinEvent;
      try {
        event = JSON.parse((ev as MessageEvent).data as string) as DigitalTwinEvent;
      } catch {
        return;
      }
      if (event.type === 'ping') {
        const reply = withTimestamp({ type: 'pong', payload: event.payload });
        ws.send(JSON.stringify(reply));
        return;
      }
      for (const l of this.listeners) l(event);
    };
    ws.onclose = () => {
      if (this.closed || !this.opts.enabled) return;
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    this.attempts += 1;
    if (this.attempts > this.opts.maxAttempts) {
      this.closed = true;
      return;
    }
    const delay = Math.min(this.opts.baseDelayMs * 2 ** (this.attempts - 1), this.opts.maxDelayMs);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}

export function createWebSocketStream(options: {
  url: string;
  reconnect?: ReconnectOptions;
}): RealtimeStream {
  return new WebSocketRealtimeStream(options.url, options.reconnect);
}
