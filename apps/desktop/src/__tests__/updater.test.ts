/**
 * Unit tests for `src/lib/updater.ts`.
 *
 * Mocks both `@tauri-apps/plugin-updater` (the Tauri-side IPC bridge)
 * and `@tauri-apps/api/app` (the version getter) so the wrapper can
 * be exercised in a plain Node test environment without a Tauri
 * webview. Each test asserts one branch of the `UpdateState` union.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/app', () => ({
  getVersion: vi.fn(async () => '1.0.0'),
}));

vi.mock('@tauri-apps/plugin-updater', () => ({
  check: vi.fn(),
}));

import { check } from '@tauri-apps/plugin-updater';

import { checkForUpdate } from '../lib/updater.js';

describe('checkForUpdate', () => {
  it('surfaces status=available when the plugin returns an update', async () => {
    vi.mocked(check).mockResolvedValueOnce({
      available: true,
      currentVersion: '1.0.0',
      version: '1.1.0',
      downloadAndInstall: vi.fn(),
      notes: '',
    } as never);

    const state = await checkForUpdate();

    expect(state).toEqual({
      status: 'available',
      currentVersion: '1.0.0',
      latestVersion: '1.1.0',
    });
  });

  it('surfaces status=up-to-date when the plugin returns null', async () => {
    vi.mocked(check).mockResolvedValueOnce(null);

    const state = await checkForUpdate();

    expect(state).toEqual({
      status: 'up-to-date',
      currentVersion: '1.0.0',
    });
  });

  it('surfaces status=error with the thrown message when check() rejects', async () => {
    vi.mocked(check).mockRejectedValueOnce(new Error('network down'));

    const state = await checkForUpdate();

    expect(state.status).toBe('error');
    expect(state.currentVersion).toBe('1.0.0');
    expect(state.error).toBe('network down');
  });

  it('coerces non-Error throws into a string error field', async () => {
    vi.mocked(check).mockRejectedValueOnce('plain string failure');

    const state = await checkForUpdate();

    expect(state.status).toBe('error');
    expect(state.error).toBe('plain string failure');
  });

  it('falls back to currentVersion=unknown when getVersion itself fails', async () => {
    const { getVersion } = await import('@tauri-apps/api/app');
    vi.mocked(getVersion).mockRejectedValueOnce(new Error('not in tauri'));
    vi.mocked(check).mockResolvedValueOnce(null);

    const state = await checkForUpdate();

    expect(state.status).toBe('up-to-date');
    expect(state.currentVersion).toBe('unknown');
  });
});
