import type { DocumentDefinition } from '@dt/document-schema';

import { listRegisteredDocuments } from './composables/useDocumentRegistry.js';

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
): string {
  const localized = definition.titleLocales?.[locale as 'en' | 'zh-CN'];
  return localized?.trim() || definition.title;
}

/**
 * Nav entries derived from the in-memory document registry.
 * Hosts (e.g. AdminWorkspace) should not hard-code per-type ids.
 */
export function listDocumentNavItems(locale: string): DocumentNavItem[] {
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
      label: resolveDocumentTitle(entry.definition, locale),
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
