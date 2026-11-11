import type { DocumentDefinition } from '@dt/document-schema';

import { listRegisteredDocuments } from './composables/useDocumentRegistry.js';
import type { TranslateFn } from './i18n-label.js';

export interface DocumentNavItem {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  readonly icon?: string;
}

/** Resolve a document title for the active locale (falls back to `title`). */
export function resolveDocumentTitle(
  definition: DocumentDefinition,
  locale: string,
  t?: TranslateFn,
): string {
  if (definition.titleKey && t) {
    const translated = t(definition.titleKey);
    if (translated !== definition.titleKey) return translated;
  }
  const localized = definition.titleLocales?.[locale as 'en' | 'zh-CN'];
  return localized?.trim() || definition.title;
}

/**
 * Nav entries derived from the in-memory document registry.
 * Hosts (e.g. AdminWorkspace) should not hard-code per-type ids.
 * Pass `t` so `titleKey` resolves via `@dt/i18n` (SPEC 0004).
 */
export function listDocumentNavItems(
  locale: string,
  t?: TranslateFn,
): DocumentNavItem[] {
  return listRegisteredDocuments()
    .slice()
    .sort((a, b) => {
      const orderA = a.definition.navOrder ?? 100;
      const orderB = b.definition.navOrder ?? 100;
      if (orderA !== orderB) return orderA - orderB;
      return a.definition.id.localeCompare(b.definition.id);
    })
    .map((entry) => ({
      id: entry.definition.id,
      label: resolveDocumentTitle(entry.definition, locale, t),
      path: `/documents/${entry.definition.id}`,
      icon: entry.definition.navIcon,
    }));
}

/** Match `/documents/:typeId…` against the registry; undefined if unknown. */
export function matchDocumentNavId(pathname: string): string | undefined {
  if (!pathname.startsWith('/documents/')) return undefined;
  const typeId = pathname.slice('/documents/'.length).split('/')[0];
  if (!typeId) return undefined;
  return listRegisteredDocuments().some((e) => e.definition.id === typeId)
    ? typeId
    : undefined;
}
