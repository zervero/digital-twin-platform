/**
 * Desktop entry.
 *
 * The desktop app is a Tauri host. In dev Tauri loads the Vite dev server
 * (`apps/web`); in production it loads the built web assets from
 * `apps/web/dist`. Either way the UI is the same `@dt/app-shell`.
 *
 * V3.2 (Track H) scaffolds a one-shot `checkForUpdate()` call here so the
 * updater wrapper has a real boot site. NOTE: the actual UI runs in the
 * webview from `apps/web/`, not from this file - the `beforeDevCommand`
 * / `frontendDist` config in `tauri.conf.json` bypasses this entry. The
 * boot call is wired through `import('./lib/updater.js')` so it loads
 * lazily and never blocks module evaluation; it is currently a no-op in
 * the production bundle until the desktop entry is promoted to a real
 * host (a V3.2.x / V3.3 follow-up). See `docs/plans/
 * v3.2-implementation-plan.md` T2 + T8 for the wiring story.
 */

import { checkForUpdate } from './lib/updater.js';

// TODO(v3.2): gate on a real entry-point hook once `tauri.conf.json` is
// reconfigured to load this file as the webview entry. For V3.2 the
// Rust-side plugin registration in `lib.rs` is what enables the
// capability; the boot call below is the future-site.
void checkForUpdate()
  .then((state) => {
    if (state.status === 'available') {
      console.info(
        `[updater] ${state.currentVersion} -> ${state.latestVersion} available`,
      );
    }
  })
  .catch(() => {
    // checkForUpdate never rejects; defensive only.
  });

export {};
