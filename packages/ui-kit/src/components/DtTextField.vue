<script setup lang="ts">
/**
 * Element Plus `ElInput` wrapper (SPEC 0003 / ADR 0025 §2a).
 * Forwards props, listeners, slots, and expose methods.
 * Use `type="textarea"` for multiline.
 */
import { computed, ref, useAttrs, useSlots } from 'vue';
import { ElInput, inputProps, type InputInstance } from 'element-plus';

defineOptions({
  name: 'DtTextField',
  inheritAttrs: false,
});

const props = defineProps(inputProps);
const attrs = useAttrs();
const slots = useSlots();
const inputRef = ref<InputInstance>();
// inputProps' runtime `formatter` is typed as Function, which is wider
// than ElInput's public prop. Listeners in attrs win over that object.
const inputBind = computed(
  () => ({ ...props, ...attrs, class: ['dt-text-field', attrs.class] }) as any,
);

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  select: () => inputRef.value?.select(),
  clear: () => inputRef.value?.clear(),
  resizeTextarea: () => inputRef.value?.resizeTextarea(),
});
</script>

<template>
  <ElInput ref="inputRef" v-bind="inputBind">
    <template v-for="(_, name) in slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
  </ElInput>
</template>

<style scoped>
.dt-text-field {
  width: 100%;
}
</style>
