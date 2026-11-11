<script setup lang="ts">
/**
 * Element Plus `ElConfigProvider` wrapper (SPEC 0003 / ADR 0025 §2a).
 * Forwards the full ConfigProvider API. When `locale` (Element
 * `Language`) changes, sync Day.js for date/time controls.
 * Map product codes with `elementLocaleOf` at the call site.
 */
import { computed, useAttrs, useSlots, watch } from 'vue';
import { ElConfigProvider, configProviderProps } from 'element-plus';
import type { Language } from 'element-plus/es/locale';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/zh-cn';

defineOptions({
  name: 'DtConfigProvider',
  inheritAttrs: false,
});

const props = defineProps(configProviderProps);
const attrs = useAttrs();
const slots = useSlots();

const bound = computed(() => ({
  ...props,
  ...attrs,
}));

watch(
  () => props.locale as Language | undefined,
  (lang) => {
    dayjs.locale(lang?.name === 'zh-cn' ? 'zh-cn' : 'en');
  },
  { immediate: true },
);
</script>

<template>
  <ElConfigProvider v-bind="bound">
    <template v-for="(_, name) in slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
  </ElConfigProvider>
</template>
