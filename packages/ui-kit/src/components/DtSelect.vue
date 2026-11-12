<script setup lang="ts">
/**
 * Element Plus `ElSelect` wrapper (SPEC 0003 / ADR 0025 §2a).
 * Forwards the Select API. `options` is a convenience for label/value
 * lists; the default slot still wins when provided.
 */
import type { AnyFn } from '@vueuse/shared';
import { computed, ref, useAttrs, useSlots, type PropType } from 'vue';
import {
  ElOption,
  ElSelect,
  selectProps,
  type SelectInstance,
} from 'element-plus';

defineOptions({
  name: 'DtSelect',
  inheritAttrs: false,
});

/** Keeps Element Select's VueUse types portable for vue-tsc. */
type _SelectVueUseAnchor = AnyFn;

const props = defineProps({
  ...selectProps,
  options: {
    type: Array as PropType<
      ReadonlyArray<{ label: string; value: string | number | boolean }>
    >,
    default: () => [],
  },
});

const attrs = useAttrs();
const slots = useSlots();
const selectRef = ref<SelectInstance>();

const bound = computed(() => {
  const { options: _options, ...rest } = props;
  return {
    ...rest,
    ...attrs,
    class: ['dt-select', attrs.class],
  } as Record<string, unknown>;
});

defineExpose({
  focus: () => selectRef.value?.focus(),
  blur: () => selectRef.value?.blur(),
});
</script>

<template>
  <ElSelect ref="selectRef" v-bind="bound">
    <slot v-if="slots.default" />
    <template v-else>
      <ElOption
        v-for="opt in options"
        :key="String(opt.value)"
        :label="opt.label"
        :value="opt.value"
      />
    </template>
    <template v-if="slots.prefix" #prefix>
      <slot name="prefix" />
    </template>
    <template v-if="slots.empty" #empty>
      <slot name="empty" />
    </template>
    <template v-if="slots.header" #header>
      <slot name="header" />
    </template>
    <template v-if="slots.footer" #footer>
      <slot name="footer" />
    </template>
  </ElSelect>
</template>

<style scoped>
.dt-select {
  width: 100%;
}
.dt-select :deep(.el-select__wrapper) {
  min-height: var(--dt-control-height);
}
</style>
