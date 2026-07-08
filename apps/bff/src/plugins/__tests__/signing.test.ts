/**
 * HMAC signing + dev-secret tests -- V3.4 T5.
 *
 * Every test that touches `process.env.PLUGIN_SIGNING_SECRET`
 * saves the prior value, sets a controlled one, and
 * restores it in afterEach so the rest of the suite (and
 * the dev bootstrap path) see a stable env.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  generateDevSigningSecret,
  loadSigningSecret,
  resetSigningSecret,
  signArtifact,
  verifySignature,
} from '../signing.js';

const ENV_KEY = 'PLUGIN_SIGNING_SECRET';
const TEST_SECRET = 'a'.repeat(32);

describe('plugin signing (V3.4 T5)', () => {
  let prior: string | undefined;

  beforeEach(() => {
    prior = process.env[ENV_KEY];
    process.env[ENV_KEY] = TEST_SECRET;
    resetSigningSecret();
  });

  afterEach(() => {
    if (prior === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = prior;
    }
    resetSigningSecret();
  });

  describe('signArtifact', () => {
    it('returns a base64 string of length 44 for SHA-256', () => {
      const sig = signArtifact(Buffer.from('hello'));
      expect(typeof sig).toBe('string');
      // base64 of a 32-byte SHA-256 is 44 chars (with padding).
      expect(sig).toHaveLength(44);
    });

    it('produces a deterministic signature for the same secret + input', () => {
      const a = signArtifact(Buffer.from('payload'));
      const b = signArtifact(Buffer.from('payload'));
      expect(a).toBe(b);
    });

    it('produces different signatures for different payloads', () => {
      const a = signArtifact(Buffer.from('one'));
      const b = signArtifact(Buffer.from('two'));
      expect(a).not.toBe(b);
    });
  });

  describe('verifySignature', () => {
    it('returns true for the signature produced by signArtifact', () => {
      const artifact = Buffer.from('hello-plugin-payload');
      const sig = signArtifact(artifact);
      expect(verifySignature(artifact, sig)).toBe(true);
    });

    it('returns false for a tampered signature', () => {
      const artifact = Buffer.from('hello-plugin-payload');
      expect(verifySignature(artifact, 'tampered')).toBe(false);
    });

    it('returns false for a valid-shape but wrong signature', () => {
      const artifact = Buffer.from('hello-plugin-payload');
      // base64 of a 32-byte buffer of zeros, but the HMAC
      // of `artifact` under our test secret is different.
      const wrong = Buffer.alloc(32, 0).toString('base64');
      expect(verifySignature(artifact, wrong)).toBe(false);
    });

    it('returns false (does not throw) for a malformed signature', () => {
      const artifact = Buffer.from('hello-plugin-payload');
      // Not even valid base64 of the right length.
      expect(verifySignature(artifact, 'not-base64!!!')).toBe(false);
    });

    it('returns false for a signature of a different length than the HMAC output', () => {
      const artifact = Buffer.from('hello-plugin-payload');
      // 16-byte base64 (~24 chars) cannot match a 32-byte HMAC.
      const short = Buffer.alloc(16, 1).toString('base64');
      expect(verifySignature(artifact, short)).toBe(false);
    });
  });

  describe('loadSigningSecret', () => {
    it('throws when the env var is missing', () => {
      delete process.env[ENV_KEY];
      resetSigningSecret();
      expect(() => loadSigningSecret()).toThrow(/PLUGIN_SIGNING_SECRET/);
    });

    it('throws when the env var is shorter than 32 bytes', () => {
      process.env[ENV_KEY] = 'short';
      resetSigningSecret();
      expect(() => loadSigningSecret()).toThrow(/32-byte/);
    });

    it('returns a Buffer of the env var bytes when valid', () => {
      process.env[ENV_KEY] = TEST_SECRET;
      resetSigningSecret();
      const buf = loadSigningSecret();
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.toString('utf8')).toBe(TEST_SECRET);
    });

    it('caches the secret across calls (no re-read of process.env)', () => {
      const first = loadSigningSecret();
      process.env[ENV_KEY] = 'b'.repeat(32);
      const second = loadSigningSecret();
      expect(first).toBe(second);
    });
  });

  describe('generateDevSigningSecret', () => {
    it('returns a 32-byte base64 string', () => {
      const secret = generateDevSigningSecret();
      const buf = Buffer.from(secret, 'base64');
      expect(buf).toHaveLength(32);
    });

    it('produces a different value on every call', () => {
      const a = generateDevSigningSecret();
      const b = generateDevSigningSecret();
      expect(a).not.toBe(b);
    });
  });
});
