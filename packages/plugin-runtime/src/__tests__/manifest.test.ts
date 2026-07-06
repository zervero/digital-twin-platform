import { describe, expect, it } from 'vitest';

import {
  validatePluginManifest,
} from '../manifest.js';

describe('validatePluginManifest', () => {
  it('accepts a well-formed manifest', () => {
    const input = {
      id: 'hello-plugin',
      name: 'Hello Plugin',
      version: '1.2.3',
      vendor: 'Acme',
      description: 'Says hello',
      permissions: ['device:read', 'auth:login'],
    };
    const r = validatePluginManifest(input);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.manifest.id).toBe('hello-plugin');
      expect(r.manifest.permissions).toEqual([
        'device:read',
        'auth:login',
      ]);
    }
  });

  it('rejects an id that does not match /^[a-z][a-z0-9-]*$/', () => {
    const input = {
      id: 'HelloPlugin',
      name: 'X',
      version: '1.0.0',
      vendor: 'X',
      permissions: [],
    };
    const r = validatePluginManifest(input);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors[0]!.code).toBe('INVALID_ID');
      expect(r.errors[0]!.field).toBe('id');
    }
  });

  it('rejects a non-semver version', () => {
    const input = {
      id: 'good-id',
      name: 'X',
      version: '1.0',
      vendor: 'X',
      permissions: [],
    };
    const r = validatePluginManifest(input);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors[0]!.code).toBe('INVALID_VERSION');
      expect(r.errors[0]!.field).toBe('version');
    }
  });

  it('rejects unknown permissions against the contract union', () => {
    const input = {
      id: 'good-id',
      name: 'X',
      version: '1.0.0',
      vendor: 'X',
      permissions: ['device:read', 'definitely:not-a-permission'],
    };
    const r = validatePluginManifest(input);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors[0]!.code).toBe('UNKNOWN_PERMISSION');
      expect(r.errors[0]!.field).toBe('permissions[1]');
    }
  });

  it('rejects a missing required field', () => {
    const input = {
      id: 'good-id',
      name: 'X',
      // version missing
      vendor: 'X',
      permissions: [],
    };
    const r = validatePluginManifest(input);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.field === 'version')).toBe(true);
    }
  });
});
