/**
 * API envelope and response types.
 *
 * The BFF returns plain JSON. Errors come back as non-2xx responses with an
 * `ApiErrorPayload` body. The API client turns that into a thrown
 * `ApiClientError`.
 */

export interface ApiHealth {
  ok: boolean;
  service: string;
  version: string;
}

export interface ApiErrorPayload {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface CommandAcceptedResponse {
  accepted: true;
  commandId: string;
}
