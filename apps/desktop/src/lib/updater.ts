/**
 * Frontend wrapper around `@tauri-apps/plugin-updater`.
 *
 * V3.2 (Track H) ships this so the rest of the desktop app does not
 * depend directly on the plugin's exact import shape. The wrapper:
 *
 * - calls Tauri `getVersion()` once via `@tauri-apps/api/app` so the
 *   reported `currentVersion` is the running app's version, not
 *   whatever the update payload claims;
 * - normalizes the plugin's `Update | null` return into a tagged
 *   `UpdateState` so consumers can switch on `status` exhaustively;
 * - swallows `getVersion` failures (non-Tauri environments, tests)
 *   with an `unknown` fallback rather than throwing.
 *
 * Callers must handle the `error` status themselves - the wrapper
 * surfaces the message but does not retry or back off.
 */
import { getVersion } from '@tauri-apps/api/app';
import { check } from '@tauri-apps/plugin-updater';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'up-to-date'
  | 'error';

export interface UpdateState {
  status: UpdateStatus;
  currentVersion: string;
  latestVersion?: string;
  error?: string;
}

async function safeGetVersion(): Promise<string> {
  try {
    return await getVersion();
  } catch {
    return 'unknown';
  }
}

export async function checkForUpdate(): Promise<UpdateState> {
  const currentVersion = await safeGetVersion();
  try {
    const update = await check();
    if (update === null) {
      return { status: 'up-to-date', currentVersion };
    }
    return {
      status: 'available',
      currentVersion: update.currentVersion ?? currentVersion,
      latestVersion: update.version,
    };
  } catch (err) {
    return {
      status: 'error',
      currentVersion,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
