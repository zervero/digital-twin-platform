import { describe, it, expect, beforeEach } from 'vitest';
import { applyAccent, contrastRatio, isAccentUsable } from '../apply-accent.js';

describe('applyAccent', () => {
  beforeEach(() => {
    document.documentElement.style.cssText = '';
  });

  it('writes --dt-accent-primary and hover on :root', () => {
    applyAccent('#2DD4BF');
    expect(
      document.documentElement.style.getPropertyValue('--dt-accent-primary').trim(),
    ).toBe('#2DD4BF');
    expect(
      document.documentElement.style.getPropertyValue('--dt-accent-primary-hover').trim(),
    ).not.toBe('');
  });

  it('accepts Element-like blues and rejects washes', () => {
    expect(isAccentUsable('#EEEEEE')).toBe(false);
    expect(isAccentUsable('#409EFF')).toBe(true);
    expect(isAccentUsable('#1D4ED8')).toBe(true);
    expect(contrastRatio('#409EFF', '#FFFFFF')).toBeGreaterThanOrEqual(2.5);
  });

  it('contrastRatio is symmetric', () => {
    expect(contrastRatio('#1D4ED8', '#FFFFFF')).toBe(
      contrastRatio('#FFFFFF', '#1D4ED8'),
    );
    expect(contrastRatio('#EEEEEE', '#FFFFFF')).toBeLessThan(2.5);
  });
});
