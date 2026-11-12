import type { DocumentRecord } from '@dt/document-schema';

const baseSowDeathSeed: DocumentRecord[] = [
  {
    id: '2308311419470000153',
    docNo: '202211200003',
    deathDate: '2022-11-20',
    batch: 'p8001',
    earTag: 'L20224',
    individualNo: 'LLZZ00220L20224',
    building: '配怀一舍',
    unit: '',
    pen: '',
    pigStatus: '妊娠',
    eventDate: '2022-07-04',
    deathType: '死亡',
    deathReason: '疾病',
    weightKg: 0,
    productionGroup: '配怀一组',
    createdBy: '张新',
    createdAt: '2023-08-31 14:19:47',
    updatedBy: '张新',
    updatedAt: '2023-08-31 14:19:47',
    auditedBy: '',
    auditedAt: '',
    audited: false,
    remark: '',
    lines: [
      {
        batch: 'p8001',
        earTag: 'L20224',
        individualNo: 'LLZZ00220L20224',
        building: '配怀一舍',
        unit: '',
        pigStatus: '妊娠',
        eventDate: '2022-07-04',
        deathType: '死亡',
        deathReason: '疾病',
        weightKg: 0,
        productionGroup: '配怀一组',
      },
    ],
  },
  {
    id: '2308301452290000101',
    docNo: '202211200001',
    deathDate: '2022-11-20',
    batch: 'DP0011',
    earTag: 'L20223',
    individualNo: 'LLZZ00220L20223',
    building: '配怀一舍',
    unit: '',
    pen: '',
    pigStatus: '断奶',
    eventDate: '2022-06-12',
    deathType: '死亡',
    deathReason: '疾病',
    weightKg: 0,
    productionGroup: '配怀一组',
    createdBy: '张新',
    createdAt: '2023-08-30 14:52:29',
    updatedBy: '张新',
    updatedAt: '2023-08-31 14:02:22',
    auditedBy: '',
    auditedAt: '',
    audited: false,
    remark: '',
    lines: [
      {
        batch: 'DP0011',
        earTag: 'L20223',
        individualNo: 'LLZZ00220L20223',
        building: '配怀一舍',
        unit: '',
        pigStatus: '断奶',
        eventDate: '2022-06-12',
        deathType: '死亡',
        deathReason: '疾病',
        weightKg: 0,
        productionGroup: '配怀一组',
      },
      {
        batch: 'DP0011',
        earTag: 'L20222',
        individualNo: 'LLZZ00220L20222',
        building: '配怀一舍',
        unit: '',
        pigStatus: '断奶',
        eventDate: '2022-10-01',
        deathType: '死亡',
        deathReason: '疾病',
        weightKg: 0,
        productionGroup: '配怀一组',
      },
    ],
  },
  {
    id: '2306151700000000200',
    docNo: '202301260001',
    deathDate: '2022-08-26',
    batch: 'P001',
    earTag: 'YY1132',
    individualNo: 'YYZZ00221YY1132',
    building: '配怀一舍',
    unit: '配怀一舍1单元',
    pen: '',
    pigStatus: '妊娠',
    eventDate: '2022-01-13',
    deathType: '死亡',
    deathReason: '中毒',
    weightKg: 66,
    productionGroup: '配怀一组',
    createdBy: '付礼娟',
    createdAt: '2023-06-15 17:00:00',
    updatedBy: '付礼娟',
    updatedAt: '2023-06-15 17:00:00',
    auditedBy: '',
    auditedAt: '',
    audited: false,
    remark: '',
    lines: [
      {
        batch: 'P001',
        earTag: 'YY1132',
        individualNo: 'YYZZ00221YY1132',
        building: '配怀一舍',
        unit: '配怀一舍1单元',
        pigStatus: '妊娠',
        eventDate: '2022-01-13',
        deathType: '死亡',
        deathReason: '中毒',
        weightKg: 66,
        productionGroup: '配怀一组',
      },
    ],
  },
];

const demoBatches = ['p8001', 'DP0011', 'P001', 'DP0020', 'p8002'] as const;
const demoStatuses = ['妊娠', '断奶'] as const;
const demoReasons = ['疾病', '中毒'] as const;
const demoCreators = ['张新', '付礼娟'] as const;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Extra list rows for paging / filter demos (stored field values stay literal). */
function buildSowDeathDemoExtras(count: number): DocumentRecord[] {
  return Array.from({ length: count }, (_, i) => {
    const seq = i + 1;
    const month = (seq % 12) + 1;
    const day = (seq % 27) + 1;
    const deathDate = `2022-${pad2(month)}-${pad2(day)}`;
    const batch = demoBatches[seq % demoBatches.length];
    const earTag = `L20${200 + seq}`;
    const individualNo = `LLZZ00220${earTag}`;
    const pigStatus = demoStatuses[seq % demoStatuses.length];
    const deathReason = demoReasons[seq % demoReasons.length];
    const createdBy = demoCreators[seq % demoCreators.length];
    const weightKg = deathReason === '中毒' ? 50 + (seq % 30) : 0;
    const docNo = `20221120${String(1000 + seq).slice(-4)}`;
    const id = `demo-sow-death-${String(seq).padStart(4, '0')}`;
    const createdAt = `2023-09-${pad2((seq % 28) + 1)} 10:${pad2(seq % 60)}:00`;

    return {
      id,
      docNo,
      deathDate,
      batch,
      earTag,
      individualNo,
      building: '配怀一舍',
      unit: seq % 3 === 0 ? '配怀一舍1单元' : '',
      pen: '',
      pigStatus,
      eventDate: `2022-${pad2(((month + 5) % 12) + 1)}-${pad2(day)}`,
      deathType: '死亡',
      deathReason,
      weightKg,
      productionGroup: '配怀一组',
      createdBy,
      createdAt,
      updatedBy: createdBy,
      updatedAt: createdAt,
      auditedBy: '',
      auditedAt: '',
      audited: false,
      remark: '',
      lines: [
        {
          batch,
          earTag,
          individualNo,
          building: '配怀一舍',
          unit: seq % 3 === 0 ? '配怀一舍1单元' : '',
          pigStatus,
          eventDate: `2022-${pad2(((month + 5) % 12) + 1)}-${pad2(day)}`,
          deathType: '死亡',
          deathReason,
          weightKg,
          productionGroup: '配怀一组',
        },
      ],
    };
  });
}

/** Flattened list/detail seed inspired by the 企联网 sow-death sample. */
export const sowDeathSeed: DocumentRecord[] = [
  ...baseSowDeathSeed,
  ...buildSowDeathDemoExtras(20),
];
