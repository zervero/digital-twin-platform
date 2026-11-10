import { describe, expect, it } from 'vitest';

import { createMemoryDocumentPort } from '../memory-port.js';
import { sowDeathSeed } from '../fixtures/sow-death-seed.js';

describe('createMemoryDocumentPort', () => {
  it('lists, filters, and loads one', async () => {
    const port = createMemoryDocumentPort(sowDeathSeed);
    const all = await port.loadList({ page: 1, pageSize: 20, filters: {} });
    expect(all.total).toBe(sowDeathSeed.length);

    const filtered = await port.loadList({
      page: 1,
      pageSize: 20,
      filters: { earTag: 'L20224' },
    });
    expect(filtered.total).toBe(1);
    expect(filtered.items[0]?.earTag).toBe('L20224');

    const one = await port.loadOne(String(sowDeathSeed[0]?.id));
    expect(one?.docNo).toBe('202211200003');
  });

  it('creates and updates', async () => {
    const port = createMemoryDocumentPort([]);
    const created = await port.create({
      deathDate: '2026-11-10',
      lines: [{ batch: 'B1', earTag: 'E1', deathType: '死亡', deathReason: '疾病' }],
    });
    expect(created.id).toBeTruthy();
    expect(created.docNo).not.toBe('-- --');

    const updated = await port.update(String(created.id), {
      ...created,
      remark: 'x',
    });
    expect(updated.remark).toBe('x');
  });
});
