<script setup lang="ts">
/**
 * Element Plus `ElDatePicker` wrapper (SPEC 0003 / ADR 0025 §2a).
 * Forwards props, listeners, slots, and expose methods unchanged.
 * Product defaults (overridable): `value-format="YYYY-MM-DD"`,
 * class `dt-date-picker` (full width).
 */
import { computed, ref, useAttrs, useSlots } from 'vue';
import {
  ElDatePicker,
  datePickerProps,
  type DatePickerInstance,
} from 'element-plus';

defineOptions({
  name: 'DtDatePicker',
  inheritAttrs: false,
});

const props = defineProps(datePickerProps);
const attrs = useAttrs();
const slots = useSlots();
const pickerRef = ref<DatePickerInstance>();

const bound = computed(() => ({
  ...props,
  valueFormat: props.valueFormat ?? 'YYYY-MM-DD',
  ...attrs,
  class: ['dt-date-picker', attrs.class],
}));

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
.dt-date-picker {
  width: 100%;
}
</style>
