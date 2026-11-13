import { describe, expect, it, vi } from 'vitest';

import { downloadListAsExcelCsv } from '../list-export.js';

describe('downloadListAsExcelCsv', () => {
  it('creates a download link for csv content', () => {
    const anchor = document.createElement('a');
    const click = vi.fn();
    anchor.click = click;
    const createSpy = vi
      .spyOn(document, 'createElement')
      .mockReturnValue(anchor);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    downloadListAsExcelCsv('demo', ['No', 'Name'], [['1', 'A, "quoted"']]);

    expect(createSpy).toHaveBeenCalledWith('a');
    expect(anchor.download).toBe('demo.csv');
    expect(click).toHaveBeenCalled();
  });
});
