<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import { useRouter } from 'vue-router';

import type { DocumentDefinition, DocumentRecord } from '@dt/document-schema';
import { useI18n } from '@dt/i18n';
import { DtButton, DtIcon, DtSelect } from '@dt/ui-kit';

import { resolveActionLabel, resolveLabel } from '../i18n-label.js';
import { resolveDocumentTitle } from '../nav.js';
import type { DocumentDataPort } from '../ports.js';
import { downloadListAsExcelCsv } from '../list-export.js';
import { buildListColumnFilterProps } from '../list-column-filter.js';
import {
  compareListCellValues,
  resolveListColumnSortKind,
} from '../list-sort.js';
import DocumentFilterBar from './DocumentFilterBar.vue';

const props = defineProps<{
  definition: DocumentDefinition;
  port: DocumentDataPort;
  /** Base path prefix, e.g. `/documents/sow-death` */
  basePath: string;
}>();

const router = useRouter();
const { t, locale } = useI18n();

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

const pageTitle = computed(() =>
  resolveDocumentTitle(props.definition, locale.value, t),
);

const pageCount = computed(() =>
  Math.max(1, Math.ceil(total.value / pageSize.value)),
);

const pageSizeOptions = computed(() =>
  pageSizes.value.map((size) => ({ label: String(size), value: String(size) })),
);

const ROW_ACTIONS_FIELD = 'dt:row-actions';

function listColumnDragDisabled(params: {
  column: {
    type?: string | null;
    fixed?: string | boolean | null;
    field?: string;
  };
}): boolean {
  const { column } = params;
  return Boolean(
    column.type === 'checkbox' ||
      column.type === 'seq' ||
      column.fixed ||
      column.field === ROW_ACTIONS_FIELD,
  );
}

const columnConfig = {
  drag: true,
  useKey: true,
} as const;

const customConfig = {
  enabled: true,
  mode: 'modal' as const,
} as const;

const columnFiltersVisible = ref(false);
const moreMenuOpen = ref(false);
const gridNotice = ref<string | null>(null);
const moreMenuRoot = ref<HTMLElement | null>(null);
const importInputRef = ref<HTMLInputElement | null>(null);

const gridListId = computed(() => `dt-doc-list-${props.definition.id}`);

const floatingFilterConfig = computed(() => ({
  enabled: columnFiltersVisible.value,
  position: 'bottom' as const,
  rowClassName: 'dt-doc-grid-floating-filters',
}));

const listFilterChrome = computed(() => ({
  rangeStartPlaceholder: t('documents.chrome.gridFilterFrom'),
  rangeEndPlaceholder: t('documents.chrome.gridFilterTo'),
  selectPlaceholder: t('documents.chrome.all'),
}));

const filterConfig = {
  remote: false,
  showIcon: false,
} as const;

const columnDragConfig = {
  trigger: 'cell' as const,
  showIcon: false,
  showDragTip: true,
  disabledMethod: listColumnDragDisabled,
};

const sortCollatorLocale = computed(() =>
  locale.value.startsWith('zh') ? 'zh-CN' : 'en',
);

const sortConfig = computed(() => ({
  multiple: false,
  trigger: 'cell' as const,
  showIcon: true,
  allowBtn: true,
  iconLayout: 'vertical' as const,
  ascTitle: t('documents.chrome.sortAsc'),
  descTitle: t('documents.chrome.sortDesc'),
  sortMethod: ({
    data,
    sortList,
  }: {
    data: DocumentRecord[];
    sortList: Array<{
      field?: string;
      property?: string;
      order: string | null;
    }>;
  }) => {
    if (!sortList.length) return data;
    const sort = sortList[0]!;
    const field = String(sort.field ?? sort.property ?? '');
    const order = sort.order;
    if (!field || field === ROW_ACTIONS_FIELD || !order) return data;
    const kind = resolveListColumnSortKind(field, props.definition);
    const dir = order === 'desc' ? -1 : 1;
    return [...data].sort(
      (left, right) =>
        dir *
        compareListCellValues(
          left[field],
          right[field],
          kind,
          sortCollatorLocale.value,
        ),
    );
  },
}));

type VxeGridInstance = {
  getFullColumns: () => Array<{ field?: string }>;
  openCustom?: () => Promise<void>;
  recalculate?: () => void | Promise<void>;
};

const gridRef = ref<VxeGridInstance | null>(null);

const columnOrder = ref(
  props.definition.list.columns.map((col) => col.key),
);

watch(
  () => props.definition.list.columns.map((col) => col.key).join('\0'),
  () => {
    columnOrder.value = props.definition.list.columns.map((col) => col.key);
  },
);

function buildDataColumn(col: (typeof props.definition.list.columns)[number]) {
  const base = {
    field: col.key,
    title: resolveLabel(col, t),
    minWidth: col.minWidth ?? col.width ?? 100,
    sortable: true,
    slots: col.link ? { default: `link-${col.key}` } : undefined,
  };
  return {
    ...base,
    ...buildListColumnFilterProps(
      col,
      props.definition,
      listFilterChrome.value,
    ),
  };
}

