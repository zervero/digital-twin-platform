/**
 * Apply a brand accent to `:root` and validate contrast for white labels.
 *
 * Semantic status colors stay fixed in tokens.css; only
 * `--dt-accent-primary` / `--dt-accent-primary-hover` are rewritten here.
 */

const WHITE = '#FFFFFF';
const AA_NORMAL_TEXT = 4.5;

function parseHex(hex: string): [number, number, number] {
  const raw = hex.trim().replace(/^#/, '');
  if (raw.length === 3) {
    const r = parseInt(raw[0]! + raw[0]!, 16);
    const g = parseInt(raw[1]! + raw[1]!, 16);
    const b = parseInt(raw[2]! + raw[2]!, 16);
    return [r, g, b];
  }
  if (raw.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return [r, g, b];
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

function channelLuminance(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance for an sRGB hex color. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

/** WCAG contrast ratio between two hex colors (order-independent). */
export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * V1: accent must provide ≥4.5:1 contrast against white primary-button labels.
 */
export function isAccentUsable(hex: string): boolean {
  try {
    return contrastRatio(hex, WHITE) >= AA_NORMAL_TEXT;
  } catch {
    return false;
  }
}

/** Lighten an sRGB hex toward white by `amount` (0–1). */
export function lightenHex(hex: string, amount = 0.18): string {
  const [r, g, b] = parseHex(hex);
  return toHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount,
  );
}

export interface ApplyAccentOptions {
  /** Explicit hover color; when omitted, a lightened primary is used. */
  hover?: string;
}

/**
 * Write accent CSS variables on `document.documentElement`.
 * Does not validate contrast — callers should use `isAccentUsable` first.
 */
export function applyAccent(primary: string, options: ApplyAccentOptions = {}): void {
  const hover = options.hover ?? lightenHex(primary);
  const root = document.documentElement;
  root.style.setProperty('--dt-accent-primary', primary);
  root.style.setProperty('--dt-accent-primary-hover', hover);
}
