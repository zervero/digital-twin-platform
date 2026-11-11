import { describe, expect, it } from 'vitest';

import { elementLocaleOf } from '../element-locale.js';

describe('elementLocaleOf', () => {
  it('maps zh-CN to Element zh-cn pack', () => {
    const locale = elementLocaleOf('zh-CN');
    expect(locale.name).toMatch(/zh/i);
  });

  it('maps en to Element English pack', () => {
    const locale = elementLocaleOf('en');
    expect(locale.name).toMatch(/en/i);
  });
});
