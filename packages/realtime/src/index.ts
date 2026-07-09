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
 *
 * The WebSocket-facing types below are deliberately *structural* (no
 * dependency on DOM `Event` / `CloseEvent` / `MessageEvent`) so this
 * package can be consumed by Node-only tsconfigs (e.g. the BFF) where
 * the DOM lib is not loaded.
 */

import { withTimestamp, type Device, type DigitalTwinEvent } from '@dt/contracts';

export interface RealtimeStream {
  subscribe(listener: (event: DigitalTwinEvent) => void): () => void;
  publish(event: DigitalTwinEvent): void;
  close(): void;
  /**
   * Force a reconnect. Optional -- only WebSocket-backed
   * streams implement it; in-memory streams are a no-op
   * (no transport to reopen).
   */
  reconnect?(): void;
}

export interface DeviceUpdateSource {
  onDeviceUpdate(listener: (device: Device) => void): () => void;
  start(): void;
  stop(): void;
}

export interface ReconnectOptions {
  enabled?: boolean;
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

/**
 * Structural shape of a WebSocket close event. Matches what the browser
 * `CloseEvent` and `ws`'s server-side close emit (the two we care about).
 */
interface WebSocketLikeCloseEvent {
  code: number;
  reason: string;
}

/**
 * Structural shape of a WebSocket message event. We only ever read
 * `.data` as a JSON string, but the type stays open for binary frames.
 */
interface WebSocketLikeMessageEvent {
  data: string | ArrayBuffer | Blob | ArrayBufferLike;
}

/**
 * Minimal `WebSocketLike` interface. The browser `WebSocket`, the `ws`
 * package's `WebSocket`, and our test `MockWebSocket` all satisfy this.
 */
interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: WebSocketLikeMessageEvent | WebSocketLikeCloseEvent | unknown) => void) | null;
  onclose: ((ev: WebSocketLikeCloseEvent) => void) | null;
  onmessage: ((ev: WebSocketLikeMessageEvent) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

function getWebSocketImpl(): {
  new (url: string, protocols?: string | string[]): WebSocketLike;
} {
  return (globalThis as unknown as {
    WebSocket: {
      new (url: string, protocols?: string | string[]): WebSocketLike;
    };
  }).WebSocket;
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

  private readonly getToken: (() => string | null) | undefined;

  constructor(
    private readonly url: string,
    options: CreateWebSocketStreamOptions = {} as CreateWebSocketStreamOptions,
  ) {
    this.opts = {
      enabled: options.reconnect?.enabled ?? true,
      maxAttempts: options.reconnect?.maxAttempts ?? 10,
      baseDelayMs: options.reconnect?.baseDelayMs ?? 100,
      maxDelayMs: options.reconnect?.maxDelayMs ?? 30_000,
    };
    this.getToken = options.getToken;
    this.connect();
  }

  /**
   * Force a reconnect with the latest token.
   *
   * The caller is responsible for knowing the token has
   * changed; this method closes the current socket (without
   * going through the reconnect-backoff path) and immediately
   * opens a new one. Used by the app shell's useDeviceStream
   * composable to re-attach after login (when the user goes
   * from anonymous to authenticated and the existing
   * connection would otherwise 401 on the upgrade).
   */
  reconnect(): void {
    if (this.closed) return;
    if (this.ws) {
      // Suppress our own reconnect logic -- we're driving it.
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.attempts = 0;
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
    const token = this.getToken?.() ?? null;
    // WebSocket protocol forbids custom headers from the
    // client, so we tunnel the bearer token through the
    // subprotocols list. The BFF reads it via the
    // subprotocolAuth middleware. When no token is set we
    // open a plain connection (the BFF will reject the
    // upgrade with 401; the caller can then reconnect()
    // after login).
    const ws = token ? new WS(this.url, ['bearer', token]) : new WS(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.attempts = 0;
    };
    ws.onmessage = (ev) => {
      let event: DigitalTwinEvent;
      try {
        event = JSON.parse(String(ev.data)) as DigitalTwinEvent;
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

export interface CreateWebSocketStreamOptions {
  url: string;
  /**
   * Token getter, called every time the stream (re)connects.
   * The token is sent to the BFF via the WebSocket subprotocol
   * header (Sec-WebSocket-Protocol: bearer, <token>) because the
   * browser WebSocket API forbids setting arbitrary request
   * headers. The BFF's subprotocolAuth middleware reads it back
   * and tunnels it into the Authorization header so
   * requiresTenantScope works on the upgrade path.
   *
   * Return null to skip the subprotocol (anonymous connect;
   * the BFF will reject the upgrade with 401).
   */
  getToken?: () => string | null;
  reconnect?: ReconnectOptions;
}

export function createWebSocketStream(
  options: CreateWebSocketStreamOptions,
): RealtimeStream {
  return new WebSocketRealtimeStream(options.url, options);
}
