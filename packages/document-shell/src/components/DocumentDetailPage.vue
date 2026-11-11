<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import type {
  DocumentDefinition,
  DocumentLineRecord,
  DocumentRecord,
} from '@dt/document-schema';
import {
  cloneDocument,
  isDocumentDirty,
  snapshotDocument,
  validateDocumentRecord,
} from '@dt/document-schema';
import { DtButton } from '@dt/ui-kit';

import type { DocumentDataPort } from '../ports.js';

const props = defineProps<{
  definition: DocumentDefinition;
  port: DocumentDataPort;
  basePath: string;
  /** Undefined / empty => create mode */
  documentId?: string;
}>();

const router = useRouter();

const record = ref<DocumentRecord>({ lines: [] });
const baseline = ref('');
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const selectedLineIndexes = ref<number[]>([]);
const attachmentNames = ref<string[]>([]);

const isCreate = computed(() => !props.documentId);
const dirty = computed(() => isDocumentDirty(baseline.value, record.value));

const lineColumns = computed(() =>
  props.definition.detail.lines.columns.map((col) => ({
    field: col.key,
    title: col.required ? `* ${col.label}` : col.label,
    minWidth: col.minWidth ?? col.width ?? 100,
    editRender:
      col.editor && col.editor !== 'readonly'
        ? {
            name: col.editor === 'select' ? 'VxeSelect' : col.editor === 'number' ? 'VxeNumberInput' : 'VxeInput',
            options: col.options?.map((o) => ({ label: o.label, value: o.value })),
            props:
              col.editor === 'date'
                ? { type: 'date' }
                : col.editor === 'number'
                  ? { type: 'number' }
                  : undefined,
          }
        : undefined,
  })),
);

function emptyLine(): DocumentLineRecord {
  const line: DocumentLineRecord = {};
  for (const col of props.definition.detail.lines.columns) {
    (line as Record<string, unknown>)[col.key] = col.editor === 'number' ? 0 : '';
  }
  return line;
}

function emptyRecord(): DocumentRecord {
  const today = new Date().toISOString().slice(0, 10);
  const header: Record<string, unknown> = {
    docNo: '-- --',
    remark: '',
    audited: false,
    lines: Array.from(
      { length: Math.max(props.definition.detail.lines.minRows ?? 1, 1) },
      () => emptyLine(),
    ),
  };
  for (const field of props.definition.detail.header) {
    if (field.key === 'docNo') continue;
    header[field.key] =
      field.editor === 'date' ? today : field.editor === 'number' ? 0 : '';
  }
  return header as DocumentRecord;
}

