/**
 * V3.4: HMAC-SHA256 plugin artifact signing.
 *
 * The signing secret is loaded from `PLUGIN_SIGNING_SECRET`
 * (32-byte random in dev; from a Kubernetes Secret /
 * Hashicorp Vault / etc. in production). The BFF refuses
 * to boot if the env var is missing or shorter than 32
 * bytes -- the marketplace path is unreachable without
 * a secret.
 *
 * The signature is a base64-encoded HMAC-SHA256 of the
 * artifact body, written to `signature.txt` next to the
 * artifact. Verification recomputes the HMAC and compares
 * with `crypto.timingSafeEqual` to avoid timing leaks.
 *
 * V3.4.x follow-ups: GPG / Sigstore / cosign for
 * third-party-verifiable provenance.
 *
 * The module keeps a process-wide cached buffer for the
 * secret (loaded once on first call). `resetSigningSecret`
 * exists for tests; production code does not call it.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

let SECRET: Buffer | null = null;

const MIN_SECRET_LENGTH = 32;

export function loadSigningSecret(): Buffer {
  if (SECRET) return SECRET;
  const raw = process.env.PLUGIN_SIGNING_SECRET;
  if (!raw || raw.length < MIN_SECRET_LENGTH) {
    throw new Error(
      'PLUGIN_SIGNING_SECRET must be set to a 32-byte (or longer) string',
    );
  }
  SECRET = Buffer.from(raw, 'utf8');
  return SECRET;
}

export function signArtifact(artifact: Buffer): string {
  const hmac = createHmac('sha256', loadSigningSecret());
  hmac.update(artifact);
  return hmac.digest('base64');
}

export function verifySignature(
  artifact: Buffer,
  signatureB64: string,
): boolean {
  const expected = Buffer.from(signArtifact(artifact), 'base64');
  const provided = Buffer.from(signatureB64, 'base64');
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

export function generateDevSigningSecret(): string {
  return randomBytes(32).toString('base64');
}

/** Test-only: drop the cached secret so the next call re-reads env. */
export function resetSigningSecret(): void {
  SECRET = null;
}