const dataColumns = computed(() => {
  const byKey = new Map(
    props.definition.list.columns.map((col) => [col.key, col]),
  );
  return columnOrder.value
    .filter((key) => byKey.has(key))
    .map((key) => buildDataColumn(byKey.get(key)!));
});

const gridColumns = computed(() => [
  { type: 'checkbox' as const, width: 48, fixed: 'left' as const },
  {
    type: 'seq' as const,
    title: t('documents.chrome.seq'),
    width: 60,
    fixed: 'left' as const,
  },
  ...dataColumns.value,
  {
    field: ROW_ACTIONS_FIELD,
    title: t('documents.chrome.actions'),
    width: 120,
    fixed: 'right' as const,
    slots: { default: 'rowActions' as const },
  },
]);

function syncColumnOrderFromGrid() {
  const $grid = gridRef.value;
  if (!$grid) return;
  const keys = $grid
    .getFullColumns()
    .map((col) => col.field)
    .filter(
      (field): field is string =>
        Boolean(field) && field !== ROW_ACTIONS_FIELD,
    );
  if (keys.length) {
    columnOrder.value = keys;
  }
}

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

function closeMoreMenu() {
  moreMenuOpen.value = false;
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!moreMenuOpen.value) return;
  const root = moreMenuRoot.value;
  if (root && !root.contains(event.target as Node)) {
    closeMoreMenu();
  }
}

async function onGridRefresh() {
  await load();
}

async function onGridSettings() {
  await gridRef.value?.openCustom?.();
}

async function onGridToggleFilters() {
  const grid = gridRef.value;
  columnFiltersVisible.value = !columnFiltersVisible.value;
  await nextTick();
  await grid?.recalculate?.();
}

function onExportExcel() {
  closeMoreMenu();
  const columns = props.definition.list.columns;
  const headers = columns.map((col) => resolveLabel(col, t));
  const keys = columns.map((col) => col.key);
  const rows = items.value.map((row) =>
    keys.map((key) => String(row[key] ?? '')),
  );
  const stamp = new Date().toISOString().slice(0, 10);
  downloadListAsExcelCsv(`${props.definition.id}-${stamp}`, headers, rows);
}

function onImportTrigger() {
  closeMoreMenu();
  importInputRef.value?.click();
}

function onImportFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  gridNotice.value = t('documents.chrome.importPending');
}

onMounted(() => {
  initFilters();
  void load();
  document.addEventListener('pointerdown', onDocumentPointerDown, true);
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true);
});
</script>

