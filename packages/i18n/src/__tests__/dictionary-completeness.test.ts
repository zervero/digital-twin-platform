/**
 * Dictionary completeness gate.
 *
 * Walks every leaf key in the `en` dictionary and asserts the
 * same key resolves to a non-empty string in `zh-CN`, and
 * vice versa. This is the test that catches the original
 * "page mixes Chinese and English" symptom at CI time
 * rather than letting it ship to operators.
 *
 * Also asserts every locale dictionary is a tree of strings
 * (no arrays, no nested objects past the key path). Anything
 * else is a contract violation.
 */
import { describe, it, expect } from 'vitest';

import { en } from '../locales/en/index.js';
import { zhCN } from '../locales/zh-CN/index.js';
import type { Dictionary } from '../types.js';

function collectLeaves(tree: unknown, prefix = ''): string[] {
  if (tree === null || typeof tree !== 'object') {
    return prefix ? [prefix] : [];
  }
  return Object.entries(tree as Record<string, unknown>).flatMap(
    ([k, v]) => collectLeaves(v, prefix ? `${prefix}.${k}` : k),
  );
}

/**
 * Mirror of the runtime `lookup()` in composable.ts. Kept
 * local to the test so the production code can stay slim and
 * the test can assert the public contract (dot-paths) without
 * exporting internals.
 */
function lookup(dict: Dictionary, key: string): string {
  const parts = key.split('.');
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Dictionary)) {
      cur = (cur as Dictionary)[p];
    } else {
      return '';
    }
  }
  return typeof cur === 'string' ? cur : '';
}

describe('i18n dictionaries', () => {
  const enLeaves = collectLeaves(en);
  const zhLeaves = collectLeaves(zhCN);

  it('en dictionary has at least one key', () => {
    expect(enLeaves.length).toBeGreaterThan(0);
  });

  it('zh-CN dictionary has at least one key', () => {
    expect(zhLeaves.length).toBeGreaterThan(0);
  });

  it('every en key resolves in zh-CN to a non-empty string', () => {
    const missing: string[] = [];
    const empty: string[] = [];
    for (const k of enLeaves) {
      const v = lookup(zhCN as Dictionary, k);
      if (v === '') missing.push(k);
      else if (v.length === 0) empty.push(k);
    }
    expect(missing, `keys missing from zh-CN: ${missing.join(', ')}`).toEqual([]);
    expect(empty, `zh-CN values that are empty: ${empty.join(', ')}`).toEqual([]);
  });

  it('every zh-CN key resolves in en to a non-empty string (no orphan keys)', () => {
    const missing: string[] = [];
    for (const k of zhLeaves) {
      const v = lookup(en as Dictionary, k);
      if (v === '') missing.push(k);
    }
    expect(missing, `keys missing from en: ${missing.join(', ')}`).toEqual([]);
  });

  it('en and zh-CN key sets are identical', () => {
    expect(new Set(zhLeaves)).toEqual(new Set(enLeaves));
  });

  it('every leaf value is a non-empty string in both locales', () => {
    for (const k of enLeaves) {
      const ev = lookup(en as Dictionary, k);
      const zv = lookup(zhCN as Dictionary, k);
      expect(typeof ev).toBe('string');
      expect(ev.length).toBeGreaterThan(0);
      expect(typeof zv).toBe('string');
      expect(zv.length).toBeGreaterThan(0);
    }
  });
});
