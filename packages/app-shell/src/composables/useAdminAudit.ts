/**
 * Admin audit log — paginated list filtered by event type.
 */

import { inject, onMounted, ref, watch, type Ref } from 'vue';

import type { AuditEvent, AuditEventType } from '@dt/contracts';
import { AUDIT_EVENT_TYPES } from '@dt/contracts';

import { ApiClientKey } from '../stores/api-store.js';

export type AuditTypeFilter = 'all' | AuditEventType;

export const AUDIT_TYPE_FILTERS: readonly AuditTypeFilter[] = [
  'all',
  ...AUDIT_EVENT_TYPES,
];

export interface UseAdminAuditHandle {
  items: Ref<readonly AuditEvent[]>;
  total: Ref<number>;
  page: Ref<number>;
  pageSize: Ref<number>;
  typeFilter: Ref<AuditTypeFilter>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  refresh: () => Promise<void>;
}

export function useAdminAudit(): UseAdminAuditHandle {
  const api = inject(ApiClientKey);
  if (!api) {
    throw new Error('[useAdminAudit] ApiClient not provided. Call provideApiClient() first.');
  }

  const items = ref<readonly AuditEvent[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(20);
  const typeFilter = ref<AuditTypeFilter>('all');
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function refresh(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.listAuditEvents({
        page: page.value,
        pageSize: pageSize.value,
        type: typeFilter.value === 'all' ? undefined : typeFilter.value,
      });
      items.value = res.items;
      total.value = res.total;
      page.value = res.page;
      pageSize.value = res.pageSize;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      items.value = [];
      total.value = 0;
    } finally {
      loading.value = false;
    }
  }

  watch(typeFilter, () => {
    page.value = 1;
    void refresh();
  });

  onMounted(() => {
    void refresh();
  });

  return { items, total, page, pageSize, typeFilter, loading, error, refresh };
}
