/**
 * Tauri entry point.
 *
 * V1 is intentionally minimal: we just run the Tauri builder with no extra
 * commands. The web app is loaded via `tauri.conf.json` (`devUrl` in dev,
 * `frontendDist` in production), so all business logic stays in Vue/TS.
 *
 * V3.2 (Track H) registers the updater plugin so any frontend code with
 * the `updater:default` capability can call `@tauri-apps/plugin-updater`'s
 * `check()` and `install()`. The plugin's Rust-side registration does not
 * require the `UpdaterExt` trait - we only need the plugin to be on the
 * builder, and the JS side drives the flow. See `docs/plans/
 * v3.2-implementation-plan.md` T2 for context.
 */

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
