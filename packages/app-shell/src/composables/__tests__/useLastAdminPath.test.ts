import { beforeEach, describe, expect, it } from 'vitest';

import { useLastAdminPath } from '../useLastAdminPath.js';

beforeEach(() => {
  sessionStorage.clear();
});

describe('useLastAdminPath', () => {
  it('defaults to /admin/marketplace', () => {
    const { get, DEFAULT_ADMIN_PATH } = useLastAdminPath();
    expect(get()).toBe('/admin/marketplace');
    expect(DEFAULT_ADMIN_PATH).toBe('/admin/marketplace');
  });

  it('remembers concrete admin paths', () => {
    const { get, remember } = useLastAdminPath();
    remember('/admin/users');
    expect(get()).toBe('/admin/users');
  });

  it('ignores non-admin and bare /admin paths', () => {
    const { get, remember } = useLastAdminPath();
    remember('/ops');
    remember('/admin');
    remember('/admin/');
    expect(get()).toBe('/admin/marketplace');
  });
});
