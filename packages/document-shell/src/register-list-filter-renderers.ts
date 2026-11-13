import { h } from 'vue';

import type { ListColumnFilterEditor } from '@dt/document-schema';
import VxeUI from 'vxe-pc-ui';

import type { VxeGlobalRendererHandles } from 'vxe-table';

import GridColumnFilterCell from './components/GridColumnFilterCell.vue';
import {
  defaultFilterCondition,
  isFilterConditionEmpty,
  normalizeFilterCondition,
  type ListFilterCondition,
} from './list-filter-condition.js';

type FilterOption = { data: unknown; checked?: boolean };

function applyFloatingFilter(
  params: VxeGlobalRendererHandles.RenderTableFloatingFilterParams,
  option: FilterOption,
  editor: ListColumnFilterEditor,
) {
  const condition = normalizeFilterCondition(option.data, editor);
  params.$table.updateFilterOptionStatus(
    option,
    !isFilterConditionEmpty(condition),
  );
  params.$table.saveFilterByEvent(new Event('change'), params.column);
}

function renderColumnFilter(
  renderOpts: VxeGlobalRendererHandles.RenderTableFloatingFilterOptions,
  params: VxeGlobalRendererHandles.RenderTableFloatingFilterParams,
) {
  const { option } = params;
  const editor = (renderOpts.props?.editor ?? 'text') as ListColumnFilterEditor;
  if (!option.data || typeof option.data !== 'object' || !('op' in option.data)) {
    option.data = defaultFilterCondition(editor);
  }

  return [
    h(GridColumnFilterCell, {
      editor,
      modelValue: option.data as ListFilterCondition,
      selectOptions: renderOpts.options ?? [],
      rangeKind:
        renderOpts.props?.rangeKind === 'datetime' ? 'datetime' : 'date',
      rangeStartPlaceholder: String(
        renderOpts.props?.startPlaceholder ?? ' ',
      ),
      rangeEndPlaceholder: String(renderOpts.props?.endPlaceholder ?? ' '),
      selectPlaceholder: String(renderOpts.props?.placeholder ?? ' '),
      'onUpdate:modelValue'(value: ListFilterCondition) {
        option.data = value;
        params.$table.updateFilterOptionStatus(
          option,
          !isFilterConditionEmpty(value),
        );
      },
      onApply: () => applyFloatingFilter(params, option, editor),
    }),
  ];
}

let registered = false;

/** List grid floating filters: operator menu + `@dt/ui-kit` value editors. */
export function registerListFilterRenderers(): void {
  if (registered) return;
  registered = true;

  VxeUI.renderer.add('DtListColumnFilter', {
    createTableFilterOptions: () => [
      { data: defaultFilterCondition('text') },
    ],
    renderTableFloatingFilter: renderColumnFilter,
  });
}

export const DT_LIST_FILTER_RENDERER_NAMES = ['DtListColumnFilter'] as const;