<template>
  <div class="dt-document-island dt-doc-list" data-testid="document-list">
    <header class="dt-doc-list__header">
      <h1 class="dt-doc-list__title">{{ pageTitle }}</h1>
    </header>

    <DocumentFilterBar
      v-if="definition.list.filters.length"
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
      <div class="dt-doc-list__toolbar-main">
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
          {{ resolveActionLabel(action, t) }}
        </DtButton>
        <span class="dt-doc-list__selection">{{
          t('documents.chrome.selectedCount', { count: selectedIds.length })
        }}</span>
      </div>

      <div
        class="dt-doc-list__grid-tools"
        role="toolbar"
        :aria-label="t('documents.chrome.gridTools')"
        data-testid="document-list-grid-tools"
      >
        <button
          type="button"
          class="dt-doc-list__grid-tool"
          :title="t('documents.chrome.refresh')"
          :aria-label="t('documents.chrome.refresh')"
          @click="onGridRefresh()"
        >
          <DtIcon name="RefreshCw" size="md" />
        </button>
        <button
          type="button"
          class="dt-doc-list__grid-tool"
          :title="t('documents.chrome.settings')"
          :aria-label="t('documents.chrome.settings')"
          @click="onGridSettings()"
        >
          <DtIcon name="Settings" size="md" />
        </button>
        <button
          type="button"
          class="dt-doc-list__grid-tool"
          :class="{
            'dt-doc-list__grid-tool--active': columnFiltersVisible,
          }"
          data-testid="document-list-toggle-filters"
          :title="t('documents.chrome.toggleFilters')"
          :aria-label="t('documents.chrome.toggleFilters')"
          :aria-pressed="columnFiltersVisible"
          @click="onGridToggleFilters()"
        >
          <DtIcon name="Filter" size="md" />
        </button>
        <div ref="moreMenuRoot" class="dt-doc-list__more">
          <button
            type="button"
            class="dt-doc-list__grid-tool"
            :class="{ 'dt-doc-list__grid-tool--active': moreMenuOpen }"
            :title="t('documents.chrome.moreActions')"
            :aria-label="t('documents.chrome.moreActions')"
            :aria-expanded="moreMenuOpen"
            aria-haspopup="menu"
            @click="moreMenuOpen = !moreMenuOpen"
          >
            <DtIcon name="MoreHorizontal" size="md" />
          </button>
          <div
            v-if="moreMenuOpen"
            class="dt-doc-list__more-menu"
            role="menu"
            @click.stop
          >
            <button
              type="button"
              class="dt-doc-list__more-item"
              role="menuitem"
              @click="onExportExcel()"
            >
              {{ t('documents.chrome.exportExcel') }}
            </button>
            <button
              type="button"
              class="dt-doc-list__more-item"
              role="menuitem"
              @click="onImportTrigger()"
            >
              {{ t('documents.chrome.importData') }}
            </button>
          </div>
        </div>
        <input
          ref="importInputRef"
          type="file"
          class="dt-doc-list__import-input"
          accept=".csv,.xlsx,.xls"
          tabindex="-1"
          aria-hidden="true"
          @change="onImportFileSelected"
        />
      </div>
    </div>

    <p v-if="gridNotice" class="dt-doc-list__notice">{{ gridNotice }}</p>
    <p v-if="error" class="dt-doc-list__error" role="alert">{{ error }}</p>

    <div class="dt-doc-list__grid">
      <vxe-grid
        ref="gridRef"
        :id="gridListId"
        :data="items"
        :columns="gridColumns"
        :column-config="columnConfig"
        :column-drag-config="columnDragConfig"
        :custom-config="customConfig"
        :filter-config="filterConfig"
        :floating-filter-config="floatingFilterConfig"
        :sort-config="sortConfig"
        :loading="loading"
        border
        size="small"
        height="100%"
        :row-config="{ keyField: 'id', isHover: true }"
        @checkbox-all="onCheckboxChange"
        @checkbox-change="onCheckboxChange"
        @column-dragend="syncColumnOrderFromGrid"
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
            {{ resolveActionLabel(action, t) }}
          </a>
        </template>
      </vxe-grid>
    </div>

    <footer class="dt-doc-list__pager">
      <label class="dt-doc-list__page-size" for="doc-page-size">
        {{ t('documents.chrome.pageSize') }}
        <DtSelect
          id="doc-page-size"
          :model-value="String(pageSize)"
          :options="pageSizeOptions"
          @update:model-value="
            (value) => {
              pageSize = Number(value);
              page = 1;
              load();
            }
          "
        />
      </label>
      <div class="dt-doc-list__pager-nav">
        <DtButton variant="ghost" :disabled="page <= 1" @click="page--; load()">
          {{ t('documents.chrome.prevPage') }}
        </DtButton>
        <span class="dt-doc-list__page-status">{{
          t('documents.chrome.pageStatus', {
            page,
            pages: pageCount,
            total,
          })
        }}</span>
        <DtButton
          variant="ghost"
          :disabled="page * pageSize >= total"
          @click="page++; load()"
        >
          {{ t('documents.chrome.nextPage') }}
        </DtButton>
      </div>
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
  font-size: var(--dt-text-xl);
  font-weight: var(--dt-weight-semi);
  letter-spacing: -0.02em;
}
.dt-doc-list__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}
.dt-doc-list__toolbar-main {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.dt-doc-list__grid-tools {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
}
.dt-doc-list__grid-tool {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--dt-radius-sm);
  background: transparent;
  color: var(--dt-text-secondary);
  cursor: pointer;
  transition:
    background var(--dt-duration-fast) var(--dt-ease-default),
    color var(--dt-duration-fast) var(--dt-ease-default);
}
.dt-doc-list__grid-tool:hover:not(:disabled) {
  background: var(--dt-bg-surface-hover);
  color: var(--dt-text-primary);
}
.dt-doc-list__grid-tool--active {
  color: var(--dt-accent-primary);
}
.dt-doc-list__grid-tool:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.dt-doc-list__more {
  position: relative;
}
.dt-doc-list__more-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 20;
  min-width: 148px;
  padding: var(--dt-space-xs);
  background: var(--dt-bg-elevated);
  border: 1px solid var(--dt-border-default);
  border-radius: var(--dt-radius-md);
  box-shadow: var(--dt-shadow-md, 0 8px 24px rgb(0 0 0 / 12%));
}
.dt-doc-list__more-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: var(--dt-radius-sm);
  background: transparent;
  color: var(--dt-text-primary);
  font-size: var(--dt-text-sm);
  text-align: left;
  cursor: pointer;
}
.dt-doc-list__more-item:hover {
  background: var(--dt-bg-surface-hover);
}
.dt-doc-list__import-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}
.dt-doc-list__notice {
  margin: 0;
  font-size: var(--dt-text-sm);
  color: var(--dt-text-secondary);
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
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--dt-space-md);
  align-items: center;
  padding-top: var(--dt-space-md);
  border-top: 1px solid var(--dt-border-subtle);
  font-size: var(--dt-text-sm);
  color: var(--dt-text-secondary);
}
.dt-doc-list__page-size {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
}
.dt-doc-list__page-size :deep(.dt-select) {
  width: 88px;
}
.dt-doc-list__pager-nav {
  display: inline-flex;
  align-items: center;
  gap: var(--dt-space-sm);
}
.dt-doc-list__page-status {
  min-width: 12em;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
</style>
