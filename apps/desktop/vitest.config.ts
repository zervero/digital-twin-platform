import { defineConfig } from 'vitest/config';

/**
 * Vitest config for `@dt/desktop`.
 *
 * Plain Node environment - the updater wrapper is purely module-level
 * (no DOM, no Vue). Both `@tauri-apps/plugin-updater` and
 * `@tauri-apps/api/app` are mocked in the test, so no Tauri context
 * is needed at test time.
 *
 * The `include` pattern matches app-shell's convention so future
 * tests land without config churn.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
});
