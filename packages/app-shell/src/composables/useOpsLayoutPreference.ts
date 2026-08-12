/**
 * Persist Ops left/right push-drawer open state in localStorage so a
 * reload keeps the operator's layout. Defaults both rails to open.
 */

import { ref, watch, type Ref } from 'vue';

export const OPS_LAYOUT_STORAGE_KEY = 'dt.ops.layout.v1';

interface OpsLayoutPersisted {
  sidebarOpen?: boolean;
  detailOpen?: boolean;
}

function readPersisted(): OpsLayoutPersisted | null {
  try {
    const raw = localStorage.getItem(OPS_LAYOUT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OpsLayoutPersisted;
  } catch {
    return null;
  }
}

function writePersisted(value: OpsLayoutPersisted): void {
  try {
    localStorage.setItem(OPS_LAYOUT_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Quota / private mode — layout still works in-memory.
  }
}

export function useOpsLayoutPreference(): {
  sidebarOpen: Ref<boolean>;
  detailOpen: Ref<boolean>;
} {
  const saved = readPersisted();
  const sidebarOpen = ref(saved?.sidebarOpen ?? true);
  const detailOpen = ref(saved?.detailOpen ?? true);

  watch([sidebarOpen, detailOpen], ([nextSidebar, nextDetail]) => {
    writePersisted({ sidebarOpen: nextSidebar, detailOpen: nextDetail });
  });

  return { sidebarOpen, detailOpen };
}
