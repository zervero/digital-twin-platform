<script setup lang="ts">
/**
 * Ops right push-drawer for the selected device. Open state is owned by
 * the workspace via `v-model:open` so the grid column can collapse.
 * KPI values are mocked until a telemetry API lands — see TODO(telemetry).
 * Device actions (V4) are gated on command:send and echo-accepted by BFF.
 */
import { computed, inject, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

import type { Device, DigitalTwinCommand } from '@dt/contracts';
import { useI18n } from '@dt/i18n';
import {
  DtButton,
  DtEmptyState,
  DtIcon,
  DtPanel,
  DtStatCard,
  DtStatusBadge,
  DtTabs,
} from '@dt/ui-kit';

import { usePermission } from '../composables/usePermission.js';
import { ApiClientKey } from '../stores/api-store.js';
import { useAuthStore } from '../stores/auth-store.js';
import { useDeviceStore } from '../stores/device-store.js';

const open = defineModel<boolean>('open', { default: true });

const { t } = useI18n();

const deviceStore = useDeviceStore();
const { selectedDevice } = storeToRefs(deviceStore);

const canSend = usePermission('command:send');
const auth = useAuthStore();
const api = inject(ApiClientKey)!;

const busyType = ref<string | null>(null);
const actionMessage = ref<string | null>(null);
const actionError = ref<string | null>(null);

const canAcknowledge = computed(() => {
  const s = selectedDevice.value?.status;
  return s === 'alarm' || s === 'warning';
});

type DeviceActionType = Extract<
  DigitalTwinCommand['type'],
  'acknowledge-alarm' | 'reset-device' | 'request-maintenance'
>;

async function runAction(type: DeviceActionType): Promise<void> {
  const device = selectedDevice.value;
  const tenantId =
    auth.state.kind === 'authenticated' ? auth.state.session.tenantId : null;
  if (!device || !tenantId || !canSend.value) return;
  const deviceId = device.id;
  busyType.value = type;
  actionError.value = null;
  actionMessage.value = null;
  try {
    const res = await api.sendCommand({
      id: crypto.randomUUID(),
      tenantId,
      type,
      deviceId,
    });
    if (selectedDevice.value?.id !== deviceId) return;
    actionMessage.value = t('device.drawer.actions.accepted', {
      id: res.commandId,
    });
  } catch (err) {
    if (selectedDevice.value?.id !== deviceId) return;
    actionError.value =
      err instanceof Error ? err.message : t('device.drawer.actions.failed');
  } finally {
    if (busyType.value === type) {
      busyType.value = null;
    }
  }
}

const activeTab = ref('overview');

watch(selectedDevice, (device) => {
  activeTab.value = 'overview';
  actionMessage.value = null;
  actionError.value = null;
  // Selecting a device re-opens the drawer so context is never hidden.
  if (device) open.value = true;
});

function collapse(): void {
  open.value = false;
}

const tabs = computed(() => [
  { id: 'overview', label: t('device.drawer.tabs.overview') },
  { id: 'runtime', label: t('device.drawer.tabs.runtime') },
  { id: 'alarms', label: t('device.drawer.tabs.alarms') },
  { id: 'maintenance', label: t('device.drawer.tabs.maintenance') },
  { id: 'docs', label: t('device.drawer.tabs.docs') },
]);

type TelemetryRow = { key: string; label: string; value: string };

function telemetryRows(device: Device): TelemetryRow[] {
  const located = device as Device & { line?: string; area?: string };
  const rows: TelemetryRow[] = [
    { key: 'id', label: t('device.drawer.telemetry.id'), value: device.id },
    { key: 'name', label: t('device.drawer.telemetry.name'), value: device.name },
    { key: 'status', label: t('device.drawer.telemetry.status'), value: device.status },
    {
      key: 'sceneNode',
      label: t('device.drawer.telemetry.sceneNode'),
      value: device.sceneNodeId,
    },
    {
      key: 'updatedAt',
      label: t('device.drawer.telemetry.updatedAt'),
      value: device.updatedAt,
    },
    {
      key: 'tenant',
      label: t('device.drawer.telemetry.tenant'),
      value: device.tenantId,
    },
  ];
  if (located.line) {
    rows.push({
      key: 'line',
      label: t('device.drawer.telemetry.line'),
      value: located.line,
    });
  }
  if (located.area) {
    rows.push({
      key: 'area',
      label: t('device.drawer.telemetry.area'),
      value: located.area,
    });
  }
  return rows;
}

const rows = computed(() =>
  selectedDevice.value ? telemetryRows(selectedDevice.value) : [],
);

// TODO(telemetry): replace mock KPIs with live metrics from the telemetry API.
const mockKpis = computed(() => {
  const status = selectedDevice.value?.status ?? 'offline';
  return [
    {
      label: t('device.drawer.kpi.uptime'),
      value: status === 'offline' ? '—' : '98.2%',
      hint: '24h',
      trend: status === 'alarm' ? ('down' as const) : ('up' as const),
      trendLabel: status === 'alarm' ? '-1.4%' : '+0.3%',
    },
    {
      label: t('device.drawer.kpi.throughput'),
      value: status === 'offline' ? '0' : '142',
      hint: 'pcs/h',
      trend: 'neutral' as const,
      trendLabel: '±0',
    },
    {
      label: t('device.drawer.kpi.temp'),
      value: status === 'offline' ? '—' : status === 'alarm' ? '78°C' : '42°C',
      hint: '°C',
      trend:
        status === 'alarm' || status === 'warning'
          ? ('up' as const)
          : ('neutral' as const),
      trendLabel: status === 'alarm' ? '+12°C' : 'stable',
    },
    {
      label: t('device.drawer.kpi.load'),
      value: status === 'offline' ? '0%' : '64%',
      hint: '%',
      trend: 'neutral' as const,
    },
  ];
});
</script>

<template>
  <aside
    id="ops-detail-drawer"
    class="device-drawer dt-border-l-subtle dt-bg-elevated dt-min-h-0 dt-min-w-0 dt-h-full dt-flex dt-flex-col"
    :class="{ 'is-collapsed': !open }"
    :aria-label="t('shell.detailDrawer.ariaLabel')"
    :aria-hidden="!open"
  >
    <div
      class="device-drawer__body dt-flex dt-flex-col dt-gap-xl dt-p-md dt-overflow-auto dt-min-h-0 dt-flex-1"
    >
      <DtEmptyState
        v-if="!selectedDevice"
        :title="t('device.drawer.emptyTitle')"
        :description="t('device.drawer.emptyDescription')"
      />
      <template v-else>
        <header class="dt-flex dt-items-start dt-justify-between dt-gap-md">
          <div class="device-drawer__title-block dt-min-w-0 dt-flex dt-flex-col">
            <h2 class="dt-m-0 dt-text-md dt-font-semi dt-text-primary dt-truncate">
              {{ selectedDevice.name }}
            </h2>
            <p class="dt-m-0 dt-font-mono dt-text-xs dt-text-muted dt-truncate">
              {{ selectedDevice.id }}
            </p>
          </div>
          <DtStatusBadge :status="selectedDevice.status" />
        </header>

        <DtTabs v-model="activeTab" :tabs="tabs">
          <template v-if="activeTab === 'overview'">
            <div class="device-drawer__kpis dt-gap-md dt-mb-xl">
              <DtStatCard
                v-for="kpi in mockKpis"
                :key="kpi.label"
                :label="kpi.label"
                :value="kpi.value"
                :hint="kpi.hint"
                :trend="kpi.trend"
                :trend-label="kpi.trendLabel"
              />
            </div>
            <DtPanel :title="t('device.drawer.telemetry.title')" density="compact">
              <dl class="dt-m-0 dt-flex dt-flex-col dt-gap-sm">
                <div
                  v-for="row in rows"
                  :key="row.key"
                  class="device-drawer__telemetry-row dt-gap-md dt-items-baseline"
                >
                  <dt class="dt-m-0 dt-text-secondary dt-text-xs">{{ row.label }}</dt>
                  <dd class="dt-m-0 dt-text-primary dt-text-sm dt-font-mono dt-truncate">
                    {{ row.value }}
                  </dd>
                </div>
              </dl>
            </DtPanel>
            <section
              class="dt-flex dt-flex-col dt-gap-md dt-mt-xl"
              :aria-label="t('device.drawer.actions.title')"
            >
              <h3 class="dt-m-0 dt-text-sm dt-font-semi dt-text-primary">
                {{ t('device.drawer.actions.title') }}
              </h3>
              <p v-if="!canSend" class="dt-m-0 dt-text-sm dt-text-muted">
                {{ t('device.drawer.actions.readOnly') }}
              </p>
              <div v-else class="dt-flex dt-flex-wrap dt-gap-sm">
                <DtButton
                  variant="primary"
                  :disabled="!canAcknowledge || busyType !== null"
                  :aria-busy="busyType === 'acknowledge-alarm' || undefined"
                  @click="runAction('acknowledge-alarm')"
                >
                  {{ t('device.drawer.actions.acknowledge') }}
                </DtButton>
                <DtButton
                  variant="default"
                  :disabled="busyType !== null"
                  :aria-busy="busyType === 'reset-device' || undefined"
                  @click="runAction('reset-device')"
                >
                  {{ t('device.drawer.actions.reset') }}
                </DtButton>
                <DtButton
                  variant="default"
                  :disabled="busyType !== null"
                  :aria-busy="busyType === 'request-maintenance' || undefined"
                  @click="runAction('request-maintenance')"
                >
                  {{ t('device.drawer.actions.maintenance') }}
                </DtButton>
              </div>
              <p
                v-if="actionMessage"
                class="dt-m-0 dt-text-sm dt-text-secondary"
                role="status"
              >
                {{ actionMessage }}
              </p>
              <p v-if="actionError" class="dt-m-0 dt-text-sm dt-text-danger" role="alert">
                {{ actionError }}
              </p>
            </section>
          </template>
          <p v-else class="dt-m-0 dt-text-muted dt-text-sm">
            {{ t('device.drawer.tabPlaceholder') }}
          </p>
        </DtTabs>
      </template>
    </div>

    <div class="device-drawer__footer dt-flex-shrink-0 dt-border-t-subtle dt-p-md">
      <DtButton
        variant="ghost"
        class="device-drawer__toggle"
        data-testid="ops-detail-collapse"
        aria-controls="ops-detail-drawer"
        :aria-expanded="open"
        :aria-label="t('shell.detailDrawer.collapse')"
        @click="collapse"
      >
        <DtIcon name="ChevronsRight" size="md" />
        <span>{{ t('shell.detailDrawer.collapse') }}</span>
      </DtButton>
    </div>
  </aside>
</template>

<style scoped>
.device-drawer {
  overflow: hidden;
  transition:
    opacity var(--dt-duration-base) var(--dt-ease-default),
    border-color var(--dt-duration-base) var(--dt-ease-default);
}

.device-drawer.is-collapsed {
  opacity: 0;
  border-left-color: transparent;
  pointer-events: none;
}

:deep(.device-drawer__toggle.dt-button) {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 32px;
  padding: 0 var(--dt-space-md);
  gap: var(--dt-space-sm);
  border: 1px solid transparent;
  border-radius: var(--dt-radius-sm);
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-sm);
  font-weight: var(--dt-weight-medium);
}

:deep(.device-drawer__toggle.dt-button:hover:not(:disabled)) {
  background: var(--dt-bg-surface-hover);
  border-color: var(--dt-border-default);
  color: var(--dt-text-primary);
}

.device-drawer__title-block {
  gap: 2px;
}
.device-drawer__kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.device-drawer__telemetry-row {
  display: grid;
  grid-template-columns: minmax(72px, 30%) 1fr;
}
</style>
