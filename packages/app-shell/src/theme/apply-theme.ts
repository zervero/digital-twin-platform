/**
 * Apply resolved color mode to `document.documentElement` (SPEC 0002).
 * Preference (`light` | `dark` | `system`) is stored separately; this
 * helper only writes the resolved `light` | `dark` onto the DOM.
 */

export type ColorMode = 'light' | 'dark' | 'system';
export type ResolvedColorMode = 'light' | 'dark';

export const DEFAULT_COLOR_MODE: ColorMode = 'dark';

export function isColorMode(value: unknown): value is ColorMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

/** Resolve `system` against the current OS preference (defaults dark). */
export function resolveColorMode(
  mode: ColorMode,
  prefersDark: boolean = true,
): ResolvedColorMode {
  if (mode === 'light' || mode === 'dark') return mode;
  return prefersDark ? 'dark' : 'light';
}

export function readPrefersDark(
  media: Pick<MediaQueryList, 'matches'> | null = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null,
): boolean {
  return media?.matches ?? true;
}

/**
 * Sets `data-theme` / `color-scheme` on the document element.
 * Also toggles Element Plus's `html.dark` class so any EP rules that
 * key off `.dark` stay aligned (vars themselves come from our bridge).
 */
export function applyResolvedTheme(resolved: ResolvedColorMode): void {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  root.classList.toggle('dark', resolved === 'dark');
}
