/**
 * Named brand-accent presets for the appearance preference store.
 *
 * Primary colors are chosen to meet WCAG AA (≥4.5:1) against white
 * button labels. Hover is a lightened companion for each primary.
 */

export interface AccentPreset {
  id: string;
  label: string;
  primary: string;
  hover: string;
}

export const ACCENT_PRESETS: readonly AccentPreset[] = [
  { id: 'blue', label: 'Blue', primary: '#1D4ED8', hover: '#3B82F6' },
  { id: 'teal', label: 'Teal', primary: '#0F766E', hover: '#14B8A6' },
  { id: 'indigo', label: 'Indigo', primary: '#4338CA', hover: '#6366F1' },
  { id: 'amber', label: 'Amber', primary: '#B45309', hover: '#D97706' },
  { id: 'rose', label: 'Rose', primary: '#BE123C', hover: '#E11D48' },
  { id: 'violet', label: 'Violet', primary: '#6D28D9', hover: '#8B5CF6' },
] as const;

export const DEFAULT_ACCENT_ID = 'blue';

export function findAccentPreset(id: string): AccentPreset | undefined {
  return ACCENT_PRESETS.find((p) => p.id === id);
}
