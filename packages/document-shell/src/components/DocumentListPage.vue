<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import type { DocumentDefinition, DocumentRecord } from '@dt/document-schema';
import { DtButton } from '@dt/ui-kit';

import type { DocumentDataPort } from '../ports.js';
import DocumentFilterBar from './DocumentFilterBar.vue';

const props = defineProps<{
  definition: DocumentDefinition;
  port: DocumentDataPort;
  /** Base path prefix, e.g. `/documents/sow-death` */
  basePath: string;
}>();

const router = useRouter();

const filters = ref<Record<string, unknown>>({});
const items = ref<DocumentRecord[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(props.definition.list.defaultPageSize ?? 20);
const loading = ref(false);
const selectedIds = ref<string[]>([]);
const error = ref<string | null>(null);

const pageSizes = computed(
  () => props.definition.list.pageSizes ?? [10, 20, 50],
);

const columns = computed(() =>
  props.definition.list.columns.map((col) => ({
    field: col.key,
    title: col.label,
    minWidth: col.minWidth ?? col.width ?? 100,
    slots: col.link ? { default: `link-${col.key}` } : undefined,
  })),
);

function initFilters() {
  const next: Record<string, unknown> = {};
  for (const f of props.definition.list.filters) {
    next[f.key] = f.editor === 'dateRange' ? ['', ''] : '';
  }
  filters.value = next;
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const result = await props.port.loadList({
      page: page.value,
      pageSize: pageSize.value,
      filters: { ...filters.value },
    });
    items.value = result.items;
    total.value = result.total;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

function onCheckboxChange({ records }: { records: DocumentRecord[] }) {
  selectedIds.value = records
    .map((r) => r.id)
    .filter((id): id is string => Boolean(id));
}

function goCreate() {
  void router.push(`${props.basePath}/detail`);
}

function goEdit(row: DocumentRecord) {
  if (!row.id) return;
  void router.push(`${props.basePath}/detail/${row.id}`);
}

async function onDeleteSelected() {
  if (!selectedIds.value.length) return;
  await props.port.remove(selectedIds.value);
  selectedIds.value = [];
  await load();
}

async function onAuditSelected() {
  if (!selectedIds.value.length || !props.port.audit) return;
  await props.port.audit(selectedIds.value);
  selectedIds.value = [];
  await load();
}

async function onRowDelete(row: DocumentRecord) {
  if (!row.id) return;
  await props.port.remove([row.id]);
  await load();
}

onMounted(() => {
  initFilters();
  void load();
});
</script>

<template>
  <div class="dt-document-island dt-doc-list" data-testid="document-list">
    <header class="dt-doc-list__header">
      <h1 class="dt-doc-list__title">{{ definition.title }}</h1>
    </header>

    <DocumentFilterBar
      v-model="filters"
      :filters="definition.list.filters"
      @query="
        page = 1;
        load();
      "
      @reset="
        page = 1;
        load();
      "
    />

    <div class="dt-doc-list__toolbar">
      <DtButton
        v-for="action in definition.list.toolbar"
        :key="action.id"
        :variant="action.id === 'create' ? 'primary' : 'default'"
        :disabled="
          Boolean(action.requiresSelection && selectedIds.length === 0)
        "
        @click="
          action.id === 'create'
            ? goCreate()
            : action.id === 'delete'
              ? onDeleteSelected()
              : action.id === 'audit'
                ? onAuditSelected()
                : undefined
        "
      >
        {{ action.label }}
      </DtButton>
      <span class="dt-doc-list__selection">已选择 {{ selectedIds.length }} 项</span>
    </div>

    <p v-if="error" class="dt-doc-list__error" role="alert">{{ error }}</p>

    <div class="dt-doc-list__grid">
      <vxe-grid
        :data="items"
        :columns="[
          { type: 'checkbox', width: 48 },
          { type: 'seq', title: '序号', width: 60 },
          ...columns,
          {
            title: '操作',
            width: 120,
            fixed: 'right',
            slots: { default: 'rowActions' },
          },
        ]"
        :loading="loading"
        border
        size="small"
        height="100%"
        :row-config="{ keyField: 'id' }"
        @checkbox-all="onCheckboxChange"
        @checkbox-change="onCheckboxChange"
      >
        <template
          v-for="col in definition.list.columns.filter((c) => c.link)"
          :key="col.key"
          #[`link-${col.key}`]="{ row }"
        >
          <a class="dt-doc-link" @click.prevent="goEdit(row)">{{
            row[col.key]
          }}</a>
        </template>
        <template #rowActions="{ row }">
          <a
            v-for="action in definition.list.rowActions"
            :key="action.id"
            class="dt-doc-link dt-doc-list__row-action"
            @click.prevent="
              action.id === 'edit'
                ? goEdit(row)
                : action.id === 'delete'
                  ? onRowDelete(row)
                  : undefined
            "
          >
            {{ action.label }}
          </a>
        </template>
      </vxe-grid>
    </div>

    <footer class="dt-doc-list__pager">
      <label>
        每页
        <select
          v-model.number="pageSize"
          @change="
            page = 1;
            load();
          "
        >
          <option v-for="size in pageSizes" :key="size" :value="size">
            {{ size }}
          </option>
        </select>
      </label>
      <button type="button" :disabled="page <= 1" @click="page--; load()">
        上一页
      </button>
      <span>第 {{ page }} 页 / 共 {{ Math.max(1, Math.ceil(total / pageSize)) }} 页（{{ total }} 条）</span>
      <button
        type="button"
        :disabled="page * pageSize >= total"
        @click="page++; load()"
      >
        下一页
      </button>
    </footer>
  </div>
</template>

<style scoped>
.dt-doc-list {
  padding: var(--dt-space-lg, 16px);
  gap: var(--dt-space-sm, 8px);
  height: 100%;
}
.dt-doc-list__title {
  margin: 0;
  font-size: 1.25rem;
}
.dt-doc-list__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.dt-doc-list__selection {
  font-size: 12px;
  color: var(--dt-text-secondary, #667085);
}
.dt-doc-list__grid {
  flex: 1;
  min-height: 280px;
}
.dt-doc-list__row-action + .dt-doc-list__row-action {
  margin-left: 8px;
}
.dt-doc-list__error {
  color: var(--dt-accent-danger, #d92d20);
}
.dt-doc-list__pager {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 13px;
}
</style>
