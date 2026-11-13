/**
 * UI-agnostic document (单据) definition types — SPEC 0001 / ADR 0024.
 * No Vue / vxe imports allowed in this package.
 */

export type FieldEditor =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'dateRange'
  | 'select'
  | 'readonly';

export type DocumentActionId =
  | 'create'
  | 'edit'
  | 'delete'
  | 'save'
  | 'discard'
  | 'audit'
  | 'addLine'
  | 'removeLine';

export interface SelectOption {
  readonly label: string;
  /** Optional `@dt/i18n` key; shell prefers this over `label` (SPEC 0004). */
  readonly labelKey?: string;
  readonly value: string;
}

export interface FieldDefinition {
  readonly key: string;
  readonly label: string;
  /** Optional `@dt/i18n` key; shell prefers this over `label` (SPEC 0004). */
  readonly labelKey?: string;
  readonly editor: FieldEditor;
  readonly required?: boolean;
  /** For `select` editors. */
  readonly options?: readonly SelectOption[];
  /** Placeholder / hint for inputs. */
  readonly placeholder?: string;
  readonly placeholderKey?: string;
}

/** List grid floating-filter control for a column (declared in document-modules). */
export type ListColumnFilterEditor =
  | 'text'
  | 'number'
  | 'select'
  | 'date'
  | 'dateRange'
  | 'dateTimeRange';

export interface ListColumnFilterDefinition {
  readonly editor: ListColumnFilterEditor;
  /** Static select options (create-by, enums, …). */
  readonly options?: readonly SelectOption[];
  readonly placeholderKey?: string;
}

export interface ColumnDefinition {
  readonly key: string;
  readonly label: string;
  readonly labelKey?: string;
  readonly editor?: FieldEditor;
  readonly required?: boolean;
  readonly width?: number;
  readonly minWidth?: number;
  readonly options?: readonly SelectOption[];
  /** Per-column floating filter on the list grid (document-shell). */
  readonly listFilter?: ListColumnFilterDefinition;
  /** When true, show as a link-style row affordance key (e.g. ear tag). */
  readonly link?: boolean;
}

export interface ActionDefinition {
  readonly id: DocumentActionId;
  readonly label: string;
  readonly labelKey?: string;
  /** Hide when create mode / no selection / etc. — shell interprets. */
  readonly requiresSelection?: boolean;
  readonly requiresExisting?: boolean;
  readonly requiresDirty?: boolean;
  readonly requiresClean?: boolean;
}

export interface DocumentListDefinition {
  readonly filters: readonly FieldDefinition[];
  readonly columns: readonly ColumnDefinition[];
  readonly rowActions: readonly ActionDefinition[];
  readonly toolbar: readonly ActionDefinition[];
  readonly pageSizes?: readonly number[];
  readonly defaultPageSize?: number;
}

export interface DocumentLinesDefinition {
  readonly columns: readonly ColumnDefinition[];
  readonly minRows?: number;
}

export interface DocumentDetailDefinition {
  readonly header: readonly FieldDefinition[];
  readonly lines: DocumentLinesDefinition;
  readonly footer?: {
    readonly remark?: boolean;
    readonly attachments?: boolean;
  };
  readonly toolbar: readonly ActionDefinition[];
}

export interface DocumentStatusDefinition {
  readonly supportsAudit?: boolean;
}

export interface DocumentDefinition {
  readonly id: string;
  /** Default display title (fallback when no locale match). */
  readonly title: string;
  /**
   * Optional `@dt/i18n` key for the document title (SPEC 0004).
   * Prefer over `titleLocales` when both are set in shell hosts that
   * call `t()`.
   */
  readonly titleKey?: string;
  /**
   * Optional localized titles for host chrome (nav, etc.).
   * Field labels use `label` / `labelKey` on each definition.
   */
  readonly titleLocales?: Readonly<Partial<Record<'en' | 'zh-CN', string>>>;
  /**
   * Optional lucide icon name for host side-nav
   * (e.g. `FileText`). Host casts to its icon union.
   */
  readonly navIcon?: string;
  /** Lower sorts first in registry-driven nav (default 100). */
  readonly navOrder?: number;
  /** Primary key field on list/detail records (default `id`). */
  readonly idField?: string;
  /** Human document number field (may be empty on create). */
  readonly docNoField?: string;
  readonly list: DocumentListDefinition;
  readonly detail: DocumentDetailDefinition;
  readonly status?: DocumentStatusDefinition;
}

/** Runtime document header + lines payload used by ports / shell. */
export interface DocumentLineRecord {
  readonly [key: string]: unknown;
}

export interface DocumentRecord {
  readonly id?: string;
  readonly docNo?: string;
  readonly audited?: boolean;
  readonly remark?: string;
  readonly lines: DocumentLineRecord[];
  readonly [key: string]: unknown;
}

export interface DocumentListQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly filters: Readonly<Record<string, unknown>>;
}

export interface DocumentListResult {
  readonly items: DocumentRecord[];
  readonly total: number;
}

export type ValidationIssueCode = 'required' | 'minLines' | 'lineRequired';

export interface ValidationIssue {
  readonly path: string;
  /** Machine-readable code for shell i18n (SPEC 0004). */
  readonly code: ValidationIssueCode;
  readonly params: {
    readonly label?: string;
    readonly labelKey?: string;
    readonly min?: number;
    readonly row?: number;
  };
  /**
   * Locale-neutral English fallback for tests / logs when no `t()` is
   * available. Prefer formatting via `code` + `params` in UI.
   */
  readonly message: string;
}
