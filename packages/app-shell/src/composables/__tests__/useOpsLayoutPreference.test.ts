import { describe, expect, it, beforeEach } from 'vitest';
import { nextTick } from 'vue';

import {
  OPS_LAYOUT_STORAGE_KEY,
  useOpsLayoutPreference,
} from '../useOpsLayoutPreference.js';

describe('useOpsLayoutPreference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults both rails to open when nothing is stored', () => {
    const { sidebarOpen, detailOpen } = useOpsLayoutPreference();
    expect(sidebarOpen.value).toBe(true);
    expect(detailOpen.value).toBe(true);
  });

  it(`hydrates from localStorage key ${OPS_LAYOUT_STORAGE_KEY}`, () => {
    localStorage.setItem(
      OPS_LAYOUT_STORAGE_KEY,
      JSON.stringify({ sidebarOpen: false, detailOpen: false }),
    );
    const { sidebarOpen, detailOpen } = useOpsLayoutPreference();
    expect(sidebarOpen.value).toBe(false);
    expect(detailOpen.value).toBe(false);
  });

  it('writes updates back to localStorage', async () => {
    const { sidebarOpen, detailOpen } = useOpsLayoutPreference();
    sidebarOpen.value = false;
    detailOpen.value = false;
    await nextTick();

    expect(JSON.parse(localStorage.getItem(OPS_LAYOUT_STORAGE_KEY)!)).toEqual({
      sidebarOpen: false,
      detailOpen: false,
    });
  });
});
