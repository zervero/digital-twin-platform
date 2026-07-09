import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWebSocketStream } from '../index.js';
import { withTimestamp } from '@dt/contracts';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;
  static CLOSED = 3;

  readyState = 0; // CONNECTING
  url: string;
  sent: string[] = [];
  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;

  protocols: string | string[] | undefined;
  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
    MockWebSocket.instances.push(this);
  }
  send(data: string): void {
    this.sent.push(data);
  }
  close(code = 1000, reason = ''): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ type: 'close', code, reason } as unknown as CloseEvent);
  }
  // Test helpers
  triggerOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }
  triggerMessage(data: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }
}

let originalWebSocket: typeof WebSocket;

beforeEach(() => {
  MockWebSocket.instances = [];
  originalWebSocket = globalThis.WebSocket;
  (globalThis as { WebSocket: unknown }).WebSocket = MockWebSocket;
  vi.useFakeTimers();
});
afterEach(() => {
  (globalThis as { WebSocket: typeof WebSocket }).WebSocket = originalWebSocket;
  vi.useRealTimers();
});

describe('createWebSocketStream', () => {
  it('connects to the configured url', () => {
    createWebSocketStream({ url: 'ws://localhost:3001/api/stream' });
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0]!.url).toBe('ws://localhost:3001/api/stream');
  });

  it('delivers parsed events to subscribers', () => {
    const stream = createWebSocketStream({ url: 'ws://x' });
    const ws = MockWebSocket.instances[0]!;
    ws.triggerOpen();
    const received: unknown[] = [];
    stream.subscribe((e) => received.push(e));
    const evt = withTimestamp({
      tenantId: 'fixture-tenant',
      type: 'device:updated',
      payload: { id: 'd1', tenantId: 'fixture-tenant', name: 'n', status: 'online', sceneNodeId: 's', updatedAt: '2026-01-01T00:00:00.000Z' },
    });
    ws.triggerMessage(evt);
    expect(received).toEqual([evt]);
  });

  it('auto-replies to ping with matching pong', () => {
    const stream = createWebSocketStream({ url: 'ws://x' });
    const ws = MockWebSocket.instances[0]!;
    ws.triggerOpen();
    ws.triggerMessage(withTimestamp({ tenantId: 'fixture-tenant', type: 'ping', payload: { nonce: 'n1' } }));
    expect(ws.sent).toHaveLength(1);
    const reply = JSON.parse(ws.sent[0]!);
    expect(reply.type).toBe('pong');
    expect(reply.payload.nonce).toBe('n1');
    stream.close();
  });

  it('reconnects with exponential backoff after a close', () => {
    const stream = createWebSocketStream({
      url: 'ws://x',
      reconnect: { baseDelayMs: 100, maxDelayMs: 1000, maxAttempts: 3 },
    });
    const ws1 = MockWebSocket.instances[0]!;
    ws1.triggerOpen();
    ws1.close();
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    vi.advanceTimersByTime(100);
    expect(MockWebSocket.instances).toHaveLength(2);
    stream.close();
  });
});

describe('subprotocol token tunneling (V3.5 Track K T8.2)', () => {
  it('opens a plain connection when getToken returns null', () => {
    createWebSocketStream({
      url: 'ws://localhost:3001/api/stream',
      getToken: () => null,
    });
    expect(MockWebSocket.instances[0]!.protocols).toBeUndefined();
  });

  it('tunnels a bearer token through the subprotocols list when present', () => {
    createWebSocketStream({
      url: 'ws://localhost:3001/api/stream',
      getToken: () => 'mock-uuid-1234',
    });
    const ws = MockWebSocket.instances[0]!;
    expect(ws.protocols).toEqual(['bearer', 'mock-uuid-1234']);
  });

  it('re-reads the token on every reconnect via the getter', async () => {
    let token: string | null = 'mock-token-1';
    const stream = createWebSocketStream({
      url: 'ws://x',
      getToken: () => token,
      reconnect: { baseDelayMs: 50, maxDelayMs: 50, maxAttempts: 5 },
    });
    const ws1 = MockWebSocket.instances[0]!;
    expect(ws1.protocols).toEqual(['bearer', 'mock-token-1']);
    ws1.triggerOpen();
    // Rotate the token and force a reconnect.
    token = 'mock-token-2';
    stream.reconnect?.();
    const ws2 = MockWebSocket.instances[1]!;
    expect(ws2.protocols).toEqual(['bearer', 'mock-token-2']);
    stream.close();
  });

  it('reconnect() closes the current socket and opens a new one', () => {
    const stream = createWebSocketStream({
      url: 'ws://x',
      getToken: () => 'tok',
    });
    const ws1 = MockWebSocket.instances[0]!;
    ws1.triggerOpen();
    expect(MockWebSocket.instances).toHaveLength(1);
    stream.reconnect?.();
    expect(MockWebSocket.instances).toHaveLength(2);
    expect(ws1.onclose).toBeNull();
    stream.close();
  });

  it('reconnect() is a no-op when the stream is already closed', () => {
    const stream = createWebSocketStream({
      url: 'ws://x',
      getToken: () => 'tok',
    });
    const ws1 = MockWebSocket.instances[0]!;
    ws1.triggerOpen();
    stream.close();
    stream.reconnect?.();
    // Only the original instance; no second connection opened.
    expect(MockWebSocket.instances).toHaveLength(1);
  });
});
