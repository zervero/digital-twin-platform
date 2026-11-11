import { describe, expect, it } from 'vitest';

import {
  formatValidationIssue,
  resolveActionLabel,
  resolveLabel,
} from '../i18n-label.js';

const dict: Record<string, string> = {
  'documents.fields.earTag': 'Ear tag',
  'documents.actions.save': 'Save',
  'documents.validation.required': '{label} is required',
  'documents.validation.minLines': 'Enter at least {min} line(s)',
  'documents.validation.lineRequired': 'Line {row}: {label} is required',
};

const t = (key: string, vars?: Record<string, string | number>) => {
  let out = dict[key] ?? key;
  if (vars) {
    out = out.replace(/\{(\w+)\}/g, (whole, k: string) =>
      k in vars ? String(vars[k]) : whole,
    );
  }
  return out;
};

describe('i18n-label helpers', () => {
  it('resolves labelKey when present', () => {
    expect(
      resolveLabel({ label: '耳号', labelKey: 'documents.fields.earTag' }, t),
    ).toBe('Ear tag');
    expect(resolveLabel({ label: 'Fallback' }, t)).toBe('Fallback');
  });

  it('falls back to shared action keys', () => {
    expect(resolveActionLabel({ id: 'save', label: '保存' }, t)).toBe('Save');
  });

  it('formats validation issues', () => {
    expect(
      formatValidationIssue(
        {
          code: 'required',
          params: { label: 'Ear', labelKey: 'documents.fields.earTag' },
          message: 'Ear is required',
        },
        t,
      ),
    ).toBe('Ear tag is required');
    expect(
      formatValidationIssue(
        { code: 'minLines', params: { min: 2 }, message: 'x' },
        t,
      ),
    ).toBe('Enter at least 2 line(s)');
  });
});
