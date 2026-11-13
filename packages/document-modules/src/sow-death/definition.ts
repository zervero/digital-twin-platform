import type { DocumentDefinition } from '@dt/document-schema';
import { assertDocumentDefinition } from '@dt/document-schema';

const A = {
  create: { id: 'create' as const, label: '新增', labelKey: 'documents.actions.create' },
  edit: { id: 'edit' as const, label: '修改', labelKey: 'documents.actions.edit' },
  delete: { id: 'delete' as const, label: '删除', labelKey: 'documents.actions.delete' },
  save: { id: 'save' as const, label: '保存', labelKey: 'documents.actions.save' },
  discard: { id: 'discard' as const, label: '撤销', labelKey: 'documents.actions.discard' },
  audit: { id: 'audit' as const, label: '审核', labelKey: 'documents.actions.audit' },
  addLine: { id: 'addLine' as const, label: '增行', labelKey: 'documents.actions.addLine' },
  removeLine: {
    id: 'removeLine' as const,
    label: '删行',
    labelKey: 'documents.actions.removeLine',
  },
};

/**
 * Sow-death–shaped demo module (SPEC 0001 / SPEC 0004).
 * Field set mirrors the 企联网 reference; not a full product port.
 */
export const sowDeathDefinition: DocumentDefinition = {
  id: 'sow-death',
  title: '母猪死亡',
  titleKey: 'documents.modules.sowDeath.title',
  titleLocales: { en: 'Sow death', 'zh-CN': '母猪死亡' },
  navIcon: 'FileText',
  navOrder: 10,
  idField: 'id',
  docNoField: 'docNo',
  status: { supportsAudit: true },
  list: {
    filters: [
      {
        key: 'deathDate',
        label: '死亡日期',
        labelKey: 'documents.modules.sowDeath.deathDate',
        editor: 'dateRange',
      },
      {
        key: 'earTag',
        label: '母猪耳号',
        labelKey: 'documents.fields.sowEarTag',
        editor: 'text',
        placeholder: '请输入耳号',
        placeholderKey: 'documents.fields.earTagPlaceholder',
      },
      {
        key: 'createdBy',
        label: '创建人',
        labelKey: 'documents.fields.createdBy',
        editor: 'select',
        options: [
          { label: '全部', labelKey: 'documents.chrome.all', value: '' },
          { label: '张新', value: '张新' },
          { label: '付礼娟', value: '付礼娟' },
        ],
      },
    ],
    columns: [
      { key: 'docNo', label: '单据号', labelKey: 'documents.fields.docNo', minWidth: 120 },
      {
        key: 'deathDate',
        label: '死亡日期',
        labelKey: 'documents.modules.sowDeath.deathDate',
        listFilter: { editor: 'dateRange' },
        minWidth: 124,
      },
      { key: 'batch', label: '母猪批次', labelKey: 'documents.fields.batch', minWidth: 100 },
      {
        key: 'earTag',
        label: '耳号',
        labelKey: 'documents.fields.earTag',
        minWidth: 100,
        link: true,
      },
      {
        key: 'individualNo',
        label: '个体号',
        labelKey: 'documents.fields.individualNo',
        minWidth: 140,
      },
      {
        key: 'building',
        label: '当前栋舍',
        labelKey: 'documents.fields.building',
        minWidth: 100,
      },
      { key: 'unit', label: '当前单元', labelKey: 'documents.fields.unit', minWidth: 120 },
      { key: 'pen', label: '当前栏位', labelKey: 'documents.fields.pen', minWidth: 100 },
      {
        key: 'pigStatus',
        label: '状态',
        labelKey: 'documents.fields.pigStatus',
        minWidth: 80,
      },
      {
        key: 'eventDate',
        label: '事件日期',
        labelKey: 'documents.fields.eventDate',
        listFilter: { editor: 'dateRange' },
        minWidth: 124,
      },
      {
        key: 'deathType',
        label: '死亡类型',
        labelKey: 'documents.modules.sowDeath.deathType',
        minWidth: 90,
      },
      {
        key: 'deathReason',
        label: '死亡原因',
        labelKey: 'documents.modules.sowDeath.deathReason',
        minWidth: 90,
      },
      {
        key: 'weightKg',
        label: '总重量(公斤)',
        labelKey: 'documents.modules.sowDeath.weightKg',
        editor: 'number',
        listFilter: { editor: 'number' },
        minWidth: 110,
      },
      {
        key: 'productionGroup',
        label: '生产组',
        labelKey: 'documents.fields.productionGroup',
        minWidth: 100,
      },
      {
        key: 'createdBy',
        label: '创建人',
        labelKey: 'documents.fields.createdBy',
        minWidth: 80,
        listFilter: {
          editor: 'select',
          options: [
            { label: '张新', value: '张新' },
            { label: '付礼娟', value: '付礼娟' },
          ],
        },
      },
      {
        key: 'createdAt',
        label: '创建时间',
        labelKey: 'documents.fields.createdAt',
        listFilter: { editor: 'dateTimeRange' },
        minWidth: 176,
      },
      {
        key: 'updatedBy',
        label: '修改人',
        labelKey: 'documents.fields.updatedBy',
        minWidth: 80,
      },
      {
        key: 'updatedAt',
        label: '修改时间',
        labelKey: 'documents.fields.updatedAt',
        listFilter: { editor: 'dateTimeRange' },
        minWidth: 176,
      },
      {
        key: 'auditedBy',
        label: '审核人',
        labelKey: 'documents.fields.auditedBy',
        minWidth: 80,
      },
      {
        key: 'auditedAt',
        label: '审核时间',
        labelKey: 'documents.fields.auditedAt',
        listFilter: { editor: 'dateTimeRange' },
        minWidth: 176,
      },
    ],
    rowActions: [
      A.edit,
      { ...A.delete, requiresExisting: true },
    ],
    toolbar: [
      A.create,
      { ...A.delete, requiresSelection: true },
      { ...A.audit, requiresSelection: true },
    ],
    pageSizes: [10, 15, 20, 50, 100],
    defaultPageSize: 20,
  },
  detail: {
    header: [
      {
        key: 'deathDate',
        label: '死亡日期',
        labelKey: 'documents.modules.sowDeath.deathDate',
        editor: 'date',
        required: true,
      },
      {
        key: 'docNo',
        label: '单据号',
        labelKey: 'documents.fields.docNo',
        editor: 'readonly',
      },
    ],
    lines: {
      minRows: 1,
      columns: [
        {
          key: 'batch',
          label: '母猪批次',
          labelKey: 'documents.fields.batch',
          editor: 'text',
          required: true,
          minWidth: 110,
        },
        {
          key: 'earTag',
          label: '耳号',
          labelKey: 'documents.fields.earTag',
          editor: 'text',
          required: true,
          minWidth: 100,
        },
        {
          key: 'individualNo',
          label: '个体号',
          labelKey: 'documents.fields.individualNo',
          editor: 'text',
          minWidth: 140,
        },
        {
          key: 'building',
          label: '当前栋舍',
          labelKey: 'documents.fields.building',
          editor: 'text',
          minWidth: 100,
        },
        {
          key: 'unit',
          label: '当前单元',
          labelKey: 'documents.fields.unit',
          editor: 'text',
          minWidth: 120,
        },
        {
          key: 'pigStatus',
          label: '状态',
          labelKey: 'documents.fields.pigStatus',
          editor: 'text',
          minWidth: 80,
        },
        {
          key: 'eventDate',
          label: '事件日期',
          labelKey: 'documents.fields.eventDate',
          editor: 'date',
          minWidth: 110,
        },
        {
          key: 'deathType',
          label: '死亡类型',
          labelKey: 'documents.modules.sowDeath.deathType',
          editor: 'select',
          required: true,
          minWidth: 100,
          options: [
            {
              label: '死亡',
              labelKey: 'documents.modules.sowDeath.options.deathType.death',
              value: '死亡',
            },
            {
              label: '淘汰',
              labelKey: 'documents.modules.sowDeath.options.deathType.cull',
              value: '淘汰',
            },
          ],
        },
        {
          key: 'deathReason',
          label: '死亡原因',
          labelKey: 'documents.modules.sowDeath.deathReason',
          editor: 'select',
          required: true,
          minWidth: 100,
          options: [
            {
              label: '疾病',
              labelKey: 'documents.modules.sowDeath.options.deathReason.disease',
              value: '疾病',
            },
            {
              label: '猝死',
              labelKey: 'documents.modules.sowDeath.options.deathReason.sudden',
              value: '猝死',
            },
            {
              label: '打架',
              labelKey: 'documents.modules.sowDeath.options.deathReason.fight',
              value: '打架',
            },
            {
              label: '消瘦',
              labelKey: 'documents.modules.sowDeath.options.deathReason.emaciation',
              value: '消瘦',
            },
            {
              label: '瘫痪',
              labelKey: 'documents.modules.sowDeath.options.deathReason.paralysis',
              value: '瘫痪',
            },
            {
              label: '中毒',
              labelKey: 'documents.modules.sowDeath.options.deathReason.poisoning',
              value: '中毒',
            },
          ],
        },
        {
          key: 'weightKg',
          label: '总重量(公斤)',
          labelKey: 'documents.modules.sowDeath.weightKg',
          editor: 'number',
          minWidth: 110,
        },
        {
          key: 'productionGroup',
          label: '生产组',
          labelKey: 'documents.fields.productionGroup',
          editor: 'text',
          minWidth: 100,
        },
      ],
    },
    footer: { remark: true, attachments: true },
    toolbar: [
      A.create,
      { ...A.save, requiresDirty: true },
      { ...A.discard, requiresDirty: true },
      { ...A.delete, requiresExisting: true },
      { ...A.audit, requiresExisting: true },
      A.addLine,
      A.removeLine,
    ],
  },
};

assertDocumentDefinition(sowDeathDefinition);
