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

  it('rejects accents that fail AA against white label on primary button', () => {
    expect(isAccentUsable('#EEEEEE')).toBe(false);
    expect(isAccentUsable('#1D4ED8')).toBe(true);
  });

  it('contrastRatio is symmetric and ≥4.5 for usable accents vs white', () => {
    expect(contrastRatio('#1D4ED8', '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#1D4ED8', '#FFFFFF')).toBe(
      contrastRatio('#FFFFFF', '#1D4ED8'),
    );
    expect(contrastRatio('#EEEEEE', '#FFFFFF')).toBeLessThan(4.5);
  });
});
