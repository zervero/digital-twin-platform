<script setup lang="ts">
/**
 * Element Plus range date/time picker (SPEC 0003).
 * Defaults: `daterange` + `YYYY-MM-DD`; use `rangeKind="datetime"` for
 * `datetimerange` + `YYYY-MM-DD HH:mm:ss`.
 */
import { computed, ref, useAttrs, useSlots } from 'vue';
import {
  ElDatePicker,
  datePickerProps,
  type DatePickerInstance,
} from 'element-plus';

export type DtDateRangeKind = 'date' | 'datetime';

defineOptions({
  name: 'DtDateRangePicker',
  inheritAttrs: false,
});

const props = defineProps({
  ...datePickerProps,
  rangeKind: {
    type: String as () => DtDateRangeKind,
    default: 'date',
  },
});

const attrs = useAttrs();
const slots = useSlots();
const pickerRef = ref<DatePickerInstance>();

const bound = computed(() => {
  const isDateTime = props.rangeKind === 'datetime';
  const explicitType = props.type;
  const type =
    explicitType === 'daterange' || explicitType === 'datetimerange'
      ? explicitType
      : isDateTime
        ? 'datetimerange'
        : 'daterange';
  const valueFormat =
    props.valueFormat ??
    (isDateTime ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD');
  const { rangeKind: _rangeKind, ...rest } = props;
  return {
    ...rest,
    type,
    valueFormat,
    ...attrs,
    class: ['dt-date-range-picker', attrs.class],
  };
});

defineExpose({
  focus: () => pickerRef.value?.focus(),
  blur: () => pickerRef.value?.blur(),
  handleOpen: () => pickerRef.value?.handleOpen(),
  handleClose: () => pickerRef.value?.handleClose(),
});
</script>

<template>
  <ElDatePicker ref="pickerRef" v-bind="bound">
    <template v-for="(_, name) in slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
  </ElDatePicker>
</template>

<style scoped>
.dt-date-range-picker {
  width: 100%;
  vertical-align: middle;
  font-size: var(--dt-text-md);
}
.dt-date-range-picker.el-date-editor {
  height: var(--dt-control-height);
  --el-input-height: var(--dt-control-height);
  --el-input-inner-height: calc(var(--dt-control-height) - 2px);
}
</style>
