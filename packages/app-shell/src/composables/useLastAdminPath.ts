/**
 * Remembers the last `/admin/*` route so the TopToolbar mode
 * switch can restore it when leaving ops. Persisted in
 * sessionStorage so a tab reload keeps the preference.
 */

const STORAGE_KEY = 'dt:shell:last-admin-path';
const DEFAULT_ADMIN_PATH = '/admin/marketplace';

export function useLastAdminPath() {
  function get(): string {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored && stored.startsWith('/admin')) return stored;
    return DEFAULT_ADMIN_PATH;
  }

  function remember(path: string): void {
    if (!path.startsWith('/admin')) return;
    // Skip the bare `/admin` redirect target; store a concrete child.
    if (path === '/admin' || path === '/admin/') return;
    sessionStorage.setItem(STORAGE_KEY, path);
  }

  return { get, remember, DEFAULT_ADMIN_PATH };
}
