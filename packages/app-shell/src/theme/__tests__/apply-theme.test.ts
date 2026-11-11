import { afterEach, describe, expect, it } from 'vitest';

import {
  applyResolvedTheme,
  isColorMode,
  resolveColorMode,
} from '../apply-theme.js';

describe('apply-theme', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
    document.documentElement.style.colorScheme = '';
  });

  it('validates color mode values', () => {
    expect(isColorMode('light')).toBe(true);
    expect(isColorMode('dark')).toBe(true);
    expect(isColorMode('system')).toBe(true);
    expect(isColorMode('auto')).toBe(false);
  });

  it('resolves system against prefers-dark', () => {
    expect(resolveColorMode('light')).toBe('light');
    expect(resolveColorMode('dark')).toBe('dark');
    expect(resolveColorMode('system', true)).toBe('dark');
    expect(resolveColorMode('system', false)).toBe('light');
  });

  it('writes data-theme and color-scheme on the document element', () => {
    applyResolvedTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');

    applyResolvedTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });
});
