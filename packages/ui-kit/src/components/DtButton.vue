<script setup lang="ts">
/**
 * Element Plus `ElButton` wrapper.
 * Keeps `variant` + native `type` for existing callers, and forwards
 * other ElButton attributes (plain, loading, icon, …).
 */
import { computed, useAttrs } from 'vue';
import { ElButton } from 'element-plus';

defineOptions({
  name: 'DtButton',
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'primary' | 'danger' | 'ghost';
    disabled?: boolean;
    /** Native button type. Visual type comes from `variant`. */
    type?: 'button' | 'submit' | 'reset';
  }>(),
  { variant: 'default', disabled: false, type: 'button' },
);

const attrs = useAttrs();

const epType = computed(() => {
  if (props.variant === 'primary') return 'primary';
  if (props.variant === 'danger') return 'danger';
  return 'default';
});
</script>

<template>
  <ElButton
    v-bind="attrs"
    :class="['dt-button', attrs.class]"
    :type="epType"
    :text="variant === 'ghost'"
    :native-type="type"
    :disabled="disabled"
  >
    <slot />
  </ElButton>
</template>

<style scoped>
.dt-button {
  height: var(--dt-control-height);
  margin-left: 0;
}
</style>
