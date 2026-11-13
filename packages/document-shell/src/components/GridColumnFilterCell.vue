<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElDropdown, ElDropdownItem, ElDropdownMenu } from 'element-plus';

import type { ListColumnFilterEditor } from '@dt/document-schema';
import { useI18n } from '@dt/i18n';
import { DtDatePicker, DtIcon, DtSelect, DtTextField } from '@dt/ui-kit';

import ListFilterOpIcon from './ListFilterOpIcon.vue';

import {
  defaultFilterCondition,
  isFilterConditionEmpty,
  normalizeFilterCondition,
  operatorsForMenu,
  showsFilterOperatorMenu,
  type ListFilterCondition,
  type ListFilterOp,
} from '../list-filter-condition.js';

const CLEAR_COLUMN = '__clear_column__' as const;

const props = defineProps<{
  editor: ListColumnFilterEditor;
  modelValue: unknown;
  selectOptions?: Array<{ label: string; value: string }>;
  rangeKind?: 'date' | 'datetime';
  rangeStartPlaceholder?: string;
  rangeEndPlaceholder?: string;
  selectPlaceholder?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ListFilterCondition];
  apply: [];
}>();

const { t } = useI18n();
const dropdownOpen = ref(false);

const condition = computed({
  get: () => normalizeFilterCondition(props.modelValue, props.editor),
  set: (next: ListFilterCondition) => emit('update:modelValue', next),
});

const showOperatorMenu = computed(() => showsFilterOperatorMenu(props.editor));

const operators = computed(() => operatorsForMenu(props.editor));

const showRangePickers = computed(
  () => props.editor === 'dateRange' || props.editor === 'dateTimeRange',
);

const showSingleDate = computed(() => props.editor === 'date');

const pickerType = computed(() => {
  if (props.editor === 'dateTimeRange') return 'datetime';
  if (props.editor === 'dateRange' || props.editor === 'date') return 'date';
  return 'date';
});

const valueFormat = computed(() =>
  pickerType.value === 'datetime' ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD',
);

function patchCondition(partial: Partial<ListFilterCondition>) {
  condition.value = { ...condition.value, ...partial };
}

function clearColumn() {
  condition.value = defaultFilterCondition(props.editor);
  emit('apply');
}

function onOperatorCommand(command: ListFilterOp | typeof CLEAR_COLUMN) {
  if (command === CLEAR_COLUMN) {
    clearColumn();
    return;
  }
  const next: ListFilterCondition = {
    ...condition.value,
    op: command,
  };
  if (command !== 'between') {
    delete next.value2;
  }
  condition.value = next;
  if (!isFilterConditionEmpty(next)) {
    emit('apply');
  }
}

function onValueInput(value: string | null | undefined) {
  patchCondition({ value: value ?? '' });
  emit('apply');
}

function onValue2Input(value: string | null | undefined) {
  patchCondition({ value2: value ?? '' });
  emit('apply');
}

function operatorLabel(op: ListFilterOp): string {
  return t(`documents.filterOps.${op}`);
}
</script>

<template>
  <div
    class="dt-grid-column-filter"
    :class="{ 'dt-grid-column-filter--plain': !showOperatorMenu }"
    @click.stop
  >
    <DtTextField
      v-if="showOperatorMenu"
      size="small"
      clearable
      class="dt-grid-column-filter__composite"
      :type="editor === 'number' ? 'number' : 'text'"
      :model-value="condition.value"
      @update:model-value="onValueInput(String($event ?? ''))"
      @clear="clearColumn"
    >
      <template #prepend>
        <ElDropdown
          class="dt-grid-column-filter__op-dropdown"
          trigger="click"
          :teleported="true"
          popper-class="dt-grid-column-filter__menu-popper"
          @visible-change="(v: boolean) => (dropdownOpen = v)"
          @command="onOperatorCommand"
        >
          <span
            class="dt-grid-column-filter__prepend-trigger"
            :class="{
              'dt-grid-column-filter__prepend-trigger--open': dropdownOpen,
            }"
            role="button"
            tabindex="0"
            :title="t('documents.filterOps.menuTitle')"
            :aria-label="t('documents.filterOps.menuTitle')"
            @keydown.enter.prevent
            @keydown.space.prevent
          >
            <ListFilterOpIcon :op="condition.op" size="sm" :stroke="1.5" />
          </span>
          <template #dropdown>
            <ElDropdownMenu
              class="dt-grid-column-filter__menu"
              @click.stop
            >
              <ElDropdownItem
                v-for="op in operators"
                :key="op"
                :command="op"
                :class="{
                  'dt-grid-column-filter__menu-item--active':
                    condition.op === op,
                }"
              >
                <span class="dt-grid-column-filter__menu-op">
                  <ListFilterOpIcon :op="op" size="sm" />
                  <span class="dt-grid-column-filter__menu-op-label">{{
                    operatorLabel(op)
                  }}</span>
                </span>
              </ElDropdownItem>
              <ElDropdownItem divided :command="CLEAR_COLUMN">
                <span class="dt-grid-column-filter__menu-op">
                  <DtIcon name="FilterX" size="sm" :stroke="1.5" />
                  <span class="dt-grid-column-filter__menu-op-label">{{
                    t('documents.filterOps.clearColumn')
                  }}</span>
                </span>
              </ElDropdownItem>
            </ElDropdownMenu>
          </template>
        </ElDropdown>
      </template>
    </DtTextField>

    <template v-else>
      <template v-if="editor === 'select'">
        <DtSelect
          size="small"
          clearable
          :model-value="condition.value"
          :options="selectOptions ?? []"
          :placeholder="selectPlaceholder"
          @update:model-value="onValueInput(String($event ?? ''))"
          @clear="clearColumn"
        />
      </template>
      <template v-else-if="showRangePickers">
        <div class="dt-grid-column-filter__range">
          <DtDatePicker
            size="small"
            clearable
            :type="pickerType"
            :value-format="valueFormat"
            :model-value="condition.value || null"
            :placeholder="rangeStartPlaceholder"
            @update:model-value="onValueInput"
            @clear="clearColumn"
          />
          <DtDatePicker
            size="small"
            clearable
            :type="pickerType"
            :value-format="valueFormat"
            :model-value="condition.value2 || null"
            :placeholder="rangeEndPlaceholder"
            @update:model-value="onValue2Input"
          />
        </div>
      </template>
      <DtDatePicker
        v-else-if="showSingleDate"
        size="small"
        clearable
        :type="pickerType"
        :value-format="valueFormat"
        :model-value="condition.value || null"
        @update:model-value="onValueInput"
        @clear="clearColumn"
      />
    </template>
  </div>
</template>