function captureBaseline(doc: DocumentRecord) {
  record.value = cloneDocument(doc);
  baseline.value = snapshotDocument(record.value);
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    if (!props.documentId) {
      captureBaseline(emptyRecord());
      attachmentNames.value = [];
      return;
    }
    const doc = await props.port.loadOne(props.documentId);
    if (!doc) {
      error.value = '单据不存在';
      captureBaseline(emptyRecord());
      return;
    }
    const withLines =
      doc.lines?.length > 0 ? doc : { ...doc, lines: [emptyLine()] };
    captureBaseline(withLines);
    if (props.port.listAttachments) {
      const files = await props.port.listAttachments(props.documentId);
      attachmentNames.value = files.map((f) => f.name);
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

function setHeader(key: string, value: unknown) {
  record.value = { ...record.value, [key]: value };
}

async function onSave() {
  const issues = validateDocumentRecord(props.definition, record.value);
  if (issues.length) {
    error.value = issues.map((i) => i.message).join('；');
    return;
  }
  saving.value = true;
  error.value = null;
  try {
    if (isCreate.value) {
      const created = await props.port.create(record.value);
      captureBaseline(created);
      void router.replace(`${props.basePath}/detail/${created.id}`);
    } else if (props.documentId) {
      const updated = await props.port.update(props.documentId, record.value);
      captureBaseline(updated);
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    saving.value = false;
  }
}

function onDiscard() {
  record.value = cloneDocument(JSON.parse(baseline.value) as DocumentRecord);
  error.value = null;
}

async function onDelete() {
  if (!props.documentId) return;
  await props.port.remove([props.documentId]);
  void router.push(props.basePath);
}

async function onAudit() {
  if (!props.documentId || !props.port.audit) return;
  await props.port.audit([props.documentId]);
  await load();
}

function onCreateNav() {
  void router.push(`${props.basePath}/detail`);
}

function addLine() {
  record.value = {
    ...record.value,
    lines: [...record.value.lines, emptyLine()],
  };
}

function removeLines() {
  if (!selectedLineIndexes.value.length) return;
  const remove = new Set(selectedLineIndexes.value);
  record.value = {
    ...record.value,
    lines: record.value.lines.filter((_, idx) => !remove.has(idx)),
  };
  selectedLineIndexes.value = [];
}

function onLineCheckbox({
  records,
}: {
  records: DocumentLineRecord[];
}) {
  selectedLineIndexes.value = records
    .map((line) => record.value.lines.indexOf(line))
    .filter((i) => i >= 0);
}

watch(
  () => props.documentId,
  () => {
    void load();
  },
);

onMounted(() => {
  void load();
});
</script>

<template>
  <div
    class="dt-document-island dt-doc-detail"
    data-testid="document-detail"
    :data-dirty="dirty ? '1' : '0'"
  >
    <div class="dt-doc-detail__toolbar">
      <DtButton variant="primary" @click="onCreateNav">新增</DtButton>
      <DtButton
        data-testid="doc-save"
        variant="primary"
        :disabled="!dirty || saving || loading"
        @click="onSave"
      >
        保存
      </DtButton>
      <DtButton
        data-testid="doc-discard"
        :disabled="!dirty || loading"
        @click="onDiscard"
      >
        撤销
      </DtButton>
      <DtButton :disabled="isCreate || loading" variant="danger" @click="onDelete">
        删除
      </DtButton>
      <DtButton
        v-if="definition.status?.supportsAudit"
        :disabled="isCreate || loading || Boolean(record.audited)"
        @click="onAudit"
      >
        审核
      </DtButton>
      <DtButton variant="ghost" @click="router.push(basePath)">返回列表</DtButton>
    </div>

    <p v-if="error" class="dt-doc-detail__error" role="alert">{{ error }}</p>

    <section class="dt-doc-detail__header">
      <div
        v-for="field in definition.detail.header"
        :key="field.key"
        class="dt-doc-detail__field"
      >
        <label>
          <span v-if="field.required" class="dt-doc-detail__req">*</span>
          {{ field.label }}
        </label>
        <input
          v-if="field.editor === 'date'"
          :value="String(record[field.key] ?? '')"
          type="date"
          :data-testid="`header-${field.key}`"
          @input="
            setHeader(
              field.key,
              ($event.target as HTMLInputElement).value,
            )
          "
        />
        <input
          v-else
          :value="String(record[field.key] ?? '')"
          type="text"
          :readonly="field.editor === 'readonly'"
          :data-testid="`header-${field.key}`"
          @input="
            setHeader(
              field.key,
              ($event.target as HTMLInputElement).value,
            )
          "
        />
      </div>
    </section>

    <div class="dt-doc-detail__grid">
      <vxe-grid
        :data="record.lines"
        :columns="[
          { type: 'checkbox', width: 48 },
          { type: 'seq', title: '序号', width: 60 },
          ...lineColumns,
        ]"
        :loading="loading"
        border
        size="small"
        height="320"
        :edit-config="{ trigger: 'click', mode: 'cell' }"
        @checkbox-all="onLineCheckbox"
        @checkbox-change="onLineCheckbox"
        @edit-closed="record = { ...record, lines: [...record.lines] }"
      />
    </div>

    <div class="dt-doc-detail__line-actions">
      <button type="button" class="dt-doc-link" @click="addLine">+ 增行</button>
      <button type="button" class="dt-doc-link" @click="removeLines">- 删行</button>
    </div>

    <section
      v-if="definition.detail.footer?.remark"
      class="dt-doc-detail__remark"
    >
      <label for="doc-remark">备注</label>
      <textarea
        id="doc-remark"
        :value="String(record.remark ?? '')"
        rows="3"
        placeholder="请输入备注信息"
        @input="
          setHeader('remark', ($event.target as HTMLTextAreaElement).value)
        "
      />
    </section>

    <section
      v-if="definition.detail.footer?.attachments"
      class="dt-doc-detail__attachments"
    >
      <span>附件管理</span>
      <span class="dt-doc-detail__attach-hint">
        {{
          attachmentNames.length
            ? attachmentNames.join(', ')
            : '（V1 占位：无附件）'
        }}
      </span>
    </section>
  </div>
</template>

<style scoped>
.dt-doc-detail {
  padding: var(--dt-space-lg, 16px);
  gap: var(--dt-space-md, 12px);
}
.dt-doc-detail__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.dt-doc-detail__header {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.dt-doc-detail__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 180px;
}
.dt-doc-detail__field input {
  border: 1px solid var(--dt-border-default, #d0d5dd);
  border-radius: 4px;
  padding: 6px 8px;
  font: inherit;
}
.dt-doc-detail__req {
  color: var(--dt-accent-danger, #d92d20);
  margin-right: 2px;
}
.dt-doc-detail__line-actions {
  display: flex;
  gap: 16px;
}
.dt-doc-detail__line-actions button {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
}
.dt-doc-detail__remark {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dt-doc-detail__remark textarea {
  border: 1px solid var(--dt-border-default, #d0d5dd);
  border-radius: 4px;
  padding: 8px;
  font: inherit;
  resize: vertical;
}
.dt-doc-detail__attachments {
  display: flex;
  gap: 8px;
  font-size: 13px;
  color: var(--dt-accent-primary, #4f8fff);
}
.dt-doc-detail__attach-hint {
  color: var(--dt-text-secondary, #667085);
}
.dt-doc-detail__error {
  color: var(--dt-accent-danger, #d92d20);
}
</style>
