/**
 * Tests for @dt/tenant (V3.3 T2).
 *
 * The package exports one helper, `getTenantIdFromClaims`.
 * The five cases below are the ones called out in the V3.3
 * implementation plan: default claim, custom claim override,
 * missing claim, non-string value (number / boolean /
 * object), and empty string. The non-string case is split
 * into three sub-cases so a regression that breaks one
 * type but not the others is obvious from the failure name.
 */

import { describe, expect, it } from 'vitest';

import { getTenantIdFromClaims, TENANT_ID_CLAIM } from '../tenant.js';

describe('getTenantIdFromClaims', () => {
  it('returns the tenant ID from the default claim', () => {
    const claims = {
      sub: 'user-1',
      [TENANT_ID_CLAIM]: 'acme-corp',
    };
    expect(getTenantIdFromClaims(claims)).toBe('acme-corp');
  });

  it('returns the tenant ID when given a custom claim name', () => {
    const claims = {
      sub: 'user-1',
      'https://example.test/custom_tenant': 'globex-ind',
    };
    expect(
      getTenantIdFromClaims(claims, 'https://example.test/custom_tenant'),
    ).toBe('globex-ind');
  });

  it('returns null when the claim is missing', () => {
    const claims = { sub: 'user-1', email: 'u@example.test' };
    expect(getTenantIdFromClaims(claims)).toBeNull();
  });

  it('returns null when the claim is a number', () => {
    const claims = { [TENANT_ID_CLAIM]: 42 };
    expect(getTenantIdFromClaims(claims)).toBeNull();
  });

  it('returns null when the claim is a boolean', () => {
    const claims = { [TENANT_ID_CLAIM]: true };
    expect(getTenantIdFromClaims(claims)).toBeNull();
  });

  it('returns null when the claim is an object', () => {
    const claims = { [TENANT_ID_CLAIM]: { id: 'acme-corp' } };
    expect(getTenantIdFromClaims(claims)).toBeNull();
  });

  it('returns null when the claim is the empty string', () => {
    const claims = { [TENANT_ID_CLAIM]: '' };
    expect(getTenantIdFromClaims(claims)).toBeNull();
  });
});
