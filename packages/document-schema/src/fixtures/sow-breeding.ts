import type { DocumentDefinition } from '../types.js';
import { assertDocumentDefinition } from '../validate.js';

/**
 * Sow-breeding (母猪配种) schema mirrored from 企联网 sow-breeding list.
 * Demo / fixture for SPEC 0001 multi-document path — not a full product port.
 */
export const sowBreedingDefinition: DocumentDefinition = {
  id: 'sow-breeding',
  title: '母猪配种',
  idField: 'id',
  docNoField: 'docNo',
  status: { supportsAudit: true },
  list: {
    filters: [
      {
        key: 'breedingDate',
        label: '配种日期',
        editor: 'dateRange',
      },
      {
        key: 'earTag',
        label: '母猪耳号',
        editor: 'text',
        placeholder: '请输入耳号',
      },
      {
        key: 'breedingOwner',
        label: '配种负责人',
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
      { key: 'breedingDate', label: '配种日期', minWidth: 110 },
      { key: 'batch', label: '母猪批次', minWidth: 100 },
      { key: 'earTag', label: '耳号', minWidth: 100, link: true },
      { key: 'individualNo', label: '个体号', minWidth: 140 },
      { key: 'productionGroup', label: '生产组', minWidth: 100 },
      { key: 'transferProductionGroup', label: '转入生产组', minWidth: 110 },
      { key: 'warehouse', label: '仓库', minWidth: 100 },
      { key: 'building', label: '当前栋舍', minWidth: 100 },
      { key: 'unit', label: '当前单元', minWidth: 120 },
      { key: 'pen', label: '当前栏位', minWidth: 100 },
      { key: 'pigStatus', label: '状态', minWidth: 80 },
      { key: 'eventDate', label: '事件日期', minWidth: 110 },
      { key: 'transferBatch', label: '转入批次', minWidth: 100 },
      { key: 'transferBuilding', label: '转入栋舍', minWidth: 100 },
      { key: 'transferUnit', label: '转入单元', minWidth: 110 },
      { key: 'transferPen', label: '转入栏位', minWidth: 100 },
      { key: 'breedingMethod', label: '配种方式', minWidth: 100 },
      { key: 'boarEarTag', label: '首配公猪', minWidth: 100 },
      { key: 'boarScore', label: '首配评分', minWidth: 90 },
      { key: 'semenDose', label: '首配精液用量', minWidth: 120 },
      { key: 'semenProduct', label: '首配商品', minWidth: 100 },
      { key: 'semenLot', label: '首配精液批号', minWidth: 120 },
      { key: 'breedingOwner', label: '配种负责人', minWidth: 100 },
      { key: 'remark', label: '备注', minWidth: 120 },
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
      {
        key: 'breedingDate',
        label: '配种日期',
        editor: 'date',
        required: true,
      },
      {
        key: 'breedingOwner',
        label: '配种负责人',
        editor: 'text',
        required: true,
      },
      { key: 'warehouse', label: '仓库', editor: 'text' },
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
        { key: 'parity', label: '当前胎次', editor: 'number', minWidth: 90 },
        { key: 'building', label: '当前栋舍', editor: 'text', minWidth: 100 },
        { key: 'unit', label: '当前单元', editor: 'text', minWidth: 120 },
        { key: 'pigStatus', label: '状态', editor: 'text', minWidth: 80 },
        { key: 'eventDate', label: '事件日期', editor: 'date', minWidth: 110 },
        {
          key: 'transferBatch',
          label: '转入批次',
          editor: 'text',
          required: true,
          minWidth: 100,
        },
        {
          key: 'breedingMethod',
          label: '配种方式',
          editor: 'select',
          required: true,
          minWidth: 100,
          options: [
            { label: '人工授精', value: '人工授精' },
            { label: '本交', value: '本交' },
          ],
        },
        { key: 'boarEarTag', label: '首配公猪', editor: 'text', minWidth: 100 },
        {
          key: 'semenProduct',
          label: '首配商品',
          editor: 'text',
          minWidth: 100,
        },
        {
          key: 'semenLot',
          label: '首配精液批号',
          editor: 'text',
          minWidth: 120,
        },
        { key: 'boarScore', label: '首配评分', editor: 'number', minWidth: 90 },
        {
          key: 'semenDose',
          label: '首配精液用量',
          editor: 'number',
          minWidth: 120,
        },
        {
          key: 'productionGroup',
          label: '生产组',
          editor: 'text',
          minWidth: 100,
        },
        {
          key: 'transferProductionGroup',
          label: '转入生产组',
          editor: 'text',
          minWidth: 110,
        },
        { key: 'lineRemark', label: '备注', editor: 'text', minWidth: 120 },
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

assertDocumentDefinition(sowBreedingDefinition);
