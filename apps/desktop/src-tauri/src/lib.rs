/**
 * Tauri entry point.
 *
 * V1 is intentionally minimal: we just run the Tauri builder with no extra
 * commands. The web app is loaded via `tauri.conf.json` (`devUrl` in dev,
 * `frontendDist` in production), so all business logic stays in Vue/TS.
 */

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
