import type {
  ColumnDefinition,
  DocumentDefinition,
  ListColumnFilterEditor,
  SelectOption,
} from '@dt/document-schema';

import { resolveListColumnSortKind } from './list-sort.js';
import { defaultFilterCondition } from './list-filter-condition.js';
import { matchListFilterCondition } from './list-filter-match.js';

function resolveFilterEditorFallback(
  col: ColumnDefinition,
  definition: DocumentDefinition,
): ListColumnFilterEditor {
  const headerField = definition.detail.header.find((f) => f.key === col.key);
  const editor = col.editor ?? headerField?.editor;
  if (editor === 'select') return 'select';
  if (editor === 'number') return 'number';
  if (editor === 'date') return 'date';
  if (editor === 'dateRange') return 'dateRange';
  if (resolveListColumnSortKind(col.key, definition) === 'date') return 'date';
  return 'text';
}

export function resolveListColumnFilterEditor(
  col: ColumnDefinition,
  definition: DocumentDefinition,
): ListColumnFilterEditor {
  return col.listFilter?.editor ?? resolveFilterEditorFallback(col, definition);
}

/** User-facing placeholders for grid floating filters (from shell i18n). */
export type ListFilterChrome = {
  rangeStartPlaceholder: string;
  rangeEndPlaceholder: string;
  selectPlaceholder: string;
};

function resolveSelectOptions(
  col: ColumnDefinition,
  definition: DocumentDefinition,
): SelectOption[] {
  const headerField = definition.detail.header.find((f) => f.key === col.key);
  const listFilterField = definition.list.filters.find((f) => f.key === col.key);
  const raw =
    col.listFilter?.options ??
    col.options ??
    headerField?.options ??
    listFilterField?.options ??
    [];
  return raw.filter((opt) => opt.value !== '');
}

export type ListColumnFilterProps = {
  filters: Array<{ data: unknown }>;
  floatingFilters: true;
  filterRender: {
    name: string;
    props?: Record<string, unknown>;
    options?: Array<{ label: string; value: string }>;
  };
  filterMethod: (params: {
    option: { data?: unknown };
    row: Record<string, unknown>;
    column: { field: string };
  }) => boolean;
};

export function buildListColumnFilterProps(
  col: ColumnDefinition,
  definition: DocumentDefinition,
  chrome?: ListFilterChrome,
): ListColumnFilterProps {
  const kind = resolveListColumnFilterEditor(col, definition);
  const dateOnly = kind === 'date' || kind === 'dateRange';
  const selectOptions =
    kind === 'select'
      ? resolveSelectOptions(col, definition).map((opt) => ({
          label: opt.label,
          value: opt.value,
        }))
      : undefined;

  return {
    filters: [{ data: defaultFilterCondition(kind) }],
    floatingFilters: true,
    filterRender: {
      name: 'DtListColumnFilter',
      options: selectOptions,
      props: {
        editor: kind,
        rangeKind: dateOnly ? 'date' : 'datetime',
        startPlaceholder: chrome?.rangeStartPlaceholder ?? ' ',
        endPlaceholder: chrome?.rangeEndPlaceholder ?? ' ',
        placeholder: chrome?.selectPlaceholder ?? ' ',
      },
    },
    filterMethod: ({ option, row, column }) =>
      matchListFilterCondition(row[column.field], option.data, kind),
  };
}
