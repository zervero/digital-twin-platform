import { describe, expect, it } from 'vitest';

import { createMemoryDocumentPort } from '../memory-port.js';
import { sampleSeed } from './helpers/sample.js';

describe('createMemoryDocumentPort', () => {
  it('lists, filters, and loads one', async () => {
    const port = createMemoryDocumentPort(sampleSeed);
    const all = await port.loadList({ page: 1, pageSize: 20, filters: {} });
    expect(all.total).toBe(sampleSeed.length);

    const filtered = await port.loadList({
      page: 1,
      pageSize: 20,
      filters: { name: 'Alpha' },
    });
    expect(filtered.total).toBe(1);
    expect(filtered.items[0]?.name).toBe('Alpha');

    const one = await port.loadOne(String(sampleSeed[0]?.id));
    expect(one?.docNo).toBe('S-001');
  });

  it('creates and updates', async () => {
    const port = createMemoryDocumentPort([]);
    const created = await port.create({
      name: 'New',
      lines: [{ item: 'x' }],
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
