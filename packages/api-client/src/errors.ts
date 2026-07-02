/**
 * Errors thrown by the API client.
 *
 * The client turns every non-2xx response into an `ApiClientError` with a
 * readable message, the original status code, and the parsed error body
 * when available. Callers can either `instanceof` check or just rely on
 * `message`.
 */

import type { ApiErrorPayload } from '@dt/contracts';

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly body: ApiErrorPayload | null;
  public readonly url: string;

  constructor(message: string, status: number, url: string, body: ApiErrorPayload | null) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.url = url;
    this.body = body;
  }
}
