/**
 * Resolve definition labels against `@dt/i18n` (SPEC 0004).
 * Prefer `labelKey` / `placeholderKey` when the key exists in the
 * active dictionary; otherwise fall back to the literal `label`.
 */

export type TranslateFn = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

export interface Labeled {
  readonly label: string;
  readonly labelKey?: string;
}

export interface Placeholdered {
  readonly placeholder?: string;
  readonly placeholderKey?: string;
}

function translateOrFallback(
  t: TranslateFn,
  key: string | undefined,
  fallback: string,
): string {
  if (!key) return fallback;
  const translated = t(key);
  return translated === key ? fallback : translated;
}

export function resolveLabel(item: Labeled, t: TranslateFn): string {
  return translateOrFallback(t, item.labelKey, item.label);
}

export function resolvePlaceholder(
  item: Placeholdered,
  t: TranslateFn,
): string {
  const fallback = item.placeholder ?? '';
  return translateOrFallback(t, item.placeholderKey, fallback);
}

export function resolveActionLabel(
  action: Labeled & { readonly id: string },
  t: TranslateFn,
): string {
  if (action.labelKey) return resolveLabel(action, t);
  const shared = t(`documents.actions.${action.id}`);
  if (shared !== `documents.actions.${action.id}`) return shared;
  return action.label;
}

export function formatValidationIssue(
  issue: {
    readonly code: string;
    readonly params: {
      readonly label?: string;
      readonly labelKey?: string;
      readonly min?: number;
      readonly row?: number;
    };
    readonly message: string;
  },
  t: TranslateFn,
): string {
  const label = issue.params.labelKey
    ? translateOrFallback(t, issue.params.labelKey, issue.params.label ?? '')
    : (issue.params.label ?? '');

  if (issue.code === 'required') {
    return t('documents.validation.required', { label });
  }
  if (issue.code === 'minLines') {
    return t('documents.validation.minLines', {
      min: issue.params.min ?? 0,
    });
  }
  if (issue.code === 'lineRequired') {
    return t('documents.validation.lineRequired', {
      row: issue.params.row ?? 0,
      label,
    });
  }
  return issue.message;
}
