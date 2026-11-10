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
  readonly value: string;
}

export interface FieldDefinition {
  readonly key: string;
  readonly label: string;
  readonly editor: FieldEditor;
  readonly required?: boolean;
  /** For `select` editors. */
  readonly options?: readonly SelectOption[];
  /** Placeholder / hint for inputs. */
  readonly placeholder?: string;
}

export interface ColumnDefinition {
  readonly key: string;
  readonly label: string;
  readonly editor?: FieldEditor;
  readonly required?: boolean;
  readonly width?: number;
  readonly minWidth?: number;
  readonly options?: readonly SelectOption[];
  /** When true, show as a link-style row affordance key (e.g. ear tag). */
  readonly link?: boolean;
}

export interface ActionDefinition {
  readonly id: DocumentActionId;
  readonly label: string;
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
  readonly title: string;
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

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}
