<script setup lang="ts">
import { reactive, watch } from 'vue';

import type { FieldDefinition } from '@dt/document-schema';
import { useI18n } from '@dt/i18n';
import { DtButton, DtDatePicker } from '@dt/ui-kit';

import { resolveLabel, resolvePlaceholder } from '../i18n-label.js';

const props = defineProps<{
  filters: readonly FieldDefinition[];
  modelValue: Record<string, unknown>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>];
  query: [];
  reset: [];
}>();

const { t } = useI18n();
const local = reactive<Record<string, unknown>>({});

watch(
  () => props.modelValue,
  (v) => {
    for (const key of Object.keys(local)) delete local[key];
    Object.assign(local, v);
  },
  { immediate: true, deep: true },
);

function sync() {
  emit('update:modelValue', { ...local });
}

function rangeValue(key: string): [string, string] {
  const raw = local[key];
  if (Array.isArray(raw) && raw.length >= 2) {
    return [String(raw[0] ?? ''), String(raw[1] ?? '')];
  }
  return ['', ''];
}

function setRange(key: string, index: 0 | 1, value: string | null) {
  const next = rangeValue(key);
  next[index] = value ?? '';
  local[key] = next;
  sync();
}

function setDate(key: string, value: string | null) {
  local[key] = value ?? '';
  sync();
}

function onQuery() {
  sync();
  emit('query');
}

function onReset() {
  for (const key of Object.keys(local)) delete local[key];
  for (const f of props.filters) {
    local[f.key] = f.editor === 'dateRange' ? ['', ''] : '';
  }
  sync();
  emit('reset');
}

function optionLabel(opt: { label: string; labelKey?: string }): string {
  return resolveLabel(opt, t);
}
</script>

<template>
  <form class="dt-doc-filters" @submit.prevent="onQuery">
    <div
      v-for="field in filters"
      :key="field.key"
      class="dt-doc-filters__item"
    >
      <label class="dt-doc-filters__label" :for="`filter-${field.key}`">
        {{ resolveLabel(field, t) }}
      </label>
      <template v-if="field.editor === 'dateRange'">
        <div class="dt-doc-filters__range">
          <DtDatePicker
            :id="`filter-${field.key}-from`"
            :model-value="rangeValue(field.key)[0] || null"
            :placeholder="t('documents.chrome.dateFrom')"
            @update:model-value="(v) => setRange(field.key, 0, v)"
          />
          <span>~</span>
          <DtDatePicker
            :id="`filter-${field.key}-to`"
            :model-value="rangeValue(field.key)[1] || null"
            :placeholder="t('documents.chrome.dateTo')"
            @update:model-value="(v) => setRange(field.key, 1, v)"
          />
        </div>
      </template>
      <DtDatePicker
        v-else-if="field.editor === 'date'"
        :id="`filter-${field.key}`"
        :model-value="local[field.key] ? String(local[field.key]) : null"
        :placeholder="resolvePlaceholder(field, t)"
        @update:model-value="(v) => setDate(field.key, v)"
      />
      <select
        v-else-if="field.editor === 'select'"
        :id="`filter-${field.key}`"
        v-model="local[field.key]"
        class="dt-doc-filters__input"
        @change="sync"
      >
        <option
          v-for="opt in field.options ?? []"
          :key="String(opt.value)"
          :value="opt.value"
        >
          {{ optionLabel(opt) }}
        </option>
      </select>
      <input
        v-else
        :id="`filter-${field.key}`"
        v-model="local[field.key]"
        type="text"
        class="dt-doc-filters__input"
        :placeholder="resolvePlaceholder(field, t)"
        @change="sync"
      />
    </div>
    <div class="dt-doc-filters__actions">
      <DtButton type="submit" variant="primary">{{
        t('documents.chrome.query')
      }}</DtButton>
      <DtButton type="button" variant="ghost" @click="onReset">{{
        t('documents.chrome.reset')
      }}</DtButton>
    </div>
  </form>
</template>

<style scoped>
.dt-doc-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dt-space-md, 12px);
  align-items: flex-end;
  padding: var(--dt-space-md, 12px) 0;
}
.dt-doc-filters__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 180px;
}
.dt-doc-filters__label {
  font-size: 12px;
  color: var(--dt-text-secondary);
}
.dt-doc-filters__input {
  border: 1px solid var(--dt-border-default);
  border-radius: var(--dt-radius-sm);
  padding: 6px 8px;
  font: inherit;
  background: var(--dt-bg-surface);
  color: inherit;
}
.dt-doc-filters__range {
  display: flex;
  align-items: center;
  gap: 6px;
}
.dt-doc-filters__range :deep(.dt-date-picker) {
  width: 148px;
}
.dt-doc-filters__actions {
  display: flex;
  gap: 8px;
}
</style>
