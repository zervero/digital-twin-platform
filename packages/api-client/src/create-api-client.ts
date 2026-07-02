/**
 * The HTTP wrapper.
 *
 * Centralizes:
 *   - JSON parsing
 *   - Error normalization
 *   - Default headers
 *
 * Tests inject a `fetchImpl` to assert wiring without touching the network.
 */

import type {
  ApiErrorPayload,
  CommandAcceptedResponse,
  Device,
  DigitalTwinCommand,
  SceneSnapshot,
} from '@dt/contracts';

import { ApiClientError } from './errors.js';

export interface ApiClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export interface ApiClient {
  getHealth(): Promise<{ ok: boolean }>;
  getDevices(): Promise<Device[]>;
  getScene(): Promise<SceneSnapshot>;
  sendCommand(command: DigitalTwinCommand): Promise<CommandAcceptedResponse>;
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
}

function normalizeBaseUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.error === 'string' && typeof v.message === 'string';
}

async function parseErrorBody(response: Response): Promise<ApiErrorPayload | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return isApiErrorPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function describeStatus(status: number, body: ApiErrorPayload | null, url: string): string {
  if (body) return `${body.error}: ${body.message} (${status} ${url})`;
  return `Request failed with status ${status} (${url})`;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetchImpl: typeof fetch = options.fetchImpl ?? globalThis.fetch.bind(globalThis);

  async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const url = `${baseUrl}${path}`;
    const init: RequestInit = {
      method: opts.method ?? 'GET',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
    };
    if (opts.body !== undefined) {
      init.body = JSON.stringify(opts.body);
    }

    const response = await fetchImpl(url, init);
    if (!response.ok) {
      const body = await parseErrorBody(response);
      throw new ApiClientError(
        describeStatus(response.status, body, url),
        response.status,
        url,
        body,
      );
    }

    return (await response.json()) as T;
  }

  return {
    getHealth: () => request<{ ok: boolean }>('/health'),
    getDevices: () => request<Device[]>('/api/devices'),
    getScene: () => request<SceneSnapshot>('/api/scene'),
    sendCommand: (command) =>
      request<CommandAcceptedResponse>('/api/commands', { method: 'POST', body: command }),
  };
}
