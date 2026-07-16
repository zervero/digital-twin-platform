/**
 * The HTTP wrapper.
 *
 * Centralizes:
 *   - JSON parsing (including 204 / empty body)
 *   - Error normalization
 *   - Default headers (content-type, accept, Authorization when set)
 *
 * Tests inject a `fetchImpl` to assert wiring without touching the network.
 *
 * V2.1: holds the auth bearer token in a closure; `setAuthToken`
 * mutates it. The BFF treats a missing or expired token as
 * "anonymous".
 */

import type {
  ApiErrorPayload,
  CommandAcceptedResponse,
  Device,
  DigitalTwinCommand,
  ListAuditEventsResponse,
  ListUsersResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
  SceneSnapshot,
  SetUserRolesRequest,
  SetUserRolesResponse,
} from '@dt/contracts';

import { ApiClientError } from './errors.js';

export interface ApiClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export interface ListAuditEventsParams {
  page?: number;
  pageSize?: number;
  type?: string;
}

export interface ApiClient {
  getHealth(): Promise<{ ok: boolean }>;
  getDevices(): Promise<Device[]>;
  getScene(): Promise<SceneSnapshot>;
  sendCommand(command: DigitalTwinCommand): Promise<CommandAcceptedResponse>;
  getMe(): Promise<MeResponse>;
  login(req: LoginRequest): Promise<LoginResponse>;
  logout(): Promise<void>;
  setAuthToken(token: string | null): void;
  /**
   * Read the current bearer token. Used by the realtime
   * stream composable to tunnel the token through the
   * WebSocket subprotocol on (re)connect. Returns null when
   * the client is anonymous.
   */
  getAuthToken(): string | null;
  /** V4 T11: list users in the caller's tenant (admin). */
  listUsers(): Promise<ListUsersResponse>;
  /** V4 T11: replace a user's roles (admin). */
  setUserRoles(userId: string, req: SetUserRolesRequest): Promise<SetUserRolesResponse>;
  /** V4 T11: paginated audit events (admin). */
  listAuditEvents(params?: ListAuditEventsParams): Promise<ListAuditEventsResponse>;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
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

  // Token is held in a closure; setAuthToken mutates it.
  let token: string | null = null;

  async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const url = `${baseUrl}${path}`;
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'application/json',
    };
    if (token) headers.authorization = `Bearer ${token}`;
    const init: RequestInit = {
      method: opts.method ?? 'GET',
      headers,
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

    // Some endpoints (logout) return 204 with no body.
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  return {
    getHealth: () => request<{ ok: boolean }>('/health'),
    getDevices: () => request<Device[]>('/api/devices'),
    getScene: () => request<SceneSnapshot>('/api/scene'),
    sendCommand: (command) =>
      request<CommandAcceptedResponse>('/api/commands', { method: 'POST', body: command }),
    getMe: () => request<MeResponse>('/api/auth/me'),
    login: async (req) => {
      const res = await request<LoginResponse>('/api/auth/login', { method: 'POST', body: req });
      token = res.session.token;
      return res;
    },
    logout: async () => {
      await request<null>('/api/auth/logout', { method: 'POST' });
      token = null;
    },
    setAuthToken: (next: string | null) => {
      token = next;
    },
    getAuthToken: () => token,
    listUsers: () => request<ListUsersResponse>('/api/admin/users'),
    setUserRoles: (userId, body) =>
      request<SetUserRolesResponse>(`/api/admin/users/${encodeURIComponent(userId)}/roles`, {
        method: 'PATCH',
        body,
      }),
    listAuditEvents: (params = {}) => {
      const qs = new URLSearchParams();
      if (params.page !== undefined) qs.set('page', String(params.page));
      if (params.pageSize !== undefined) qs.set('pageSize', String(params.pageSize));
      if (params.type) qs.set('type', params.type);
      const query = qs.toString();
      return request<ListAuditEventsResponse>(
        `/api/admin/audit${query ? `?${query}` : ''}`,
      );
    },
  };
}
