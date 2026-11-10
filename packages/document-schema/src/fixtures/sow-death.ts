import type { DocumentDefinition } from '../types.js';
import { assertDocumentDefinition } from '../validate.js';

/**
 * Sow-death–shaped fixture proving the schema path (SPEC 0001).
 * Field set mirrors the 企联网 reference; not a full product port.
 */
export const sowDeathDefinition: DocumentDefinition = {
  id: 'sow-death',
  title: '母猪死亡',
  idField: 'id',
  docNoField: 'docNo',
  status: { supportsAudit: true },
  list: {
    filters: [
      {
        key: 'deathDate',
        label: '死亡日期',
        editor: 'dateRange',
      },
      {
        key: 'earTag',
        label: '母猪耳号',
        editor: 'text',
        placeholder: '请输入耳号',
      },
      {
        key: 'createdBy',
        label: '创建人',
        editor: 'select',
        options: [
          { label: '全部', value: '' },
          { label: '张新', value: '张新' },
          { label: '付礼娟', value: '付礼娟' },
        ],
      },
    ],
    columns: [
      { key: 'docNo', label: '单据号', minWidth: 120 },
      { key: 'deathDate', label: '死亡日期', minWidth: 110 },
      { key: 'batch', label: '母猪批次', minWidth: 100 },
      { key: 'earTag', label: '耳号', minWidth: 100, link: true },
      { key: 'individualNo', label: '个体号', minWidth: 140 },
      { key: 'building', label: '当前栋舍', minWidth: 100 },
      { key: 'unit', label: '当前单元', minWidth: 120 },
      { key: 'pen', label: '当前栏位', minWidth: 100 },
      { key: 'pigStatus', label: '状态', minWidth: 80 },
      { key: 'eventDate', label: '事件日期', minWidth: 110 },
      { key: 'deathType', label: '死亡类型', minWidth: 90 },
      { key: 'deathReason', label: '死亡原因', minWidth: 90 },
      { key: 'weightKg', label: '总重量(公斤)', minWidth: 110 },
      { key: 'productionGroup', label: '生产组', minWidth: 100 },
      { key: 'createdBy', label: '创建人', minWidth: 80 },
      { key: 'createdAt', label: '创建时间', minWidth: 150 },
      { key: 'updatedBy', label: '修改人', minWidth: 80 },
      { key: 'updatedAt', label: '修改时间', minWidth: 150 },
      { key: 'auditedBy', label: '审核人', minWidth: 80 },
      { key: 'auditedAt', label: '审核时间', minWidth: 150 },
    ],
    rowActions: [
      { id: 'edit', label: '修改' },
      { id: 'delete', label: '删除', requiresExisting: true },
    ],
    toolbar: [
      { id: 'create', label: '新增' },
      { id: 'delete', label: '删除', requiresSelection: true },
      { id: 'audit', label: '审核', requiresSelection: true },
    ],
    pageSizes: [10, 15, 20, 50, 100],
    defaultPageSize: 20,
  },
  detail: {
    header: [
      { key: 'deathDate', label: '死亡日期', editor: 'date', required: true },
      { key: 'docNo', label: '单据号', editor: 'readonly' },
    ],
    lines: {
      minRows: 1,
      columns: [
        {
          key: 'batch',
          label: '母猪批次',
          editor: 'text',
          required: true,
          minWidth: 110,
        },
        {
          key: 'earTag',
          label: '耳号',
          editor: 'text',
          required: true,
          minWidth: 100,
        },
        { key: 'individualNo', label: '个体号', editor: 'text', minWidth: 140 },
        { key: 'building', label: '当前栋舍', editor: 'text', minWidth: 100 },
        { key: 'unit', label: '当前单元', editor: 'text', minWidth: 120 },
        { key: 'pigStatus', label: '状态', editor: 'text', minWidth: 80 },
        { key: 'eventDate', label: '事件日期', editor: 'date', minWidth: 110 },
        {
          key: 'deathType',
          label: '死亡类型',
          editor: 'select',
          required: true,
          minWidth: 100,
          options: [
            { label: '死亡', value: '死亡' },
            { label: '淘汰', value: '淘汰' },
          ],
        },
        {
          key: 'deathReason',
          label: '死亡原因',
          editor: 'select',
          required: true,
          minWidth: 100,
          options: [
            { label: '疾病', value: '疾病' },
            { label: '猝死', value: '猝死' },
            { label: '打架', value: '打架' },
            { label: '消瘦', value: '消瘦' },
            { label: '瘫痪', value: '瘫痪' },
            { label: '中毒', value: '中毒' },
          ],
        },
        { key: 'weightKg', label: '总重量(公斤)', editor: 'number', minWidth: 110 },
        {
          key: 'productionGroup',
          label: '生产组',
          editor: 'text',
          minWidth: 100,
        },
      ],
    },
    footer: { remark: true, attachments: true },
    toolbar: [
      { id: 'create', label: '新增' },
      { id: 'save', label: '保存', requiresDirty: true },
      { id: 'discard', label: '撤销', requiresDirty: true },
      { id: 'delete', label: '删除', requiresExisting: true },
      { id: 'audit', label: '审核', requiresExisting: true },
      { id: 'addLine', label: '增行' },
      { id: 'removeLine', label: '删行' },
    ],
  },
};

assertDocumentDefinition(sowDeathDefinition);
